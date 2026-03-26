#!/bin/bash
# ============================================================
# WireStack Sandbox - AWS Infrastructure Setup
# Run this ONCE to set up ECR, ECS, Security Group, and push the sandbox runner image
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 WireStack Sandbox Setup${NC}"
echo "============================================"

# Configuration
REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
ECR_REPO="wirestack-sandbox"
ECS_CLUSTER="wirestack-sandboxes"
TASK_FAMILY="wirestack-sandbox-task"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"

echo -e "${GREEN}Account: ${ACCOUNT_ID}${NC}"
echo -e "${GREEN}Region:  ${REGION}${NC}"

# ============================================================
# Step 1: Create ECR Repository
# ============================================================
echo -e "\n${YELLOW}📦 Step 1: Creating ECR Repository...${NC}"
aws ecr create-repository \
    --repository-name ${ECR_REPO} \
    --region ${REGION} \
    --image-scanning-configuration scanOnPush=false \
    2>/dev/null || echo "  ℹ️ Repository already exists"

# ============================================================
# Step 2: Build + Push Docker Image (linux/amd64 for Fargate)
# ============================================================
echo -e "\n${YELLOW}🐳 Step 2: Building & Pushing Docker Image...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# ECS Fargate expects linux/amd64 image for this setup; buildx avoids accidental host-arch pushes from Apple Silicon.
docker buildx build \
    --platform linux/amd64 \
    -t ${IMAGE_URI} \
    --push \
    "${SCRIPT_DIR}/sandbox"

# ============================================================
# Step 3: Image pushed via buildx
# ============================================================
echo -e "\n${YELLOW}☁️ Step 3: Image pushed to ECR via buildx${NC}"

echo -e "${GREEN}✅ Image pushed: ${IMAGE_URI}${NC}"

# ============================================================
# Step 4: Create ECS Cluster
# ============================================================
echo -e "\n${YELLOW}🏗️ Step 4: Creating ECS Cluster...${NC}"
aws ecs create-cluster \
    --cluster-name ${ECS_CLUSTER} \
    --region ${REGION} \
    2>/dev/null || echo "  ℹ️ Cluster already exists"

# ============================================================
# Step 5: Create Security Group
# ============================================================
echo -e "\n${YELLOW}🔒 Step 5: Creating Security Group...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region ${REGION})

# Check if SG already exists
EXISTING_SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=wirestack-sandbox-sg" "Name=vpc-id,Values=${VPC_ID}" \
    --query "SecurityGroups[0].GroupId" --output text --region ${REGION} 2>/dev/null)

if [ "$EXISTING_SG" = "None" ] || [ -z "$EXISTING_SG" ]; then
    SG_ID=$(aws ec2 create-security-group \
        --group-name wirestack-sandbox-sg \
        --description "WireStack Sandbox - Allow inbound on port 3000" \
        --vpc-id ${VPC_ID} \
        --query "GroupId" --output text \
        --region ${REGION})
    
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --protocol tcp \
        --port 3000 \
        --cidr 0.0.0.0/0 \
        --region ${REGION}
    
    echo -e "${GREEN}✅ Security Group created: ${SG_ID}${NC}"
else
    SG_ID=$EXISTING_SG
    echo -e "  ℹ️ Security Group already exists: ${SG_ID}"
fi

# ============================================================
# Step 6: Create IAM Roles
# ============================================================
echo -e "\n${YELLOW}👤 Step 6: Creating IAM Roles...${NC}"

# Task Execution Role (for pulling ECR images and logging)
EXEC_ROLE_ARN=$(aws iam get-role --role-name ecsTaskExecutionRole --query "Role.Arn" --output text 2>/dev/null || echo "")
if [ -z "$EXEC_ROLE_ARN" ]; then
    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }'
    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    EXEC_ROLE_ARN=$(aws iam get-role --role-name ecsTaskExecutionRole --query "Role.Arn" --output text)
fi
echo -e "  Execution Role: ${EXEC_ROLE_ARN}"

# Task Role (for S3 access inside the container)
TASK_ROLE_ARN=$(aws iam get-role --role-name wirestackSandboxTaskRole --query "Role.Arn" --output text 2>/dev/null || echo "")
if [ -z "$TASK_ROLE_ARN" ]; then
    aws iam create-role \
        --role-name wirestackSandboxTaskRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }'
    aws iam put-role-policy \
        --role-name wirestackSandboxTaskRole \
        --policy-name S3ReadAccess \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": ["s3:GetObject", "s3:ListBucket"],
                "Resource": ["arn:aws:s3:::wirestack-files", "arn:aws:s3:::wirestack-files/*"]
            }]
        }'
    TASK_ROLE_ARN=$(aws iam get-role --role-name wirestackSandboxTaskRole --query "Role.Arn" --output text)
fi
echo -e "  Task Role: ${TASK_ROLE_ARN}"

# ============================================================
# Step 7: Create CloudWatch Log Group
# ============================================================
echo -e "\n${YELLOW}📋 Step 7: Creating CloudWatch Log Group...${NC}"
aws logs create-log-group --log-group-name /ecs/wirestack-sandbox --region ${REGION} 2>/dev/null || echo "  ℹ️ Log group already exists"

# ============================================================
# Step 8: Register Task Definition
# ============================================================
echo -e "\n${YELLOW}📝 Step 8: Registering Task Definition...${NC}"

# Get subnets for output
SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=default-for-az,Values=true" "Name=vpc-id,Values=${VPC_ID}" \
    --query "Subnets[*].SubnetId" --output text --region ${REGION})
FIRST_SUBNET=$(echo $SUBNETS | awk '{print $1}')

aws ecs register-task-definition \
    --family ${TASK_FAMILY} \
    --network-mode awsvpc \
    --requires-compatibilities FARGATE \
    --cpu "512" \
    --memory "1024" \
    --execution-role-arn ${EXEC_ROLE_ARN} \
    --task-role-arn ${TASK_ROLE_ARN} \
    --container-definitions "[{
        \"name\": \"sandbox\",
        \"image\": \"${IMAGE_URI}\",
        \"essential\": true,
        \"portMappings\": [{\"containerPort\": 3000, \"protocol\": \"tcp\"}],
        \"environment\": [
            {\"name\": \"AWS_REGION\", \"value\": \"${REGION}\"},
            {\"name\": \"AWS_S3_BUCKET\", \"value\": \"wirestack-files\"}
        ],
        \"logConfiguration\": {
            \"logDriver\": \"awslogs\",
            \"options\": {
                \"awslogs-group\": \"/ecs/wirestack-sandbox\",
                \"awslogs-region\": \"${REGION}\",
                \"awslogs-stream-prefix\": \"sandbox\"
            }
        }
    }]" \
    --region ${REGION} > /dev/null

echo -e "${GREEN}✅ Task definition registered${NC}"

# ============================================================
# Output Configuration
# ============================================================
echo -e "\n${CYAN}============================================${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo "Add these to your backend .env file:"
echo ""
echo "# Sandbox Configuration"
echo "SANDBOX_CLUSTER=${ECS_CLUSTER}"
echo "SANDBOX_TASK_DEF=${TASK_FAMILY}"
echo "SANDBOX_SUBNET=${FIRST_SUBNET}"
echo "SANDBOX_SG=${SG_ID}"
echo "SANDBOX_IMAGE=${IMAGE_URI}"
echo "SANDBOX_REGION=${REGION}"
echo ""
echo -e "${YELLOW}⚠️ Note: If using IAM task roles, the container gets S3 access automatically.${NC}"
echo -e "${YELLOW}   If using session tokens, pass AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN as env vars.${NC}"
