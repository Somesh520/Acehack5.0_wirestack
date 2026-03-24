FROM node:20-alpine

# Install Python, pip, and useful tools
RUN apk add --no-cache python3 py3-pip bash curl

# Install global Node tools
RUN npm install -g serve

# Create app directory
WORKDIR /app

# Copy runner script
COPY runner.js /runner.js
COPY package.json /runner-package.json

# Install runner dependencies (AWS SDK)
RUN cd / && npm install --prefix /runner-deps --production \
    @aws-sdk/client-s3

# Install common dependencies to cache them in the image
RUN mkdir -p /app/common_node_modules && cd /app/common_node_modules && \
    npm init -y && \
    npm install vite @vitejs/plugin-react react react-dom react-router-dom tailwindcss autoprefixer postcss lucide-react framer-motion

# Expose port 3000 (all sandboxed apps will run on this)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Run the sandbox runner
CMD ["node", "/runner.js"]
