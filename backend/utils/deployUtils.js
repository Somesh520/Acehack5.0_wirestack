/**
 * WireStack Sandbox Deployment Utilities
 * Creates, monitors, and stops AWS Fargate sandbox tasks for AI-generated projects
 */

const { ECSClient, RunTaskCommand, DescribeTasksCommand, StopTaskCommand, ListTasksCommand } = require('@aws-sdk/client-ecs');
const { EC2Client, DescribeNetworkInterfacesCommand } = require('@aws-sdk/client-ec2');
const http = require('http');
const https = require('https');

const ecsClient = new ECSClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    }
});

const ec2Client = new EC2Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    }
});

// In-memory store for tracking deployments (jobId → taskArn)
const deployments = new Map();

function isUrlReachable(url, timeoutMs = 4000) {
    return new Promise((resolve) => {
        try {
            const lib = url.startsWith('https') ? https : http;
            const req = lib.request(url, { method: 'GET', timeout: timeoutMs }, (res) => {
                res.resume();
                resolve(Boolean(res.statusCode) && res.statusCode < 500);
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.on('error', () => resolve(false));
            req.end();
        } catch {
            resolve(false);
        }
    });
}

/**
 * Deploy a sandbox for a given jobId
 * Creates a Fargate task that pulls project files from S3 and runs them
 */
async function deploySandbox(jobId) {
    const cluster = process.env.SANDBOX_CLUSTER || 'wirestack-sandboxes';
    const taskDef = process.env.SANDBOX_TASK_DEF || 'wirestack-sandbox-task';
    const subnet = process.env.SANDBOX_SUBNET;
    const securityGroup = process.env.SANDBOX_SG;

    if (!subnet || !securityGroup) {
        throw new Error('SANDBOX_SUBNET and SANDBOX_SG must be configured. Run setup-sandbox.sh first.');
    }

    // Check if already deployed
    const existing = deployments.get(jobId);
    if (existing) {
        const status = await getSandboxStatus(jobId);
        if (status.state === 'RUNNING') {
            return { taskArn: existing, status: 'already-running', url: status.url };
        }
        // If previous task stopped, allow re-deploy
        deployments.delete(jobId);
    }

    console.log(`[SANDBOX] Deploying sandbox for job: ${jobId}`);

    const result = await ecsClient.send(new RunTaskCommand({
        cluster,
        taskDefinition: taskDef,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: [subnet],
                securityGroups: [securityGroup],
                assignPublicIp: 'ENABLED'
            }
        },
        overrides: {
            containerOverrides: [{
                name: 'sandbox',
                environment: [
                    { name: 'JOB_ID', value: jobId },
                    { name: 'AWS_S3_BUCKET', value: process.env.AWS_S3_BUCKET || 'wirestack-files' },
                    { name: 'AWS_REGION', value: process.env.AWS_REGION || 'ap-south-1' },
                    // Pass credentials for S3 access (needed with session tokens)
                    { name: 'AWS_ACCESS_KEY_ID', value: process.env.AWS_ACCESS_KEY_ID },
                    { name: 'AWS_SECRET_ACCESS_KEY', value: process.env.AWS_SECRET_ACCESS_KEY },
                    ...(process.env.AWS_SESSION_TOKEN ? [{ name: 'AWS_SESSION_TOKEN', value: process.env.AWS_SESSION_TOKEN }] : [])
                ]
            }]
        }
    }));

    if (!result.tasks || result.tasks.length === 0) {
        const failures = result.failures?.map(f => f.reason).join(', ') || 'Unknown error';
        throw new Error(`Failed to launch sandbox: ${failures}`);
    }

    const taskArn = result.tasks[0].taskArn;
    deployments.set(jobId, taskArn);
    console.log(`[SANDBOX] Task launched: ${taskArn}`);

    return { taskArn, status: 'PROVISIONING' };
}

/**
 * Get the status and public IP of a sandbox deployment
 */
async function getSandboxStatus(jobId) {
    const taskArn = deployments.get(jobId);
    if (!taskArn) {
        return { state: 'NOT_DEPLOYED', url: null };
    }

    const cluster = process.env.SANDBOX_CLUSTER || 'wirestack-sandboxes';

    try {
        const result = await ecsClient.send(new DescribeTasksCommand({
            cluster,
            tasks: [taskArn]
        }));

        if (!result.tasks || result.tasks.length === 0) {
            deployments.delete(jobId);
            return { state: 'NOT_FOUND', url: null };
        }

        const task = result.tasks[0];
        const state = task.lastStatus; // PROVISIONING, PENDING, RUNNING, STOPPED

        if (state === 'RUNNING') {
            // Get public IP from the ENI
            const eni = task.attachments?.find(a => a.type === 'ElasticNetworkInterface');
            const eniId = eni?.details?.find(d => d.name === 'networkInterfaceId')?.value;

            if (eniId) {
                const eniResult = await ec2Client.send(new DescribeNetworkInterfacesCommand({
                    NetworkInterfaceIds: [eniId]
                }));

                const publicIp = eniResult.NetworkInterfaces?.[0]?.Association?.PublicIp;
                if (publicIp) {
                    const url = `http://${publicIp}:3000`;
                    // Even after task is RUNNING, app inside container may still be booting.
                    // Validate URL before advertising it as live.
                    const reachable = await isUrlReachable(url);
                    if (!reachable) {
                        return {
                            // Candidate URL is useful for diagnostics, but UI should not treat it as live yet.
                            state: 'RUNNING_NOT_READY',
                            url: null,
                            candidateUrl: url,
                            taskArn,
                            startedAt: task.startedAt,
                            message: 'Task is running but app is not reachable yet'
                        };
                    }
                    return {
                        state: 'RUNNING',
                        url,
                        taskArn,
                        startedAt: task.startedAt
                    };
                }
            }

            return { state: 'RUNNING', url: null, taskArn, message: 'Waiting for public IP...' };
        }

        if (state === 'STOPPED') {
            deployments.delete(jobId);
            const reason = task.stoppedReason || 'Task completed';
            return { state: 'STOPPED', url: null, reason };
        }

        return { state, url: null, taskArn };
    } catch (err) {
        console.error(`[SANDBOX] Status check failed for ${jobId}:`, err.message);
        return { state: 'ERROR', url: null, error: err.message };
    }
}

/**
 * Stop a running sandbox
 */
async function stopSandbox(jobId) {
    const taskArn = deployments.get(jobId);
    if (!taskArn) {
        return { success: false, message: 'No active deployment found' };
    }

    const cluster = process.env.SANDBOX_CLUSTER || 'wirestack-sandboxes';

    try {
        await ecsClient.send(new StopTaskCommand({
            cluster,
            task: taskArn,
            reason: 'User requested stop'
        }));

        deployments.delete(jobId);
        console.log(`[SANDBOX] Stopped task for job: ${jobId}`);
        return { success: true };
    } catch (err) {
        console.error(`[SANDBOX] Stop failed for ${jobId}:`, err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    deploySandbox,
    getSandboxStatus,
    stopSandbox,
    deployments
};
