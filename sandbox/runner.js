/**
 * WireStack Sandbox Runner
 * 
 * 1. Downloads project files from S3 (wirestack-files bucket)
 * 2. Auto-detects project type (Node.js, Python, Static HTML)
 * 3. Installs dependencies and starts the server on port 3000
 */

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('/runner-deps/node_modules/@aws-sdk/client-s3');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const JOB_ID = process.env.JOB_ID;
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'wirestack-files';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const PORT = 3000;
const PROJECT_DIR = '/app/project';

// Colored log helper
const log = (emoji, msg) => console.log(`${emoji} [SANDBOX] ${msg}`);

async function main() {
    try {
        log('🚀', `Sandbox starting for JOB_ID: ${JOB_ID}`);

        if (!JOB_ID) {
            log('❌', 'No JOB_ID provided! Starting fallback page...');
            startFallbackServer('No JOB_ID environment variable set.');
            return;
        }

        // Step 1: Download files from S3
        log('☁️', `Downloading project from s3://${S3_BUCKET}/projects/${JOB_ID}/`);
        const files = await downloadFromS3();

        if (files.length === 0) {
            log('❌', 'No files found in S3!');
            startFallbackServer(`No files found for job ${JOB_ID}`);
            return;
        }

        log('✅', `Downloaded ${files.length} files`);

        // Step 2: Write files to disk
        fs.mkdirSync(PROJECT_DIR, { recursive: true });
        for (const file of files) {
            const filePath = path.join(PROJECT_DIR, file.name);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, file.content);
            log('📄', `  → ${file.name}`);
        }

        // Step 3: Detect project type and run
        const projectType = detectProjectType(files);
        log('🔍', `Detected project type: ${projectType}`);

        switch (projectType) {
            case 'node-fullstack':
                await runNodeFullstack(files);
                break;
            case 'node-backend':
                await runNodeBackend();
                break;
            case 'node-frontend':
                await runNodeFrontend();
                break;
            case 'python':
                await runPython();
                break;
            case 'static':
                await runStatic();
                break;
            default:
                await runStatic();
        }
    } catch (err) {
        log('💥', `Fatal error: ${err.message}`);
        console.error(err);
        startFallbackServer(`Sandbox error: ${err.message}`);
    }
}

// ============================================================
// S3 Download
// ============================================================
async function downloadFromS3() {
    const s3 = new S3Client({
        region: AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
        }
    });

    const prefix = `projects/${JOB_ID}/`;
    const listed = await s3.send(new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: prefix
    }));

    if (!listed.Contents || listed.Contents.length === 0) return [];

    const files = [];
    for (const obj of listed.Contents) {
        const fileName = obj.Key.replace(prefix, '');
        if (!fileName || fileName.endsWith('/')) continue;

        const response = await s3.send(new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: obj.Key
        }));
        const content = await response.Body.transformToString();
        files.push({ name: fileName, content });
    }
    return files;
}

// ============================================================
// Project Type Detection
// ============================================================
function detectProjectType(files) {
    const names = files.map(f => f.name.toLowerCase());
    const hasPackageJson = names.some(n => n === 'package.json');
    const hasFrontendPkg = names.some(n => n.includes('frontend/package.json'));
    const hasBackendPkg = names.some(n => n.includes('backend/package.json'));
    const hasRequirements = names.some(n => n === 'requirements.txt' || n === 'Pipfile');
    const hasIndexHtml = names.some(n => n.endsWith('index.html'));
    const hasServerFile = names.some(n => /^(server|app|index|main)\.(js|ts)$/.test(n));

    if (hasFrontendPkg && hasBackendPkg) return 'node-fullstack';
    if (hasPackageJson && hasServerFile) return 'node-backend';
    if (hasPackageJson && !hasServerFile) return 'node-frontend';
    if (hasRequirements) return 'python';
    if (hasIndexHtml) return 'static';
    
    // Default: try static
    return 'static';
}

// ============================================================
// Runners
// ============================================================

async function runNodeFullstack(files) {
    // For fullstack projects, install backend deps, start backend, 
    // and serve frontend statically from the backend
    const backendDir = path.join(PROJECT_DIR, 'backend');
    const frontendDir = path.join(PROJECT_DIR, 'frontend');

    if (fs.existsSync(path.join(backendDir, 'package.json'))) {
        log('📦', 'Installing backend dependencies...');
        execSync('npm install --production 2>&1', { cwd: backendDir, stdio: 'inherit', timeout: 120000 });
    }

    if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
        log('📦', 'Installing frontend dependencies...');
        try {
            execSync('npm install 2>&1', { cwd: frontendDir, stdio: 'inherit', timeout: 120000 });
            log('🔨', 'Building frontend...');
            execSync('npm run build 2>&1', { cwd: frontendDir, stdio: 'inherit', timeout: 120000 });
        } catch (e) {
            log('⚠️', `Frontend build failed: ${e.message}. Will serve files directly.`);
        }
    }

    // Start the backend
    const startScript = getStartCommand(backendDir);
    log('▶️', `Starting backend: ${startScript}`);
    
    const proc = spawn('sh', ['-c', startScript], {
        cwd: backendDir,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' }
    });

    proc.on('exit', (code) => {
        log('⚠️', `Backend exited with code ${code}`);
        // Fallback to static serve
        runStatic();
    });
}

async function runNodeBackend() {
    log('📦', 'Installing Node.js dependencies...');
    try {
        execSync('npm install --production 2>&1', { cwd: PROJECT_DIR, stdio: 'inherit', timeout: 120000 });
    } catch (e) {
        log('⚠️', `npm install failed: ${e.message}`);
    }

    const startScript = getStartCommand(PROJECT_DIR);
    log('▶️', `Starting: ${startScript}`);

    const proc = spawn('sh', ['-c', startScript], {
        cwd: PROJECT_DIR,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' }
    });

    proc.on('exit', (code) => {
        log('⚠️', `Process exited with code ${code}. Falling back to static serve.`);
        runStatic();
    });
}

async function runNodeFrontend() {
    // 💨 SPEED OPTIMIZATION: Use pre-cached node_modules if they exist in the Docker image
    const cacheDir = '/app/common_node_modules/node_modules';
    if (fs.existsSync(cacheDir)) {
        log('⚡', 'Using pre-cached Node.js modules for speed...');
        fs.mkdirSync(path.join(PROJECT_DIR, 'node_modules'), { recursive: true });
        try {
            execSync(`cp -rp ${cacheDir}/* ${PROJECT_DIR}/node_modules/`, { stdio: 'ignore' });
        } catch (e) {
            log('⚠️', 'Pre-cache copy failed, will perform full install.');
        }
    }

    log('📦', 'Finalizing dependencies...');
    try {
        execSync('npm install --prefer-offline --no-audit 2>&1', { cwd: PROJECT_DIR, stdio: 'inherit', timeout: 120000 });
    } catch (e) {
        log('⚠️', `npm install failed: ${e.message}`);
    }

    // Try to build first
    try {
        log('🔨', 'Building frontend...');
        execSync('npm run build 2>&1', { cwd: PROJECT_DIR, stdio: 'inherit', timeout: 120000 });
        // Serve the dist folder
        const distDir = fs.existsSync(path.join(PROJECT_DIR, 'dist')) ? 'dist' :
                        fs.existsSync(path.join(PROJECT_DIR, 'build')) ? 'build' : '.';
        log('▶️', `Serving built frontend from ${distDir}/`);
        const proc = spawn('npx', ['serve', '-l', String(PORT), '-s', distDir], {
            cwd: PROJECT_DIR,
            stdio: 'inherit'
        });
        proc.on('exit', () => runStatic());
    } catch (e) {
        log('⚠️', `Build failed, trying dev server or static serve`);
        await runStatic();
    }
}

async function runPython() {
    log('📦', 'Installing Python dependencies...');
    try {
        if (fs.existsSync(path.join(PROJECT_DIR, 'requirements.txt'))) {
            execSync('pip3 install -r requirements.txt 2>&1', { cwd: PROJECT_DIR, stdio: 'inherit', timeout: 120000 });
        }
    } catch (e) {
        log('⚠️', `pip install failed: ${e.message}`);
    }

    const mainFile = ['app.py', 'main.py', 'server.py', 'run.py'].find(
        f => fs.existsSync(path.join(PROJECT_DIR, f))
    ) || 'app.py';

    log('▶️', `Starting Python: python3 ${mainFile}`);
    const proc = spawn('python3', [mainFile], {
        cwd: PROJECT_DIR,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(PORT) }
    });

    proc.on('exit', (code) => {
        log('⚠️', `Python exited with code ${code}. Falling back to static.`);
        runStatic();
    });
}

async function runStatic() {
    // Find the best directory to serve
    let serveDir = PROJECT_DIR;
    
    // Check for common build output dirs
    for (const sub of ['dist', 'build', 'public', 'frontend/dist', 'frontend/build']) {
        if (fs.existsSync(path.join(PROJECT_DIR, sub))) {
            serveDir = path.join(PROJECT_DIR, sub);
            break;
        }
    }

    // If there's only an index.html in project root, serve from there
    if (fs.existsSync(path.join(PROJECT_DIR, 'index.html'))) {
        serveDir = PROJECT_DIR;
    }

    log('🌐', `Serving static files from: ${serveDir}`);
    
    const proc = spawn('npx', ['serve', '-l', String(PORT), '-s', serveDir], {
        cwd: PROJECT_DIR,
        stdio: 'inherit'
    });

    proc.on('error', (err) => {
        log('⚠️', `serve failed: ${err.message}. Starting basic HTTP server.`);
        startBasicServer(serveDir);
    });
}

// ============================================================
// Helpers
// ============================================================

function getStartCommand(dir) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (pkg.scripts?.start) return 'npm start';
        if (pkg.main) return `node ${pkg.main}`;
    } catch (e) { /* ignore */ }

    // Auto-detect entry file
    for (const entry of ['server.js', 'app.js', 'index.js', 'main.js', 'src/index.js', 'src/server.js']) {
        if (fs.existsSync(path.join(dir, entry))) return `node ${entry}`;
    }
    return 'npm start';
}

function startBasicServer(dir) {
    const server = http.createServer((req, res) => {
        let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
        
        const extMap = {
            '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
            '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
        };

        const ext = path.extname(filePath);
        const contentType = extMap[ext] || 'text/plain';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                // SPA fallback
                fs.readFile(path.join(dir, 'index.html'), (err2, fallback) => {
                    if (err2) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - Not Found</h1>');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(fallback);
                    }
                });
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    });

    server.listen(PORT, () => log('🌐', `Basic HTTP server on port ${PORT}`));
}

function startFallbackServer(errorMsg) {
    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WireStack Sandbox</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#1e293b;border:4px solid #334155;padding:48px;max-width:500px;text-align:center;box-shadow:12px 12px 0 #000}
h1{font-size:2rem;color:#f43f5e;margin-bottom:16px;text-transform:uppercase}
p{font-size:1.1rem;line-height:1.6;color:#94a3b8}
.logo{font-size:3rem;margin-bottom:24px}
</style></head>
<body><div class="card">
<div class="logo">⚡</div>
<h1>Sandbox Error</h1>
<p>${errorMsg}</p>
</div></body></html>`;

    http.createServer((_, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }).listen(PORT, () => log('🌐', `Fallback server on port ${PORT}`));
}

// ============================================================
// Auto-stop after 30 minutes
// ============================================================
const TIMEOUT_MS = 30 * 60 * 1000;
setTimeout(() => {
    log('⏰', 'Auto-stopping sandbox after 30 minutes');
    process.exit(0);
}, TIMEOUT_MS);

// Start!
main();
