/**
 * Analysis controller — handles stack, folder, and GitHub repo analysis.
 * @module controllers/analysisController
 */

const { callLLM } = require('../utils/aiUtils');
const { parseJsonFromLLM } = require('../utils/llmResponseParser');

const VERBOSE_AI_LOGS = process.env.VERBOSE_AI_LOGS === 'true';

/** Standard fallback shape for analysis responses */
const ANALYSIS_FALLBACK = { cost: null, security: null, scalability: null, architecture: null, code_quality: null };

// ─── File selection patterns ─────────────────────────────────

const IMPORTANT_FILE_PATTERNS = [
    /package\.json$/i, /requirements\.txt$/i, /Pipfile$/i, /go\.mod$/i, /pom\.xml$/i, /build\.gradle$/i,
    /docker/i, /compose/i, /\.env\.example$/i, /nginx/i, /Procfile$/i,
    /tsconfig/i, /next\.config/i, /vite\.config/i, /webpack\.config/i,
    /^readme/i, /\.prisma$/i, /schema\./i,
    /server\.(js|ts)$/i, /app\.(js|ts|py)$/i, /index\.(js|ts|jsx|tsx)$/i, /main\.(js|ts|py|go)$/i,
    /routes?\//i, /middleware/i, /config\//i, /\.yaml$/i, /\.yml$/i, /\.toml$/i,
];

const SOURCE_PATTERNS = [/\.(js|ts|jsx|tsx|py|go|rs|java|rb)$/i];

const SKIP_PATTERNS = [
    /node_modules/i, /\.git\//i, /dist\//i, /build\//i, /\.next\//i,
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|mp3|zip|lock)$/i,
    /package-lock\.json$/i, /yarn\.lock$/i, /\.min\.(js|css)$/i,
];

// ─── Shared analysis prompt ──────────────────────────────────

const ANALYSIS_JSON_SCHEMA = `{
  "summary": "2-3 sentence overview",
  "detected_stack": ["tech1", "tech2"],
  "cost": {
    "monthly_estimate": "$XX - $XX/month",
    "breakdown": [{ "service": "name", "provider": "AWS/GCP/Vercel/etc", "cost": "$X/mo", "note": "why" }],
    "free_tier_possible": true,
    "annual_estimate": "$XXX - $XXX/year",
    "tip": "cost saving tip"
  },
  "security": { "score": "A/B/C/D", "strengths": [], "vulnerabilities": [], "critical_fixes": [], "recommendations": [] },
  "scalability": { "score": "A/B/C/D", "max_concurrent_users": "range", "bottlenecks": [], "improvements": [] },
  "architecture": { "pattern": "monolith/microservices/serverless", "strengths": [], "weaknesses": [], "missing_components": [], "production_checklist": [] },
  "code_quality": { "score": "A/B/C/D", "issues": [], "suggestions": [] }
}`;

/**
 * Pick the most important files from a list for analysis.
 * @param {Array<{name: string, content: string}>} files
 * @param {object} limits - { maxFiles, maxLines, maxSourceFiles }
 * @returns {Array<{name: string, content: string}>}
 */
function pickImportantFiles(files, { maxFiles, maxLines, maxSourceFiles }) {
    const importantFiles = [];

    for (const file of files) {
        if (importantFiles.length >= maxFiles) break;
        if (IMPORTANT_FILE_PATTERNS.some(p => p.test(file.name)) && file.content) {
            const truncated = file.content.split('\n').slice(0, maxLines).join('\n');
            importantFiles.push({ name: file.name, content: truncated });
        }
    }

    if (importantFiles.length < Math.floor(maxFiles * 0.4)) {
        for (const file of files) {
            if (importantFiles.length >= maxSourceFiles) break;
            if (importantFiles.find(f => f.name === file.name)) continue;
            if (SOURCE_PATTERNS.some(p => p.test(file.name)) && file.content) {
                const truncated = file.content.split('\n').slice(0, Math.floor(maxLines * 0.6)).join('\n');
                importantFiles.push({ name: file.name, content: truncated });
            }
        }
    }

    return importantFiles;
}

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

/** POST /api/ai/analyze-stack */
async function analyzeStack(req, res) {
    const { stack, model } = req.body;
    if (!stack || !Array.isArray(stack) || stack.length === 0) {
        return res.status(400).json({ error: 'stack array is required (list of tech names)' });
    }

    const stackList = stack.join(', ');
    const systemPrompt = `You are a senior cloud architect and DevOps consultant. Analyze the given tech stack and provide a comprehensive project analysis.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
${ANALYSIS_JSON_SCHEMA}

Be realistic and specific with cost estimates. Use actual cloud provider pricing. Consider the Indian developer context (budget-friendly options).`;

    try {
        const raw = await callLLM(systemPrompt, `Analyze this tech stack: ${stackList}`, 4000, 2, model);
        const analysis = parseJsonFromLLM(raw, ANALYSIS_FALLBACK);
        res.json(analysis);
    } catch (err) {
        console.error('❌ Analysis error:', err.message);
        res.status(500).json({ error: 'Analysis failed', details: err.message });
    }
}

/** POST /api/ai/analyze-folder */
async function analyzeFolder(req, res) {
    const { files, folderName, model } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'files array is required' });
    }

    const isGroq = model === 'groq';
    const maxFiles = isGroq ? 10 : 20;
    const maxLines = isGroq ? 60 : 500;
    const maxSourceFiles = isGroq ? 15 : 20;

    const allFileNames = files.map(f => f.name);
    const importantFiles = pickImportantFiles(files, { maxFiles, maxLines, maxSourceFiles });
    const treeStr = allFileNames.slice(0, 100).join('\n');

    const systemPrompt = `You are a senior cloud architect, security expert, and DevOps consultant reviewing a REAL project codebase.

Analyze the project structure and source code below. Be SPECIFIC — reference actual file names and patterns.

Return ONLY a valid JSON object (no markdown, no backticks):
${ANALYSIS_JSON_SCHEMA}

Use real cloud provider pricing (India region). Be honest about vulnerabilities.`;

    const userPrompt = `Project: ${folderName || 'Uploaded Project'}

FILE TREE (${allFileNames.length} files):
${treeStr}

KEY FILES:
${importantFiles.map(f => `\n--- ${f.name} ---\n${f.content}`).join('\n')}`;

    try {
        console.log(`📂 Analyzing folder: ${folderName} (${allFileNames.length} files, ${importantFiles.length} analyzed)`);
        const raw = await callLLM(systemPrompt, userPrompt, 4000, 2, model);
        const analysis = parseJsonFromLLM(raw, ANALYSIS_FALLBACK);
        res.json(analysis);
    } catch (err) {
        console.error('❌ Folder analysis error:', err.message);
        res.status(500).json({ error: 'Folder analysis failed', details: err.message });
    }
}

/** POST /api/ai/analyze-repo */
async function analyzeRepo(req, res) {
    const { repoUrl, model } = req.body;
    if (!repoUrl) {
        return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Parse GitHub URL → owner/repo
    let owner, repo;
    try {
        const cleaned = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
        const match = cleaned.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/);
        if (!match) throw new Error('Invalid format');
        owner = match[1];
        repo = match[2];
    } catch {
        return res.status(400).json({ error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' });
    }

    try {
        console.log(`🔍 Analyzing GitHub repo: ${owner}/${repo}`);

        const githubHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'WireStack-Analyzer' };
        if (process.env.GITHUB_TOKEN) githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;

        // Fetch repo tree
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers: githubHeaders });
        if (!treeRes.ok) {
            const errData = await treeRes.json().catch(() => ({}));
            throw new Error(errData.message || `GitHub API error: ${treeRes.status}`);
        }

        const treeData = await treeRes.json();
        const allFiles = (treeData.tree || []).filter(f => f.type === 'blob');
        const allPaths = allFiles.map(f => f.path);

        const isGroq = model === 'groq';
        const maxFiles = isGroq ? 10 : 25;
        const maxLines = isGroq ? 60 : 200;
        const maxTreeLines = isGroq ? 40 : 80;

        const skippedPaths = allPaths.filter(p => !SKIP_PATTERNS.some(s => s.test(p)));

        // Prioritized file selection
        const highPriority = [/^package\.json$/i, /^requirements\.txt$/i, /^Dockerfile/i, /docker-compose/i, /^README\.md$/i, /^tsconfig/i, /next\.config/i, /vite\.config/i, /^server\.(js|ts)$/i, /^app\.(js|ts|py)$/i, /^index\.(js|ts|jsx|tsx)$/i, /^src\/app/i, /^src\/index/i, /^src\/main/i, /prisma\/schema/i];
        const medPriority = [/routes?\//i, /middleware/i, /config\//i, /\.yaml$/i, /\.yml$/i, /models?\//i, /controllers?\//i, /services?\//i, /utils?\//i];

        const filesToFetch = [];
        for (const path of skippedPaths) {
            if (filesToFetch.length >= Math.ceil(maxFiles * 0.6)) break;
            if (highPriority.some(p => p.test(path))) filesToFetch.push(path);
        }
        for (const path of skippedPaths) {
            if (filesToFetch.length >= Math.ceil(maxFiles * 0.8)) break;
            if (filesToFetch.includes(path)) continue;
            if (medPriority.some(p => p.test(path))) filesToFetch.push(path);
        }
        for (const path of skippedPaths) {
            if (filesToFetch.length >= maxFiles) break;
            if (filesToFetch.includes(path)) continue;
            if (SOURCE_PATTERNS.some(p => p.test(path))) filesToFetch.push(path);
        }

        // Fetch file contents in parallel
        const fileContents = await Promise.all(
            filesToFetch.map(async (path) => {
                try {
                    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: githubHeaders });
                    if (!fileRes.ok) return { name: path, content: '[Could not fetch]' };
                    const fileData = await fileRes.json();
                    if (fileData.content && fileData.encoding === 'base64') {
                        const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
                        return { name: path, content: decoded.split('\n').slice(0, maxLines).join('\n') };
                    }
                    return { name: path, content: '[Binary or empty file]' };
                } catch { return { name: path, content: '[Fetch error]' }; }
            })
        );

        const treeStr = skippedPaths.slice(0, maxTreeLines).join('\n');

        const systemPrompt = `You are a senior cloud architect analyzing a GitHub repository. Be SPECIFIC — reference actual file names.

Return ONLY a valid JSON object (no markdown, no backticks):
${ANALYSIS_JSON_SCHEMA}

Use real cloud provider pricing (India region). Be honest about vulns.`;

        const userPrompt = `GitHub Repo: https://github.com/${owner}/${repo}

FILE TREE (${allPaths.length} total files):
${treeStr}

KEY FILES (${fileContents.length} analyzed):
${fileContents.map(f => `\n--- ${f.name} ---\n${f.content}`).join('\n')}`;

        const raw = await callLLM(systemPrompt, userPrompt, 4000, 2, model);
        const analysis = parseJsonFromLLM(raw, ANALYSIS_FALLBACK);

        analysis.repo_url = `https://github.com/${owner}/${repo}`;
        analysis.files_analyzed = fileContents.length;
        analysis.total_files = allPaths.length;

        res.json(analysis);
    } catch (err) {
        console.error('❌ Repo analysis error:', err.message);
        res.status(500).json({ error: 'Repo analysis failed', details: err.message });
    }
}

module.exports = { analyzeStack, analyzeFolder, analyzeRepo };
