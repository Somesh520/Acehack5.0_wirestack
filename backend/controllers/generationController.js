/**
 * Generation controller — handles project plan generation, file generation,
 * project enqueue, job status, download, and S3 persistence.
 * @module controllers/generationController
 */

const http = require('http');
const https = require('https');
const archiver = require('archiver');
const { callLLM, sleep } = require('../utils/aiUtils');
const { parseJsonArrayFromText, extractCodeBlock, stripMarkdownFences } = require('../utils/llmResponseParser');
const { renderTemplate, loadTemplate } = require('../utils/templateLoader');
const { uploadProjectToS3, fetchProjectFromS3 } = require('../utils/s3Utils');
const { deploySandbox, getSandboxStatus } = require('../utils/deployUtils');
const { generationQueue } = require('../config/queue');

const VERBOSE_AI_LOGS = process.env.VERBOSE_AI_LOGS === 'true';

/** In-process job state for MVP mode (bypasses BullMQ). */
const directGenerationJobs = new Map();

// ─── URL Reachability ────────────────────────────────────────

/**
 * Check if a URL is reachable via a simple GET within a timeout.
 * @param {string} url
 * @param {number} [timeoutMs=4000]
 * @returns {Promise<boolean>}
 */
function isUrlReachable(url, timeoutMs = 4000) {
    return new Promise((resolve) => {
        try {
            const lib = url.startsWith('https') ? https : http;
            const req = lib.request(url, { method: 'GET', timeout: timeoutMs }, (res) => {
                res.resume();
                resolve(Boolean(res.statusCode) && res.statusCode < 500);
            });
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.on('error', () => resolve(false));
            req.end();
        } catch { resolve(false); }
    });
}

// ─── Escape helper ───────────────────────────────────────────

function escapeForTemplate(str) {
    return String(str || '')
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
}

// ─── Template-based file builders ────────────────────────────

/**
 * Build the guaranteed React or Vue frontend template files.
 * @param {string} idea
 * @param {*} stack
 * @returns {Array<{name: string, content: string}>}
 */
function buildFrontendTemplateFiles(idea, stack) {
    const stackText = typeof stack === 'string'
        ? stack.toLowerCase()
        : JSON.stringify(stack || '').toLowerCase();

    if (stackText.includes('vue')) {
        const safeIdea = String(idea || 'Modern web app');
        return [
            {
                name: 'package.json',
                content: JSON.stringify({
                    name: 'wirestack-vue-app', private: true, version: '0.0.1',
                    scripts: { dev: 'vite --host 0.0.0.0 --port 3000', build: 'vite build', preview: 'vite preview --host 0.0.0.0 --port 3000' },
                    dependencies: { vue: '^3.5.13' },
                    devDependencies: { '@vitejs/plugin-vue': '^5.1.4', vite: '^5.4.8' },
                }, null, 2),
            },
            { name: 'vite.config.js', content: `import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\n\nexport default defineConfig({\n    plugins: [vue()]\n});` },
            { name: 'index.html', content: `<!doctype html>\n<html lang="en">\n    <head>\n        <meta charset="UTF-8" />\n        <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n        <title>WireStack Vue App</title>\n    </head>\n    <body>\n        <div id="app"></div>\n        <script type="module" src="/src/main.js"></script>\n    </body>\n</html>` },
            { name: 'src/main.js', content: `import { createApp } from 'vue';\nimport App from './App.vue';\nimport './style.css';\n\ncreateApp(App).mount('#app');` },
            { name: 'src/App.vue', content: `<template>\n  <main class="shell">\n    <section class="card">\n      <h1>WireStack Vue Sandbox</h1>\n      <p class="idea">Idea: ${safeIdea}</p>\n      <p>Your Vue project is running live on the AWS sandbox.</p>\n      <button @click="clicks++">Clicked {{ clicks }} times</button>\n    </section>\n  </main>\n</template>\n\n<script setup>\nimport { ref } from 'vue';\nconst clicks = ref(0);\n</script>\n\n<style scoped>\n.shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem; background: radial-gradient(circle at top left, #fef3c7, #e0f2fe); }\n.card { width: min(680px, 100%); background: #fff; border: 2px solid #111827; border-radius: 16px; padding: 2rem; box-shadow: 8px 8px 0 #111827; }\n.idea { color: #334155; font-weight: 600; }\nbutton { margin-top: 1rem; background: #111827; color: white; border: 0; border-radius: 10px; padding: 0.75rem 1rem; cursor: pointer; }\n</style>` },
            { name: 'src/style.css', content: `body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }` },
        ];
    }

    // Default: React neo-brutalism template from files
    const safeIdea = escapeForTemplate(idea || 'Modern product website');
    return [
        { name: 'package.json', content: loadTemplate('packageReact.json') },
        { name: 'vite.config.js', content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n    plugins: [react()]\n});\n` },
        { name: 'index.html', content: loadTemplate('reactIndex.html') },
        { name: 'src/main.jsx', content: loadTemplate('reactMain.jsx') },
        { name: 'src/App.jsx', content: renderTemplate('reactApp.jsx', { idea: safeIdea }) },
        { name: 'src/index.css', content: loadTemplate('reactCss.css') },
    ];
}

// ─── Deduplication helper ────────────────────────────────────

function dedupePlanEntries(entries = []) {
    const seen = new Set();
    const normalized = [];
    for (const entry of entries) {
        const name = String(entry?.name || '').trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        normalized.push({ name, purpose: String(entry?.purpose || 'Generated project file').trim() });
    }
    return normalized;
}

// ─── LLM-powered frontend generation ────────────────────────

/**
 * Generate frontend files via LLM with progress reporting.
 * @param {string} idea
 * @param {*} stack
 * @param {Function} [onProgress]
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
async function generateFrontendFilesWithLLM(idea, stack, onProgress) {
    const stackText = String(stack || 'React + Vite');
    onProgress?.(20);
    let currentProgress = 20;

    const progressInterval = setInterval(() => {
        if (currentProgress < 68) {
            currentProgress += 1;
            onProgress?.(currentProgress);
        }
    }, 2500);

    try {
        const systemPrompt = 'You are an expert Frontend React Developer specializing in massive, feature-rich, production-grade applications with stunning Neo-Brutalism design. You NEVER output small components. You ALWAYS write 500+ lines of robust, multi-section React code with state, interactions, and deep layout. Output ONLY valid markdown blocks. NO conversation.';
        const userPrompt = `Build a fully functional, MASSIVE React application based on the following idea:
IDEA: ${idea}
TECH STACK: ${stackText} (Use React)

Design Requirements (CRITICAL):
- Create a HUGE, scrollable single-page app (like Lovable or a premium SaaS).
- Include at least 6 distinct sections: Hero, Features, Dashboard Demo, Pricing, Testimonials, and Footer.
- Include interactive state (e.g., clickable tabs, modals, or counters).
- Use a stunning Neo-Brutalism design (thick black borders, bold high-contrast colors, offset shadows, large typography).
- Make it look fully polished, production-ready, no "Lorem Ipsum" (use real text).
- Use Unsplash random images for placeholders (e.g. https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400)

I need EXACTLY TWO markdown code blocks from you. Do not output anything else.

Block 1: \`\`\`jsx
- A complete React component (App.jsx) handling the full UI.
- CRITICAL: Provide AT LEAST 300 to 500 lines of highly detailed React code. DO NOT skimp.
- CRITICAL: Use 'lucide-react' for icons. NEVER use prefixes like Hi, Fa, or Md.
- CRITICAL: DO NOT import any external libraries like swiper, framer-motion. Only 'react' and 'lucide-react'.
- Build out ALL necessary sub-components within this same single file before the \`export default function App()\` block.

Block 2: \`\`\`css
- A complete CSS file (index.css) containing the Neo-Brutalist styles. Include base resets, thick borders, box-shadows (4px 4px 0px #000), font imports, responsive media queries, etc.
- CRITICAL: Write pure, custom CSS classes. DO NOT use Tailwind CSS classes.`;

        console.log('[LATENCY FIX] Generating neo-brutalism frontend with smooth progress...');
        const out = await callLLM(systemPrompt, userPrompt, 8192, 1);

        clearInterval(progressInterval);
        onProgress?.(70);

        let appJsx = extractCodeBlock(out, 'jsx');
        let css = extractCodeBlock(out, 'css');

        // Fallback heuristic extraction
        if (!appJsx && out.includes('import')) {
            const parts = out.split('```');
            const jsxPart = parts.find(p => p.includes('export default function ') || p.includes('import React'));
            if (jsxPart) appJsx = jsxPart.replace(/^jsx/, '').trim();
        }
        if (!css && (out.includes('body {') || out.includes('.container'))) {
            const parts = out.split('```');
            const cssPart = parts.find(p => p.includes('body {') || p.includes('.container'));
            if (cssPart) css = cssPart.replace(/^css/, '').trim();
        }

        // Clean up markdown artifacts
        let cleanAppJsx = stripMarkdownFences(appJsx || '');
        cleanAppJsx = cleanAppJsx.replace(/^(jsx|javascript|js|react)\n/i, '').replace(/^(jsx|javascript|js|react)\s/i, '').trim();

        let cleanCss = stripMarkdownFences(css || '');
        cleanCss = cleanCss.replace(/^css\n/i, '').replace(/^css\s/i, '').trim();

        // Fix icon prefixes LLMs sometimes generate
        if (cleanAppJsx) cleanAppJsx = cleanAppJsx.replace(/(?:Hi|Fa|Md)([A-Z][a-z]+)/g, '$1');

        cleanAppJsx = cleanAppJsx || "import React from 'react';\nexport default function App() { return <h1>Failed LLM Output. Check Logs.</h1>; }";
        cleanCss = cleanCss || "body { font-family: 'Space Grotesk', sans-serif; background: #eee; margin:20px; }\n";

        onProgress?.(85);

        return [
            {
                name: 'package.json',
                content: JSON.stringify({
                    name: 'neo-brutalism-app', private: true, version: '1.0.0', type: 'module',
                    scripts: { dev: 'vite --host 0.0.0.0 --port 3000', build: 'vite build', preview: 'vite preview --host 0.0.0.0 --port 3000' },
                    dependencies: { 'react': '^18.3.1', 'react-dom': '^18.3.1', 'lucide-react': '^0.292.0', 'vite': '^5.4.10', '@vitejs/plugin-react': '^4.3.2' },
                    devDependencies: {}
                }, null, 2)
            },
            { name: 'index.html', content: `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Generated App</title><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;"><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>` },
            { name: 'vite.config.js', content: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n" },
            { name: 'src/main.jsx', content: "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\nimport './index.css';\ncreateRoot(document.getElementById('root')).render(<App />);\n" },
            { name: 'src/App.jsx', content: cleanAppJsx },
            { name: 'src/index.css', content: cleanCss }
        ];
    } finally {
        clearInterval(progressInterval);
    }
}

// ─── Default plan ────────────────────────────────────────────

function getDefaultFrontendPlan() {
    return [
        { name: 'package.json', purpose: 'Project scripts and dependencies' },
        { name: 'vite.config.js', purpose: 'Vite config' },
        { name: 'index.html', purpose: 'HTML entry' },
        { name: 'src/main.jsx', purpose: 'React entry point' },
        { name: 'src/App.jsx', purpose: 'Main app component' },
        { name: 'src/index.css', purpose: 'Global styles' },
        { name: 'src/components/HeroSection.jsx', purpose: 'Hero and primary CTA section' },
        { name: 'src/components/FeatureGrid.jsx', purpose: 'Feature cards section' }
    ];
}

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

/** POST /api/ai/generate-plan */
async function generatePlan(req, res) {
    const { idea, stack } = req.body;
    if (!idea || !stack) {
        return res.status(400).json({ error: 'idea and stack are required' });
    }

    const isBoilerplate = idea.toLowerCase().includes('boilerplate');

    const systemPrompt = isBoilerplate
        ? `You are an expert DevOps and Senior Architecture engineer. Given a tech stack, return ONLY a JSON array of a COMPLETE, production-ready boilerplate codebase structure needed to initialize the project.
Each entry has "name" (filename WITH relative path, e.g., backend/src/routes/api.js) and "purpose" (1-line description).

RULES:
1. Return ONLY a valid JSON array. No markdown, no text, no backticks.
2. Include 12-18 foundational files. We want a REAL developer structure, not a toy app.
3. CRITICAL ARCHITECTURE RULE: You MUST separate the codebase into "frontend/" and "backend/" directories if the stack contains both UI and Server technologies.
4. DEPENDENCY FILES MUST MATCH THE STACK:
   - For Node.js/React: Use "package.json".
   - For Python: Use "requirements.txt" or "Pipfile".
   - For Go: Use "go.mod".
   - For Java: Use "pom.xml" or "build.gradle".
   - For Rust: Use "Cargo.toml".
5. FILE EXTENSIONS MUST MATCH THE STACK:
   - NEVER use .js for the backend if the user requested Python (.py), Go (.go), Java (.java), Rust (.rs), Ruby (.rb), etc.
   - Frontend files should be .jsx, .tsx, .vue, .html depending on the UI stack chosen.
6. Provide a ROOT "docker-compose.yml" that orchestrates the frontend, backend, and any databases.
7. Provide a ROOT "README.md" explaining the architecture and how to run everything.
8. CREATE REAL FOLDER STRUCTURES inside backend and frontend (e.g., controllers, models, routes).
9. DO NOT invent complex business logic. Just provide clean, empty scaffolding and standard imports.

Example output (adapt this to the ACTUAL tech stack requested):
[{"name":"frontend/package.json","purpose":"UI dependencies"},{"name":"frontend/src/App.jsx","purpose":"Main UI component"},{"name":"backend/requirements.txt","purpose":"Server dependencies (if Python)"},{"name":"backend/src/main.py","purpose":"API entry point (if Python)"},{"name":"docker-compose.yml","purpose":"Docker orchestration"},{"name":"README.md","purpose":"Instructions"}]`
        : `You are a senior software architect. Given a project idea and tech stack, return ONLY a JSON array of files needed to build the project. Each entry has "name" (filename) and "purpose" (1-line description).

RULES:
1. Return ONLY a valid JSON array. No markdown, no text, no backticks.
2. Include 6-10 files maximum.
3. DEPENDENCY FILES MUST MATCH THE STACK:
   - For Node.js: Use "package.json".
   - For Python: Use "requirements.txt".
   - For Go: Use "go.mod".
   - For Java: Use "pom.xml".
   - For Rust: Use "Cargo.toml".
4. ALWAYS include "Dockerfile" and "docker-compose.yml" so the project can be run instantly via Docker.
5. ALWAYS include "README.md" explaining how to start the app using \`docker-compose up\`.
6. ALWAYS include "index.html" as the LAST file — this is a beautiful Tailwind CSS frontend preview.
7. FILE EXTENSIONS MUST MATCH THE STACK:
   - NEVER use .js for the backend if the user requested Python (.py), Go (.go), Java (.java), Rust (.rs), etc.
   - Example context: If Python is requested, provide "main.py" not "server.js".
8. File names should be flat (no folders), just filenames.

Example output (adapt to the ACTUAL tech stack requested):
[{"name":"requirements.txt","purpose":"Project dependencies"},{"name":"main.py","purpose":"API server with routes"},{"name":"Dockerfile","purpose":"Dockerize the application"},{"name":"docker-compose.yml","purpose":"Docker Compose config to run the app"},{"name":"README.md","purpose":"Instructions to run the app via Docker"},{"name":"index.html","purpose":"Beautiful Tailwind frontend preview"}]`;

    try {
        const reply = await callLLM(systemPrompt, `Project idea: "${idea}"\nTech stack: ${stack}`);
        const plan = parseJsonArrayFromText(reply);
        res.json({ plan });
    } catch (err) {
        console.error('❌ Plan generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate file plan', details: err.message });
    }
}

/** POST /api/ai/generate-file */
async function generateFile(req, res) {
    const { idea, stack, fileName, filePurpose, existingFiles = [] } = req.body;
    if (!idea || !stack || !fileName) {
        return res.status(400).json({ error: 'idea, stack, and fileName are required' });
    }

    const isBoilerplate = idea.toLowerCase().includes('boilerplate');
    const baseName = fileName.split('/').pop();
    const isHtml = baseName.endsWith('.html');
    const isJson = baseName.endsWith('.json');
    const isDocker = baseName === 'Dockerfile' || baseName === 'docker-compose.yml';
    const isServerConfig = baseName === 'server.js' || baseName === 'index.js' || baseName === 'app.js';
    const isConfig = baseName === '.env.example' || baseName === '.gitignore' || baseName.endsWith('.config.js') || baseName.endsWith('.config.ts');

    let contextBlock = '';
    if (existingFiles.length > 0) {
        contextBlock = '\n\nFiles already generated (reference them for consistency):\n' +
            existingFiles.map(f => `--- ${f.name} ---\n${f.content?.substring(0, 300)}...`).join('\n\n');
    }

    const systemPrompt = buildFileSystemPrompt({ idea, stack, isHtml, isJson, isDocker, isServerConfig, isConfig, isBoilerplate, fileName });

    const userMessage = `Generate the file: "${fileName}"\nPurpose: ${filePurpose}\n${contextBlock}\n\nReturn ONLY the raw file content, nothing else.`;

    try {
        const tokens = isHtml ? 8000 : (isBoilerplate ? 6000 : 4000);
        let content = await callLLM(systemPrompt, userMessage, tokens);
        content = stripMarkdownFences(content);
        res.json({ name: fileName, content });
    } catch (err) {
        console.error(`❌ File generation error (${fileName}):`, err.message);
        res.status(500).json({ error: `Failed to generate ${fileName}`, details: err.message });
    }
}

/**
 * Build the system prompt for file generation based on file type.
 * @private
 */
function buildFileSystemPrompt({ idea, stack, isHtml, isJson, isDocker, isServerConfig, isConfig, isBoilerplate, fileName }) {
    let prompt = `You are an expert senior software engineer writing production-ready code.

RULES:
1. Return ONLY the file content. No markdown backticks, no explanations, no conversation.
2. Write REAL, working, professional code that an enterprise developer would use.
3. The code should be for: "${idea}" using stack: ${stack}.\n`;

    if (isHtml) {
        prompt += isBoilerplate
            ? '4. Write a clean, minimal placeholder HTML summarizing the boilerplate stack. Include Tailwind via CDN if Tailwind is in the stack. DO NOT build a complex application.'
            : '4. This is the MAIN DEMO FILE. Create a FULLY FUNCTIONAL, INTERACTIVE single-page application with Mock API, CRUD, Auth, Search/Filter, using Tailwind CDN + fallback CSS. Glassmorphism + Neo-Brutalism. At least 300 lines.';
    } else if (isJson) {
        prompt += isBoilerplate ? '4. Return valid JSON only. Include standard production/dev scripts.' : '4. Return valid JSON only.';
    } else if (isDocker) {
        prompt += '4. Write clean, reliable, production-ready Docker configurations. Use multi-stage builds if appropriate.';
    } else if (isServerConfig) {
        prompt += '4. Write robust server configuration with standard middleware (cors, helmet, express.json), DB connection, and route mounting.';
    } else if (isConfig) {
        prompt += '4. Write a standard, well-documented configuration file with sensible defaults.';
    } else {
        prompt += isBoilerplate
            ? `4. Write clean, modular code following SOLID principles. At least 5 CRUD functions/endpoints. 40-60 lines minimum. File: ${fileName}`
            : '4. Write clean, well-commented code with proper error handling.';
    }

    return prompt;
}

/** POST /api/ai/enqueue-project */
async function enqueueProject(req, res) {
    const { idea, stack } = req.body;
    if (!idea || !stack) {
        return res.status(400).json({ error: 'idea and stack are required' });
    }

    const jobId = `direct-${Date.now()}`;
    const jobState = {
        id: jobId, state: 'active', progress: 5, currentStep: 'Agent starting',
        files: [], result: null, failedReason: null, s3Folder: null,
        sandboxState: null, liveUrl: null, startedAt: new Date().toISOString(),
    };

    directGenerationJobs.set(jobId, jobState);

    // Fire-and-forget background pipeline
    (async () => {
        try {
            // Step 1: Generate frontend files
            jobState.progress = 10;
            jobState.currentStep = 'Agent planning files';

            let generatedFiles;
            try {
                generatedFiles = await Promise.race([
                    generateFrontendFilesWithLLM(idea, stack, (p) => {
                        jobState.progress = Math.max(jobState.progress, p);
                        jobState.currentStep = `Agent generating UI (${Math.min(95, p)}%)`;
                    }),
                    sleep(120000).then(() => { throw new Error('Generation timed out after 120s'); })
                ]);
            } catch (llmErr) {
                console.warn(`[DIRECT:${jobId}] LLM generation failed, falling back:`, llmErr.message);
                generatedFiles = buildFrontendTemplateFiles(idea, stack);
            }

            jobState.files = generatedFiles;
            jobState.progress = 55;
            jobState.currentStep = 'Agent packaging project';

            // Step 2: Upload to S3
            let s3Folder = null;
            try {
                await uploadProjectToS3(jobId, generatedFiles);
                s3Folder = `projects/${jobId}/`;
            } catch (s3Err) {
                console.warn(`[DIRECT:${jobId}] S3 upload failed:`, s3Err.message);
            }
            jobState.progress = 75;
            jobState.currentStep = 'Agent deploying sandbox';

            // Step 3: Deploy and wait for live URL
            await deploySandbox(jobId);
            jobState.sandboxState = 'PROVISIONING';
            jobState.progress = 85;

            for (let attempt = 0; attempt < 24; attempt++) {
                const sandbox = await getSandboxStatus(jobId);
                jobState.sandboxState = sandbox.state;
                jobState.liveUrl = sandbox.url || null;
                jobState.currentStep = `Agent waiting for sandbox (${sandbox.state})`;

                if (sandbox.state === 'RUNNING' && sandbox.url) {
                    if (await isUrlReachable(sandbox.url)) break;
                    jobState.liveUrl = null;
                    jobState.sandboxState = 'RUNNING_NOT_READY';
                }
                if (['ERROR', 'STOPPED', 'NOT_FOUND'].includes(sandbox.state)) break;
                await sleep(5000);
            }

            if (!jobState.liveUrl) {
                jobState.progress = 100;
                jobState.state = 'failed';
                jobState.s3Folder = s3Folder;
                jobState.failedReason = 'Sandbox launched but live URL was not reachable. Check ECS task logs.';
                jobState.result = { files: generatedFiles, s3Folder, liveUrl: null, sandboxState: jobState.sandboxState };
                return;
            }

            jobState.progress = 100;
            jobState.state = 'completed';
            jobState.currentStep = 'Agent finished successfully';
            jobState.s3Folder = s3Folder;
            jobState.result = { files: generatedFiles, s3Folder, liveUrl: jobState.liveUrl, sandboxState: jobState.sandboxState };
        } catch (err) {
            jobState.state = 'failed';
            jobState.currentStep = 'Agent failed';
            jobState.failedReason = err.message;
            console.error(`[DIRECT:${jobId}] Generation failed:`, err.message);
        }
    })();

    res.json({ jobId, mode: 'direct' });
}

/** GET /api/ai/job-status/:id */
async function getJobStatus(req, res) {
    try {
        const directJob = directGenerationJobs.get(req.params.id);
        if (directJob) {
            return res.json({
                id: directJob.id, state: directJob.state, progress: directJob.progress,
                result: directJob.result, failedReason: directJob.failedReason,
                currentStep: directJob.currentStep || null, files: directJob.files || [],
                s3Folder: directJob.s3Folder || null, liveUrl: directJob.liveUrl || null,
                sandboxState: directJob.sandboxState || null,
            });
        }

        const job = await generationQueue.getJob(req.params.id);

        if (!job) {
            if (VERBOSE_AI_LOGS) console.log(`[JOB-STATUS] Job ${req.params.id} not in Redis, trying S3 fallback...`);
            try {
                const s3Files = await fetchProjectFromS3(req.params.id);
                if (s3Files && s3Files.length > 0) {
                    return res.json({
                        id: req.params.id, state: 'completed', progress: 100,
                        result: { files: s3Files, s3Folder: `projects/${req.params.id}/` },
                        failedReason: null, files: s3Files, s3Folder: `projects/${req.params.id}/`
                    });
                }
            } catch (s3Err) {
                if (VERBOSE_AI_LOGS) console.warn(`[JOB-STATUS] S3 fallback failed:`, s3Err.message);
            }
            return res.status(404).json({ error: 'Job not found' });
        }

        const state = await job.getState();
        const progress = job.progress;
        const result = job.returnvalue;
        const failedReason = job.failedReason;
        let currentFiles = job.data.generatedFiles || [];

        if (state === 'completed' && currentFiles.length === 0 && (!result?.files || result.files.length === 0)) {
            try {
                const s3Files = await fetchProjectFromS3(req.params.id);
                if (s3Files && s3Files.length > 0) currentFiles = s3Files;
            } catch {}
        }

        res.json({
            id: job.id, state, progress,
            result: result || (currentFiles.length > 0 ? { files: currentFiles, s3Folder: `projects/${req.params.id}/` } : null),
            failedReason,
            files: currentFiles.length > 0 ? currentFiles : (result?.files || []),
            s3Folder: result?.s3Folder || null
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch job status', details: err.message });
    }
}

/** GET /api/ai/fetch-project/:jobId */
async function fetchProject(req, res) {
    try {
        const { jobId } = req.params;
        if (VERBOSE_AI_LOGS) console.log(`[S3-FETCH] Fetching project from S3 for job: ${jobId}`);
        const files = await fetchProjectFromS3(jobId);

        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'No files found in S3 for this job' });
        }

        res.json({
            id: jobId, state: 'completed', progress: 100, files,
            result: { files, s3Folder: `projects/${jobId}/` },
            s3Folder: `projects/${jobId}/`
        });
    } catch (err) {
        console.error('[S3-FETCH] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch project from S3', details: err.message });
    }
}

/** POST /api/ai/save-project/:jobId */
async function saveProject(req, res) {
    try {
        const { jobId } = req.params;
        const { files } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: 'Valid files array is required' });
        }

        console.log(`[S3-SAVE] Saving ${files.length} edited files to S3 for job: ${jobId}`);
        const s3Urls = await uploadProjectToS3(jobId, files);
        res.json({ message: 'Saved successfully', urls: s3Urls });
    } catch (err) {
        console.error('[S3-SAVE] Error:', err.message);
        res.status(500).json({ error: 'Failed to save project to S3', details: err.message });
    }
}

/** POST /api/ai/download */
async function downloadProject(req, res) {
    let { files, jobId } = req.body;

    try {
        if (jobId && (!files || files.length === 0)) {
            try {
                const s3Files = await fetchProjectFromS3(jobId);
                if (s3Files && s3Files.length > 0) files = s3Files;
            } catch (err) {
                console.warn(`[DOWNLOAD] S3 fetch failed for ${jobId}:`, err.message);
            }
        }

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'files array or valid jobId is required' });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="wirestack-project.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { throw err; });
        archive.pipe(res);

        files.forEach(file => {
            if (file.name && file.content) {
                archive.append(file.content, { name: file.name });
            }
        });

        await archive.finalize();
    } catch (err) {
        console.error('❌ Error generating zip:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate zip file', details: err.message });
        }
    }
}

/** POST /api/ai/deploy-html-test */
async function deployHtmlTest(req, res) {
    const { jobId } = req.body;
    if (!jobId) {
        return res.status(400).json({ error: 'jobId is required' });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WireStack Sandbox Demo</title>
  <style>body{font-family:Arial,sans-serif;background:#f7fafc;color:#2d3748;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}main{padding:2rem;border-radius:12px;background:#ffffff;box-shadow:0 6px 20px rgba(0,0,0,.08);text-align:center}h1{margin:0 0 1rem}p{margin:.5rem 0}</style>
</head>
<body>
  <main>
    <h1>WireStack HTML Sandbox</h1>
    <p>Your static page is running successfully in ECS sandbox.</p>
    <p>Job ID: <strong>${jobId}</strong></p>
  </main>
</body>
</html>`;

    try {
        await uploadProjectToS3(jobId, [{ name: 'index.html', content: html }]);
        const result = await deploySandbox(jobId);
        return res.json({ message: 'HTML sandbox deploy started', result });
    } catch (err) {
        console.error('[HTML SANDBOX] failed:', err);
        return res.status(500).json({ error: 'Sandbox deploy failed', details: err.message });
    }
}

module.exports = {
    generatePlan,
    generateFile,
    enqueueProject,
    getJobStatus,
    fetchProject,
    saveProject,
    downloadProject,
    deployHtmlTest,
};
