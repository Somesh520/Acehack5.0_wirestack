/**
 * Analysis controller — handles stack, folder, and GitHub repo analysis.
 * @module controllers/analysisController
 */

const { callLLM } = require('../utils/aiUtils');
const { parseJsonFromLLM } = require('../utils/llmResponseParser');

const VERBOSE_AI_LOGS = process.env.VERBOSE_AI_LOGS === 'true';

/** Standard fallback shape for analysis responses */
const ANALYSIS_FALLBACK = { hardcoded_logic: null, code_quality: null, performance: null, architecture: null };

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

const CODEQL_SEMANTIC_RULES = [
    {
        id: 'js/eval-injection',
        title: 'Dynamic eval usage',
        severity: 'high',
        cwe: 'CWE-95',
        pattern: /\beval\s*\(/g,
        message: 'Use of eval can introduce code injection risk.',
        fix: 'Replace eval with explicit parser or vetted function mapping.',
    },
    {
        id: 'js/dom-xss-innerhtml',
        title: 'Potential DOM XSS via innerHTML',
        severity: 'high',
        cwe: 'CWE-79',
        pattern: /\.innerHTML\s*=\s*/g,
        message: 'Direct innerHTML assignments can allow script injection.',
        fix: 'Use textContent or sanitize trusted HTML before rendering.',
    },
    {
        id: 'js/command-injection',
        title: 'Command execution sink',
        severity: 'high',
        cwe: 'CWE-78',
        pattern: /(?:exec|execSync|spawn)\s*\(/g,
        message: 'Command execution APIs are sensitive to unsanitized input.',
        fix: 'Validate inputs and avoid shell interpolation.',
    },
    {
        id: 'js/weak-jwt-secret',
        title: 'Weak or hardcoded JWT secret',
        severity: 'medium',
        cwe: 'CWE-798',
        pattern: /jwt\.sign\([^)]*['\"][^'\"\n]{1,14}['\"]/g,
        message: 'Hardcoded short secrets reduce JWT integrity.',
        fix: 'Use strong env-based secrets with rotation policy.',
    },
    {
        id: 'js/sql-concat',
        title: 'Potential SQL query concatenation',
        severity: 'medium',
        cwe: 'CWE-89',
        pattern: /(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]{0,120}(?:\+|\$\{)/gi,
        message: 'String-built SQL can enable injection.',
        fix: 'Use parameterized queries or ORM bind parameters.',
    },
    {
        id: 'js/insecure-random',
        title: 'Non-cryptographic random for security context',
        severity: 'medium',
        cwe: 'CWE-338',
        pattern: /Math\.random\s*\(/g,
        message: 'Math.random is not secure for tokens or secrets.',
        fix: 'Use crypto.randomBytes or Web Crypto API.',
    },
    {
        id: 'js/debug-data-leak',
        title: 'Verbose debug logging',
        severity: 'low',
        cwe: 'CWE-532',
        pattern: /console\.(?:log|debug|info)\s*\(/g,
        message: 'Debug logs may leak sensitive runtime details.',
        fix: 'Reduce logs or redact sensitive fields before output.',
    },
];

const SCANNABLE_SOURCE_PATTERN = /\.(js|ts|jsx|tsx|mjs|cjs|py|java|go|rb|php|rs|cs|cpp|c|h|swift|kt|sql)$/i;

function indexToLineAndColumn(source, index) {
    if (index <= 0) return { line: 1, column: 1 };
    const upto = source.slice(0, index);
    const parts = upto.split('\n');
    const line = parts.length;
    const column = (parts[parts.length - 1] || '').length + 1;
    return { line, column };
}

function runCodeQlSemanticScan(files) {
    const findings = [];

    for (const file of files) {
        const content = String(file.content || '');
        if (!content.trim()) continue;

        for (const rule of CODEQL_SEMANTIC_RULES) {
            const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
            let match = regex.exec(content);
            while (match) {
                const position = indexToLineAndColumn(content, match.index);
                const snippet = content.slice(Math.max(0, match.index - 50), match.index + 120).replace(/\s+/g, ' ').trim();
                findings.push({
                    ruleId: rule.id,
                    title: rule.title,
                    severity: rule.severity,
                    cwe: rule.cwe,
                    message: rule.message,
                    fix: rule.fix,
                    path: file.path,
                    line: position.line,
                    column: position.column,
                    snippet,
                });
                match = regex.exec(content);
            }
        }
    }

    const weights = { high: 14, medium: 8, low: 3 };
    const penalty = findings.reduce((sum, item) => sum + (weights[item.severity] || 2), 0);
    const score = Math.max(0, 100 - penalty);

    return { findings, score };
}

function parseSqlLikeQuery(sqlText) {
    const query = String(sqlText || '').trim();
    if (!query) {
        return {
            columns: ['*'],
            conditions: [],
            orderBy: { field: 'severity', direction: 'desc' },
            limit: 50,
        };
    }

    const sanitized = query
        .replace(/```sql|```/gi, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .trim();

    let normalized = sanitized.replace(/\s+/g, ' ').trim();
    normalized = normalized.replace(/;+$/, '').trim();

    // Allow shorthand query styles:
    // 1) WHERE ...
    // 2) ORDER BY ... LIMIT ...
    // 3) LIMIT ...
    // 4) SELECT ... (without explicit FROM findings)
    const startsWithKeyword = /^(where|order\s+by|limit)\b/i.test(normalized);
    if (startsWithKeyword) {
        normalized = `SELECT * FROM findings ${normalized}`;
    } else if (/^select\b/i.test(normalized) && !/\sfrom\s+/i.test(normalized)) {
        normalized = normalized.replace(/^select\s+(.+)$/i, 'SELECT $1 FROM findings');
    }

    const selectMatch = normalized.match(/^select\s+(.+?)\s+from\s+findings\b/i);
    if (!selectMatch) {
        throw new Error('Invalid query. Use SELECT ... FROM findings ... (or shorthand WHERE/ORDER BY/LIMIT)');
    }

    const columnsRaw = selectMatch[1].trim();
    const columns = columnsRaw === '*' ? ['*'] : columnsRaw.split(',').map(c => c.trim()).filter(Boolean);

    const whereMatch = normalized.match(/\swhere\s+(.+?)(?:\sorder\s+by\s+|\slimit\s+|$)/i);
    const orderMatch = normalized.match(/\sorder\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
    const limitMatch = normalized.match(/\slimit\s+(\d+)/i);

    const conditions = [];
    if (whereMatch) {
        const conditionParts = whereMatch[1].split(/\s+and\s+/i);
        for (const part of conditionParts) {
            const trimmed = part.trim();
            const likeMatch = trimmed.match(/^(\w+)\s+like\s+['\"]%(.+)%['\"]$/i);
            if (likeMatch) {
                conditions.push({ field: likeMatch[1], op: 'like', value: likeMatch[2] });
                continue;
            }

            const inMatch = trimmed.match(/^(\w+)\s+in\s*\((.+)\)$/i);
            if (inMatch) {
                const values = inMatch[2].split(',').map(v => v.trim().replace(/^['\"]|['\"]$/g, '')).filter(Boolean);
                conditions.push({ field: inMatch[1], op: 'in', values });
                continue;
            }

            const eqMatch = trimmed.match(/^(\w+)\s*=\s*['\"]?(.+?)['\"]?$/i);
            if (eqMatch) {
                conditions.push({ field: eqMatch[1], op: 'eq', value: eqMatch[2] });
                continue;
            }

            throw new Error(`Unsupported WHERE condition: ${trimmed}`);
        }
    }

    return {
        columns,
        conditions,
        orderBy: {
            field: orderMatch?.[1] || 'severity',
            direction: (orderMatch?.[2] || 'desc').toLowerCase(),
        },
        limit: Math.min(500, Math.max(1, Number(limitMatch?.[1] || 50))),
    };
}

function applySqlLikeQuery(findings, parsedQuery) {
    const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };

    let rows = [...findings];
    for (const condition of parsedQuery.conditions) {
        const field = condition.field;
        if (condition.op === 'eq') {
            rows = rows.filter((row) => String(row[field] ?? '').toLowerCase() === String(condition.value).toLowerCase());
            continue;
        }
        if (condition.op === 'like') {
            rows = rows.filter((row) => String(row[field] ?? '').toLowerCase().includes(String(condition.value).toLowerCase()));
            continue;
        }
        if (condition.op === 'in') {
            const allowed = condition.values.map(v => String(v).toLowerCase());
            rows = rows.filter((row) => allowed.includes(String(row[field] ?? '').toLowerCase()));
        }
    }

    const orderField = parsedQuery.orderBy.field;
    const orderDirection = parsedQuery.orderBy.direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
        const av = a[orderField];
        const bv = b[orderField];

        if (orderField === 'severity') {
            return ((severityRank[av] || 0) - (severityRank[bv] || 0)) * orderDirection;
        }
        if (typeof av === 'number' && typeof bv === 'number') {
            return (av - bv) * orderDirection;
        }
        return String(av ?? '').localeCompare(String(bv ?? '')) * orderDirection;
    });

    const limited = rows.slice(0, parsedQuery.limit);

    if (parsedQuery.columns.length === 1 && parsedQuery.columns[0] === '*') {
        return { rows: limited, totalMatched: rows.length };
    }

    const projected = limited.map((row) => {
        const next = {};
        for (const col of parsedQuery.columns) next[col] = row[col];
        return next;
    });
    return { rows: projected, totalMatched: rows.length };
}

function resolveRepoOwnerAndName({ repoFullName, repoUrl }) {
    if (repoFullName && repoFullName.includes('/')) {
        const [owner, repo] = repoFullName.split('/');
        return { owner, repo };
    }
    if (repoUrl) {
        const cleaned = String(repoUrl).replace(/\.git$/, '').replace(/\/$/, '');
        const match = cleaned.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/);
        if (match) {
            return { owner: match[1], repo: match[2] };
        }
    }
    return null;
}

/** POST /api/ai/codeql-semantic-query */
async function codeqlSemanticQuery(req, res) {
    const { repoFullName, repoUrl, query, branch } = req.body || {};
    const repoInfo = resolveRepoOwnerAndName({ repoFullName, repoUrl });
    if (!repoInfo) {
        return res.status(400).json({ error: 'repoFullName (owner/repo) or repoUrl is required' });
    }

    try {
        const { owner, repo } = repoInfo;
        const githubHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'WireStack-Analyzer' };
        const userGitHubToken = req.user?.github?.accessToken;
        if (userGitHubToken) {
            githubHeaders['Authorization'] = `token ${userGitHubToken}`;
        } else if (process.env.GITHUB_TOKEN) {
            githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const refQuery = branch ? `?recursive=1&ref=${encodeURIComponent(branch)}` : '?recursive=1';
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD${refQuery}`, { headers: githubHeaders });
        if (!treeRes.ok) {
            const errData = await treeRes.json().catch(() => ({}));
            throw new Error(errData.message || `GitHub API error: ${treeRes.status}`);
        }
        const treeData = await treeRes.json();

        const sourcePaths = (treeData.tree || [])
            .filter(node => node.type === 'blob')
            .map(node => node.path)
            .filter(path => !SKIP_PATTERNS.some(s => s.test(path)))
            .filter(path => SCANNABLE_SOURCE_PATTERN.test(path));

        const securityPriority = [/auth/i, /middleware/i, /routes?/i, /controller/i, /service/i, /config/i, /db/i, /api/i, /src\//i];
        sourcePaths.sort((a, b) => {
            const aScore = securityPriority.reduce((s, p) => s + (p.test(a) ? 1 : 0), 0);
            const bScore = securityPriority.reduce((s, p) => s + (p.test(b) ? 1 : 0), 0);
            return bScore - aScore;
        });

        const filesToScan = sourcePaths.slice(0, 120);

        const scannedFiles = await Promise.all(
            filesToScan.map(async (path) => {
                try {
                    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: githubHeaders });
                    if (!fileRes.ok) return null;
                    const fileData = await fileRes.json();
                    if (fileData?.content && fileData?.encoding === 'base64') {
                        const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
                        const limited = decoded.split('\n').slice(0, 800).join('\n');
                        return { path, content: limited };
                    }
                    return null;
                } catch {
                    return null;
                }
            })
        );

        const validFiles = scannedFiles.filter(Boolean);
        const semantic = runCodeQlSemanticScan(validFiles);
        const parsedQuery = parseSqlLikeQuery(query);
        const queried = applySqlLikeQuery(semantic.findings, parsedQuery);

        const response = {
            mode: 'codeql-semantic-open-source',
            repo: `${owner}/${repo}`,
            score: semantic.score,
            totalScannableFiles: sourcePaths.length,
            filesScanned: validFiles.length,
            findingsTotal: semantic.findings.length,
            query: query || 'SELECT * FROM findings ORDER BY severity DESC LIMIT 50',
            matchedRows: queried.totalMatched,
            rows: queried.rows,
            availableFields: ['ruleId', 'title', 'severity', 'cwe', 'path', 'line', 'column', 'message', 'fix', 'snippet'],
            supportedSql: [
                'SELECT * FROM findings WHERE severity = "high" ORDER BY line DESC LIMIT 20',
                'SELECT ruleId,severity,path,line,title FROM findings WHERE path LIKE "%src/%" LIMIT 50',
                'SELECT ruleId,severity,path,line,title FROM findings WHERE severity IN ("high","medium") ORDER BY severity DESC LIMIT 80',
            ],
        };

        if (VERBOSE_AI_LOGS) {
            console.log(`🔎 CodeQL semantic query on ${owner}/${repo} scanned ${validFiles.length} files, findings=${semantic.findings.length}, matched=${queried.totalMatched}`);
        }

        return res.json(response);
    } catch (err) {
        console.error('❌ CodeQL semantic query error:', err.message);
        return res.status(500).json({ error: 'CodeQL semantic query failed', details: err.message });
    }
}

/** POST /api/ai/github-codeql-alerts */
async function fetchGithubCodeqlAlerts(req, res) {
    const { repoFullName, repoUrl, state = 'open', ref, page = 1, perPage = 100 } = req.body || {};
    const repoInfo = resolveRepoOwnerAndName({ repoFullName, repoUrl });
    if (!repoInfo) {
        return res.status(400).json({ error: 'repoFullName (owner/repo) or repoUrl is required' });
    }

    try {
        const { owner, repo } = repoInfo;
        const githubHeaders = {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WireStack-Analyzer',
        };

        const userGitHubToken = req.user?.github?.accessToken;
        if (userGitHubToken) {
            githubHeaders['Authorization'] = `token ${userGitHubToken}`;
        } else if (process.env.GITHUB_TOKEN) {
            githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const params = new URLSearchParams({
            state: String(state || 'open'),
            tool_name: 'CodeQL',
            page: String(Math.max(1, Number(page) || 1)),
            per_page: String(Math.min(100, Math.max(1, Number(perPage) || 100))),
        });
        if (ref) params.set('ref', String(ref));

        const url = `https://api.github.com/repos/${owner}/${repo}/code-scanning/alerts?${params.toString()}`;
        const alertsRes = await fetch(url, { headers: githubHeaders });
        const alertsData = await alertsRes.json().catch(() => ({}));

        if (!alertsRes.ok) {
            if (alertsRes.status === 404) {
                return res.status(404).json({
                    error: 'Code scanning alerts not found for this repo. Ensure CodeQL workflow has run at least once.',
                    details: alertsData?.message || 'Not Found',
                });
            }
            if (alertsRes.status === 403) {
                return res.status(403).json({
                    error: 'GitHub token lacks permission for code scanning alerts. Reconnect GitHub with required scopes.',
                    details: alertsData?.message || 'Forbidden',
                });
            }
            return res.status(alertsRes.status).json({
                error: alertsData?.message || 'Failed to fetch GitHub CodeQL alerts',
            });
        }

        const alerts = Array.isArray(alertsData) ? alertsData : [];
        const normalized = alerts.map((alert) => ({
            number: alert.number,
            state: alert.state,
            severity: alert.rule?.security_severity_level || alert.rule?.severity || 'unknown',
            ruleId: alert.rule?.id || 'unknown',
            ruleName: alert.rule?.name || alert.rule?.description || 'Unnamed rule',
            description: alert.rule?.description || '',
            tool: alert.tool?.name || 'CodeQL',
            htmlUrl: alert.html_url,
            createdAt: alert.created_at,
            updatedAt: alert.updated_at,
            mostRecentInstance: {
                ref: alert.most_recent_instance?.ref || null,
                path: alert.most_recent_instance?.location?.path || null,
                line: alert.most_recent_instance?.location?.start_line || null,
                message: alert.most_recent_instance?.message?.text || null,
            },
        }));

        const counts = normalized.reduce((acc, item) => {
            const sev = String(item.severity || 'unknown').toLowerCase();
            acc[sev] = (acc[sev] || 0) + 1;
            return acc;
        }, {});

        return res.json({
            mode: 'github-official-codeql-alerts',
            repo: `${owner}/${repo}`,
            state: String(state || 'open'),
            page: Math.max(1, Number(page) || 1),
            perPage: Math.min(100, Math.max(1, Number(perPage) || 100)),
            totalReturned: normalized.length,
            severityCounts: counts,
            alerts: normalized,
        });
    } catch (err) {
        console.error('❌ GitHub CodeQL alerts error:', err.message);
        return res.status(500).json({ error: 'GitHub CodeQL alerts fetch failed', details: err.message });
    }
}

// ─── Shared analysis prompt ──────────────────────────────────

const ANALYSIS_JSON_SCHEMA = `{
  "summary": "2-3 sentence overview",
  "detected_stack": ["tech1", "tech2"],
  "hardcoded_logic": {
    "severity": "Low/Medium/High",
    "issues": ["specific hardcoded patterns found"],
    "recommendations": ["refactor to config-driven approach", "use environment variables"],
    "impact": "maintainability risk assessment"
  },
  "code_quality": { "score": "A/B/C/D", "issues": [], "recommendations": [], "patterns": [] },
  "performance": { "status": "Optimal/Warning/Critical", "issues": [], "bottlenecks": [], "optimizations": [] },
  "architecture": { "pattern": "monolith/microservices/serverless", "strengths": [], "weaknesses": [], "missing_components": [], "production_checklist": [] }
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
        const userGitHubToken = req.user?.github?.accessToken;
        if (userGitHubToken) {
            githubHeaders['Authorization'] = `token ${userGitHubToken}`;
        } else if (process.env.GITHUB_TOKEN) {
            githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

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

module.exports = { analyzeStack, analyzeFolder, analyzeRepo, codeqlSemanticQuery, fetchGithubCodeqlAlerts };
