const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const archiver = require('archiver');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are **WireStack Agent** — an intelligent AI architect that helps non-technical users build their dream app! 🚀

You are like a game master guiding players through a skill tree. Your job is to:
1. Listen to the user's app idea and understand their vision.
2. Design an industry-standard architecture based on their input.
3. Break it down into LEVELS (Frontend, Backend, Database, Auth, etc.).
4. For each level, suggest the **BEST PRACTICE** (Industry Standard) and provide **ALTERNATIVES** to help them learn.

Output your system design in this format:
\`\`\`system_design
[
  {
    "id": "frontend",
    "title": "Frontend",
    "best_practice": { "id": "react", "name": "React", "reason": "Industry standard for web apps with 10M+ devs." },
    "alternatives": [
      { "id": "vue", "name": "Vue.js", "reason": "Better for beginners due to simpler syntax." },
      { "id": "nextjs", "name": "Next.js", "reason": "Best for SEO and high-performance e-commerce." }
    ]
  },
  {
    "id": "backend",
    "title": "Backend",
    "best_practice": { "id": "express", "name": "Express.js", "reason": "Lightweight and standard for Node.js." },
    "alternatives": [
      { "id": "nestjs", "name": "NestJS", "reason": "Better for large enterprise teams with TypeScript." }
    ]
  }
]
\`\`\`

Personality:
- Talk like an AI agent/architect: "I've analyzed your mission..."
- Use mission/quest language: "Your first challenge is...", "Level up with..."
- Be concise: max 3-4 sentences + system_design block.
- Explain the "WHY" behind the Industry Standard.
- Use emojis: 🎯🔓✅🗺️⚡🛡️💎

CRITICAL RULE: Before providing your final response, you MUST think step-by-step. Wrap your internal thought process inside <thought>...</thought> tags. Then provide your final response to the user.`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    let formattedHistoryGemini = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // CRITICAL FIX: Gemini requires strict alternating roles starting with 'user'
    let sanitizedGeminiHistory = [];
    let expectedRole = 'user';

    for (const msg of formattedHistoryGemini) {
        if (msg.role === expectedRole) {
            sanitizedGeminiHistory.push(msg);
            expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
    }

    // If we dropped the last message and it was supposed to be a user message (meaning the array ends with a user message already)
    // we don't need to do anything. But if the array ends with a model message, that's fine too since we are about to append a user message manually in chat.sendMessage().
    formattedHistoryGemini = sanitizedGeminiHistory;

    const formattedHistoryGroq = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10),
        { role: 'user', content: message }
    ];

    const modelsToTry = [
        { provider: 'groq', modelId: 'llama-3.3-70b-versatile', engineName: 'Groq (Llama 3.3 70B)' },
        { provider: 'groq', modelId: 'llama-3.1-8b-instant', engineName: 'Groq (Llama 3.1 8B)' }, // Valid Groq fallback
        { provider: 'gemini', modelId: 'gemini-2.5-flash', engineName: 'Gemini (2.5 Flash)' }, // Very Latest Gemini
        { provider: 'gemini', modelId: 'gemini-1.5-flash-latest', engineName: 'Gemini (1.5 Flash)' }, // Valid API name
        { provider: 'gemini', modelId: 'gemini-1.5-pro-latest', engineName: 'Gemini (1.5 Pro)' }      // Valid API name
    ];

    let lastError = null;

    for (const attempt of modelsToTry) {
        console.log(`🤖 Attempting to generate response using: ${attempt.engineName}...`);
        try {
            if (attempt.provider === 'groq' && process.env.GROQ_API_KEY) {
                const chatCompletion = await groq.chat.completions.create({
                    messages: formattedHistoryGroq,
                    model: attempt.modelId,
                    temperature: 0.7,
                    max_tokens: 8000,
                });
                let reply = chatCompletion.choices[0]?.message?.content;
                if (reply) {
                    const thoughtMatch = reply.match(/<thought>([\s\S]*?)<\/thought>/);
                    const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : null;
                    const cleanReply = reply.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim() || 'Hmm, I got confused. Try again!';

                    // Create a gamified label indicating which super-fast model achieved the generation
                    const finalThoughtProcess = thoughtContent
                        ? `[POWERED BY ${attempt.engineName}]\n\n${thoughtContent}`
                        : `I'm running on ${attempt.engineName} engine.`;

                    return res.json({ reply: cleanReply, thoughtProcess: finalThoughtProcess, engine: attempt.provider });
                }
            } else if (attempt.provider === 'gemini' && process.env.GEMINI_API_KEY) {
                const model = genAI.getGenerativeModel({
                    model: attempt.modelId,
                    systemInstruction: SYSTEM_PROMPT + "\n\nCRITICAL: Before providing your final response, you MUST think step-by-step. Wrap your internal thought process inside <thought>...</thought> tags. Then provide your final response to the user.",
                });
                const chat = model.startChat({
                    history: formattedHistoryGemini,
                    generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
                });
                const result = await chat.sendMessage([{ text: message }]);
                let reply = result.response.text();

                if (reply) {
                    const thoughtMatch = reply.match(/<thought>([\s\S]*?)<\/thought>/);
                    const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : null;
                    const cleanReply = reply.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim() || 'Hmm, I got confused. Try again!';

                    const finalThoughtProcess = thoughtContent
                        ? `[POWERED BY ${attempt.engineName}]\n\n${thoughtContent}`
                        : `I'm running on ${attempt.engineName} engine.`;

                    return res.json({ reply: cleanReply, thoughtProcess: finalThoughtProcess, engine: 'Gemini' });
                }
            }
        } catch (err) {
            console.warn(`⚠️ ${attempt.engineName} failed:`, err.message);
            lastError = err;
        }
    }

    console.error('❌ ALL AI MODELS FAILED:', lastError);
    return res.status(500).json({ error: 'AI service completely unavailable after trying all fallbacks.', details: lastError?.message });
});

// ============================================================
// SEQUENTIAL CODE GENERATION PIPELINE
// ============================================================

// Helper: sleep for ms milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: call Gemini or Groq with retry logic and exponential backoff
async function callLLM(systemPrompt, userMessage, maxTokens = 4000, retries = 2, preferredModel = null) {
    const modelsToTry = [
        { provider: 'groq', modelId: 'llama-3.3-70b-versatile', engineName: 'Groq (Llama 3.3 70B)' },
        { provider: 'groq', modelId: 'llama-3.1-8b-instant', engineName: 'Groq (Llama 3.1 8B)' },
        { provider: 'gemini', modelId: 'gemini-2.5-flash', engineName: 'Gemini (2.5 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-flash-latest', engineName: 'Gemini (1.5 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-pro-latest', engineName: 'Gemini (1.5 Pro)' }
    ];

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        for (const modelOpt of modelsToTry) {
            // Respect preferredModel if provided (e.g., forcing groq or gemini)
            if (preferredModel && preferredModel !== modelOpt.provider) continue;

            try {
                if (modelOpt.provider === 'groq' && process.env.GROQ_API_KEY) {
                    const chatCompletion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        model: modelOpt.modelId,
                        temperature: 0.7,
                        max_tokens: maxTokens,
                    });
                    const reply = chatCompletion.choices[0]?.message?.content;
                    if (reply) return reply;

                } else if (modelOpt.provider === 'gemini' && process.env.GEMINI_API_KEY) {
                    const model = genAI.getGenerativeModel({
                        model: modelOpt.modelId,
                        systemInstruction: systemPrompt,
                        generationConfig: { maxOutputTokens: maxTokens },
                    });

                    // Note: Using generateContent for generic tasks (no chat history here)
                    const result = await model.generateContent(userMessage);
                    const reply = result.response.text();
                    if (reply) return reply;
                }
            } catch (err) {
                console.warn(`⚠️ ${modelOpt.engineName} failed (attempt ${attempt}/${retries}):`, err.message);
                lastError = err;
            }
        }

        // Wait before retrying (exponential backoff: 2s, 4s)
        if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Retrying all models in ${delay / 1000}s...`);
            await sleep(delay);
        }
    }

    throw lastError || new Error('No AI providers available after trying all fallbacks');
}

// STEP 1: Generate the file plan (tiny JSON)
router.post('/generate-plan', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

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
3. CRITICAL ARCHITECTURE RULE: You MUST separate the codebase into "frontend/" and "backend/" directories if the stack contains both UI (React/Vue/Next) and Server (Express/Django) technologies.
4. Each directory (frontend and backend) MUST have its own "package.json" or equivalent dependency file.
5. Provide a ROOT "docker-compose.yml" that orchestrates the frontend, backend, and any databases.
6. Provide a ROOT "README.md" explaining the architecture and how to run everything.
7. CREATE REAL FOLDER STRUCTURES inside backend and frontend. Example paths:
   - frontend/package.json
   - frontend/src/App.jsx
   - frontend/src/components/Header.jsx
   - backend/package.json
   - backend/src/index.js
   - backend/src/config/db.js
   - backend/src/routes/api.js
   - backend/src/controllers/userController.js
   - backend/src/models/User.js
   - docker-compose.yml
   - README.md
8. DO NOT invent complex business logic. Just provide clean, empty scaffolding and standard imports.

Example output:
[{"name":"frontend/package.json","purpose":"UI dependencies"},{"name":"frontend/src/App.jsx","purpose":"Main UI component"},{"name":"backend/package.json","purpose":"Server dependencies"},{"name":"backend/src/index.js","purpose":"Basic API entry point"},{"name":"backend/src/config/db.js","purpose":"Database connection setup"},{"name":"backend/src/routes/api.js","purpose":"API routes definition"},{"name":"docker-compose.yml","purpose":"Docker Compose config orchestrating both"},{"name":"README.md","purpose":"Instructions to run"}]`

        : `You are a senior software architect. Given a project idea and tech stack, return ONLY a JSON array of files needed to build the project. Each entry has "name" (filename) and "purpose" (1-line description).

RULES:
1. Return ONLY a valid JSON array. No markdown, no text, no backticks.
2. Include 6-10 files maximum.
3. ALWAYS include "package.json" as the FIRST file.
4. ALWAYS include "Dockerfile" and "docker-compose.yml" so the project can be run instantly via Docker.
5. ALWAYS include "README.md" explaining how to start the app using \`docker-compose up\`.
6. ALWAYS include "index.html" as the LAST file — this is a beautiful Tailwind CSS frontend preview.
7. Include files relevant to the chosen stack (e.g., server.js for Express, db.js for MongoDB).
8. File names should be flat (no folders), just filenames.

Example output:
[{"name":"package.json","purpose":"Project dependencies and scripts"},{"name":"server.js","purpose":"Express API server with routes"},{"name":"Dockerfile","purpose":"Dockerize the Node.js application"},{"name":"docker-compose.yml","purpose":"Docker Compose config to run the app"},{"name":"README.md","purpose":"Instructions to run the app via Docker"},{"name":"index.html","purpose":"Beautiful Tailwind frontend preview"}]`;

    try {
        const reply = await callLLM(systemPrompt, `Project idea: "${idea}"\nTech stack: ${stack}`);

        // Extract JSON array
        let jsonStr = reply.trim();
        const firstBracket = jsonStr.indexOf('[');
        const lastBracket = jsonStr.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
        }

        const plan = JSON.parse(jsonStr);
        res.json({ plan });
    } catch (err) {
        console.error('❌ Plan generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate file plan', details: err.message });
    }
});

// STEP 2: Generate a single file's content
router.post('/generate-file', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { idea, stack, fileName, filePurpose, existingFiles = [] } = req.body;
    if (!idea || !stack || !fileName) {
        return res.status(400).json({ error: 'idea, stack, and fileName are required' });
    }

    const isBoilerplate = idea.toLowerCase().includes('boilerplate');

    const baseName = fileName.split('/').pop(); // Get just the filename from nested paths like backend/src/index.js
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

    const systemPrompt = `You are an expert senior software engineer writing production-ready code.

RULES:
1. Return ONLY the file content. No markdown backticks, no explanations, no conversation.
2. Write REAL, working, professional code that an enterprise developer would use.
3. The code should be for: "${idea}" using stack: ${stack}.
${isHtml ? (isBoilerplate
            ? `4. Write a clean, minimal placeholder HTML summarizing the boilerplate stack. Include Tailwind via CDN if Tailwind is in the stack. DO NOT build a complex application.`
            : `4. This is the MAIN DEMO FILE. You must create a FULLY FUNCTIONAL, INTERACTIVE single-page application.
   
   CRITICAL STYLING RULES (DO NOT IGNORE):
   - You MUST include EXACTLY this line inside the <head> tag: <script src="https://cdn.tailwindcss.com"></script>
   - You MUST ALSO include a fallback <style> block in the <head> with basic modern resets, a default sans-serif font, and basic layout structure (flexbox/grid) just in case the CDN fails or loads slowly.
   - The UI MUST look professional, premium, and fully responsive (mobile, tablet, desktop).
   
   THIS MUST BE A WORKING APP, NOT JUST A LANDING PAGE. Include ALL of these:
   
   A) SIMULATED BACKEND (JavaScript mock API):
      - Create a MockAPI object that simulates REST endpoints using localStorage
      - Pre-populate localStorage with 8-12 realistic dummy data items on first load
      - Support CRUD operations (Create, Read, Update, Delete)
      - Example: MockAPI.getProducts(), MockAPI.addToCart(), MockAPI.login()
   
   B) WORKING FEATURES (must actually work when clicked):
      - Authentication: Login/Signup modal with form validation, stores user in localStorage
      - Data Display: Dynamically render items from the mock database in a clean UI Grid
      - Search & Filter: Real-time search bar that filters displayed items
      - CRUD Actions: Add/edit/delete items with immediate UI updates
      - Cart/Selection: If e-commerce, full add-to-cart with quantity, total price calculation
      - Notifications: Toast notifications on actions (added to cart, logged in, etc.)
   
   C) PREMIUM UI/UX USING TAILWIND UTILITY CLASSES:
      - Use rich utility classes (e.g., bg-slate-900, text-white, shadow-xl, rounded-2xl, p-6)
      - Glass-morphism cards with backdrop-blur (backdrop-blur-md bg-white/10)
      - Smooth CSS transitions and hover animations (transition-all hover:-translate-y-1)
      - Responsive grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 or 4)
      - Professional navigation bar (sticky top-0, flex justify-between items-center)
      - At least 300 lines of well-structured code
   
   D) INTERACTIVITY:
      - Modal dialogs that open/close
      - Tab switching between views
      - Dynamic counters (cart badge, notification count)
      - Form submissions that actually save data
      - State management using a simple JavaScript store pattern
   
   The goal is that a hackathon judge can click through this preview and see a REAL, WORKING application.`) : ''}
${isJson ? (isBoilerplate
            ? '4. Return valid JSON only. If package.json, include standard production/dev scripts (start, dev, lint, build).'
            : '4. Return valid JSON only.') : ''}
${isDocker ? `4. Write clean, reliable, production-ready Docker configurations.
   - If this is a Dockerfile inside 'frontend/' or 'backend/', assume it only builds that specific part. Use multi-stage builds if appropriate. Set WORKDIR, copy dependencies, run install, copy source, and expose the correct port.
   - If this is the ROOT docker-compose.yml: orchestrate the 'frontend', 'backend', and any databases listed in the stack (e.g., postgres, redis, mongo). Use 'build: ./frontend' and 'build: ./backend' directives. Map ports correctly and pass necessary ENV variables between services.` : ''}
${isServerConfig ? `4. Write robust server configuration.
   - If server entry point (e.g., index.js, src/server.js): Setup standard middleware (cors, helmet, express.json), connect to databases if required, and mount routes cleanly. DO NOT put all logic in one file if the path suggests a modular structure.` : ''}
${isConfig ? '4. Write a standard, well-documented configuration file with sensible defaults and inline comments explaining each setting.' : ''}
${!isHtml && !isJson && !isDocker && !isServerConfig && !isConfig ? (isBoilerplate
            ? `4. Write clean, modular, well-commented code following SOLID principles. If it is a route, controller, or model file, provide a COMPLETE standard CRUD scaffold with at minimum 5 CRUD-related functions/endpoints. Each function should have proper error handling, input validation comments, and JSDoc/docstring annotations. Write at least 40-60 lines per file. The file path is: ${fileName}`
            : '4. Write clean, well-commented code with proper error handling.') : ''}`;

    const userMessage = `Generate the file: "${fileName}"
Purpose: ${filePurpose}
${contextBlock}

Return ONLY the raw file content, nothing else.`;

    try {
        const tokens = isHtml ? 8000 : (isBoilerplate ? 6000 : 4000);
        let content = await callLLM(systemPrompt, userMessage, tokens);

        // Strip any markdown code fences the LLM might have added
        content = content.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();

        res.json({ name: fileName, content });
    } catch (err) {
        console.error(`❌ File generation error (${fileName}):`, err.message);
        res.status(500).json({ error: `Failed to generate ${fileName}`, details: err.message });
    }
});

// STEP 3: Download the generated project as a ZIP file
router.post('/download', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { files } = req.body;
    if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'files array is required' });
    }

    try {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="wirestack-project.zip"');

        const archive = archiver('zip', {
            zlib: { level: 9 } // maximum compression
        });

        archive.on('error', function (err) {
            throw err;
        });

        archive.pipe(res);

        // Add files to the ZIP
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
});

// ============================================================
// PROJECT ANALYSIS: Cost, Security, Scalability
// ============================================================
router.post('/analyze-stack', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { stack, model } = req.body;
    if (!stack || !Array.isArray(stack) || stack.length === 0) {
        return res.status(400).json({ error: 'stack array is required (list of tech names)' });
    }

    const stackList = stack.join(', ');
    const systemPrompt = `You are a senior cloud architect and DevOps consultant. Analyze the given tech stack and provide a comprehensive project analysis.

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks, no extra text):
{
  "summary": "1-2 sentence overall assessment",
  "cost": {
    "monthly_estimate": "$XX - $XX/month",
    "breakdown": [
      { "service": "name", "provider": "AWS/GCP/Vercel/etc", "cost": "$X/mo", "note": "why" }
    ],
    "free_tier_possible": true/false,
    "tip": "cost optimization tip"
  },
  "security": {
    "score": "A/B/C/D (letter grade)",
    "strengths": ["strength1", "strength2"],
    "vulnerabilities": ["vuln1", "vuln2"],
    "recommendations": ["rec1", "rec2", "rec3"]
  },
  "scalability": {
    "score": "A/B/C/D (letter grade)",
    "max_concurrent_users": "estimated range",
    "bottlenecks": ["bottleneck1"],
    "improvements": ["improvement1", "improvement2"]
  },
  "architecture": {
    "pattern": "monolith/microservices/serverless/etc",
    "strengths": ["str1"],
    "missing_components": ["component user should add"],
    "production_checklist": ["step1", "step2", "step3"]
  }
}

Be realistic and specific with cost estimates. Use actual cloud provider pricing. Consider the Indian developer context (budget-friendly options).`;

    try {
        const raw = await callLLM(systemPrompt, `Analyze this tech stack: ${stackList}`, 4000, 2, model);

        // Extract JSON from response
        let analysis;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (parseErr) {
            console.warn('⚠️ Analysis JSON parse failed, returning raw');
            analysis = { summary: raw, cost: null, security: null, scalability: null, architecture: null };
        }

        res.json(analysis);
    } catch (err) {
        console.error('❌ Analysis error:', err.message);
        res.status(500).json({ error: 'Analysis failed', details: err.message });
    }
});

// ============================================================
// FOLDER ANALYSIS: Upload real project files for deep analysis
// ============================================================
router.post('/analyze-folder', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { files, folderName, model } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'files array is required' });
    }

    // Smart file selection: prioritize config, package, docker, env, key source files
    const isGroq = model === 'groq';
    const maxFiles = isGroq ? 10 : 20;
    const maxLines = isGroq ? 60 : 500;
    const maxSourceFiles = isGroq ? 15 : 20;

    const importantPatterns = [
        /package\.json$/i, /requirements\.txt$/i, /Pipfile$/i, /go\.mod$/i, /pom\.xml$/i, /build\.gradle$/i,
        /docker/i, /compose/i, /\.env\.example$/i, /nginx/i, /Procfile$/i,
        /tsconfig/i, /next\.config/i, /vite\.config/i, /webpack\.config/i,
        /^readme/i, /\.prisma$/i, /schema\./i,
        /server\.(js|ts)$/i, /app\.(js|ts|py)$/i, /index\.(js|ts|jsx|tsx)$/i, /main\.(js|ts|py|go)$/i,
        /routes?\//i, /middleware/i, /config\//i, /\.yaml$/i, /\.yml$/i, /\.toml$/i,
    ];

    // Pick important files (with content) — max files based on model
    const importantFiles = [];
    const allFileNames = files.map(f => f.name);

    for (const file of files) {
        if (importantFiles.length >= maxFiles) break;
        const isImportant = importantPatterns.some(p => p.test(file.name));
        if (isImportant && file.content) {
            const truncated = file.content.split('\n').slice(0, maxLines).join('\n');
            importantFiles.push({ name: file.name, content: truncated });
        }
    }

    // If we got less than enough, also add some source files
    if (importantFiles.length < Math.floor(maxFiles * 0.4)) {
        const sourcePatterns = [/\.(js|ts|jsx|tsx|py|go|rs|java|rb)$/i];
        for (const file of files) {
            if (importantFiles.length >= maxSourceFiles) break;
            if (importantFiles.find(f => f.name === file.name)) continue;
            const isSource = sourcePatterns.some(p => p.test(file.name));
            if (isSource && file.content) {
                const truncated = file.content.split('\n').slice(0, Math.floor(maxLines * 0.6)).join('\n');
                importantFiles.push({ name: file.name, content: truncated });
            }
        }
    }

    // Build the folder tree summary
    const treeStr = allFileNames.slice(0, 100).join('\n');

    const systemPrompt = `You are a senior cloud architect, security expert, and DevOps consultant. You are reviewing a REAL project codebase.

Analyze the project structure and source code below. Provide a comprehensive analysis.

Return ONLY a valid JSON object (no markdown, no backticks):
{
  "summary": "2-3 sentence overview of what this project is and tech stack detected",
  "detected_stack": ["tech1", "tech2", "tech3"],
  "cost": {
    "monthly_estimate": "$XX - $XX/month",
    "breakdown": [
      { "service": "name", "provider": "AWS/GCP/Vercel/Railway/etc", "cost": "$X/mo", "note": "why this cost" }
    ],
    "free_tier_possible": true/false,
    "annual_estimate": "$XXX - $XXX/year",
    "tip": "biggest cost saving tip"
  },
  "security": {
    "score": "A/B/C/D",
    "strengths": ["what they did right"],
    "vulnerabilities": ["specific issues found in the code"],
    "critical_fixes": ["must-fix security issues"],
    "recommendations": ["nice-to-have security improvements"]
  },
  "scalability": {
    "score": "A/B/C/D",
    "max_concurrent_users": "estimated range like 1K-5K",
    "bottlenecks": ["specific bottlenecks found"],
    "improvements": ["what to add for better scale"]
  },
  "architecture": {
    "pattern": "monolith/microservices/serverless/jamstack/etc",
    "strengths": ["good arch decisions"],
    "weaknesses": ["arch problems"],
    "missing_components": ["what should be added"],
    "production_checklist": ["step1", "step2", "step3", "step4", "step5"]
  },
  "code_quality": {
    "score": "A/B/C/D",
    "issues": ["specific code quality issues"],
    "suggestions": ["improvement suggestions"]
  }
}

Be SPECIFIC - reference actual file names and code patterns you see. Use real cloud provider pricing for India region. Be honest about vulnerabilities.`;

    const userPrompt = `Project: ${folderName || 'Uploaded Project'}

FILE TREE (${allFileNames.length} files):
${treeStr}

KEY FILES:
${importantFiles.map(f => `\n--- ${f.name} ---\n${f.content}`).join('\n')}`;

    try {
        console.log(`📂 Analyzing folder: ${folderName} (${allFileNames.length} files, ${importantFiles.length} analyzed) using ${model || 'default'} model (isGroq: ${isGroq})`);
        const raw = await callLLM(systemPrompt, userPrompt, 4000, 2, model);

        let analysis;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (parseErr) {
            console.warn('⚠️ Folder analysis JSON parse failed');
            analysis = { summary: raw, cost: null, security: null, scalability: null, architecture: null, code_quality: null };
        }

        res.json(analysis);
    } catch (err) {
        console.error('❌ Folder analysis error:', err.message);
        res.status(500).json({ error: 'Folder analysis failed', details: err.message });
    }
});

// ============================================================
// GITHUB REPO ANALYSIS: Analyze via GitHub API (handles huge repos)
// ============================================================
router.post('/analyze-repo', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { repoUrl, model } = req.body;
    if (!repoUrl) {
        return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Parse GitHub URL → owner/repo
    // Supports: https://github.com/owner/repo, github.com/owner/repo, owner/repo
    let owner, repo;
    try {
        const cleaned = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
        const match = cleaned.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/);
        if (!match) throw new Error('Invalid format');
        owner = match[1];
        repo = match[2];
    } catch (e) {
        return res.status(400).json({ error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' });
    }

    try {
        console.log(`🔍 Analyzing GitHub repo: ${owner}/${repo}`);

        // 1. Fetch repo file tree recursively
        const githubHeaders = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'WireStack-Analyzer'
        };
        if (process.env.GITHUB_TOKEN) {
            githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
            headers: githubHeaders
        });

        if (!treeRes.ok) {
            const errData = await treeRes.json().catch(() => ({}));
            throw new Error(errData.message || `GitHub API error: ${treeRes.status}`);
        }

        const treeData = await treeRes.json();
        const allFiles = (treeData.tree || []).filter(f => f.type === 'blob');
        const allPaths = allFiles.map(f => f.path);

        // 2. Smart file selection — prioritize config and key source files
        const isGroq = model === 'groq';
        const maxFiles = isGroq ? 10 : 25;
        const maxLines = isGroq ? 60 : 200;
        const maxTreeLines = isGroq ? 40 : 80;

        const highPriority = [
            /^package\.json$/i, /^requirements\.txt$/i, /^Pipfile$/i, /^go\.mod$/i, /^pom\.xml$/i,
            /^Dockerfile/i, /docker-compose/i, /^\.env\.example$/i, /^Procfile$/i,
            /^tsconfig/i, /next\.config/i, /vite\.config/i, /webpack\.config/i,
            /^README\.md$/i, /prisma\/schema/i,
            /^server\.(js|ts)$/i, /^app\.(js|ts|py)$/i, /^index\.(js|ts|jsx|tsx)$/i, /^main\.(js|ts|py|go)$/i,
            /^src\/app/i, /^src\/index/i, /^src\/main/i,
        ];

        const medPriority = [
            /routes?\//i, /middleware/i, /config\//i, /\.yaml$/i, /\.yml$/i,
            /models?\//i, /controllers?\//i, /services?\//i, /utils?\//i,
        ];

        // Skip patterns
        const skipPatterns = [
            /node_modules/i, /\.git\//i, /dist\//i, /build\//i, /\.next\//i,
            /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|mp3|zip|lock)$/i,
            /package-lock\.json$/i, /yarn\.lock$/i, /\.min\.(js|css)$/i,
        ];

        const filesToFetch = [];
        const skippedPaths = allPaths.filter(p => !skipPatterns.some(s => s.test(p)));

        // High priority first
        for (const path of skippedPaths) {
            if (filesToFetch.length >= Math.ceil(maxFiles * 0.6)) break;
            if (highPriority.some(p => p.test(path))) {
                filesToFetch.push(path);
            }
        }

        // Medium priority
        for (const path of skippedPaths) {
            if (filesToFetch.length >= Math.ceil(maxFiles * 0.8)) break;
            if (filesToFetch.includes(path)) continue;
            if (medPriority.some(p => p.test(path))) {
                filesToFetch.push(path);
            }
        }

        // Fill remaining with source files
        const sourceExts = [/\.(js|ts|jsx|tsx|py|go|rs|java|rb)$/i];
        for (const path of skippedPaths) {
            if (filesToFetch.length >= maxFiles) break;
            if (filesToFetch.includes(path)) continue;
            if (sourceExts.some(p => p.test(path))) {
                filesToFetch.push(path);
            }
        }

        // 3. Fetch file contents from GitHub (in parallel, max 25 files)
        const fileContents = await Promise.all(
            filesToFetch.map(async (path) => {
                try {
                    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                        headers: githubHeaders
                    });
                    if (!fileRes.ok) return { name: path, content: '[Could not fetch]' };
                    const fileData = await fileRes.json();

                    // GitHub returns base64 encoded content
                    if (fileData.content && fileData.encoding === 'base64') {
                        const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
                        // Truncate based on model limits
                        const truncated = decoded.split('\n').slice(0, maxLines).join('\n');
                        return { name: path, content: truncated };
                    }
                    return { name: path, content: '[Binary or empty file]' };
                } catch {
                    return { name: path, content: '[Fetch error]' };
                }
            })
        );

        console.log(`📂 Fetched ${fileContents.length} files from ${owner}/${repo} (total ${allPaths.length} in repo) using ${model || 'default'}`);

        // 4. Build the tree summary
        const treeStr = skippedPaths.slice(0, maxTreeLines).join('\n');

        const systemPrompt = `You are a senior cloud architect, security expert, and DevOps consultant analyzing a GitHub repository.

Analyze the project structure and source code. Be SPECIFIC — reference actual file names and patterns.

Return ONLY a valid JSON object (no markdown, no backticks):
{
  "summary": "2-3 sentence overview of what this project is",
  "detected_stack": ["tech1", "tech2", "tech3"],
  "cost": {
    "monthly_estimate": "$XX - $XX/month",
    "breakdown": [
      { "service": "name", "provider": "AWS/GCP/Vercel/Railway/etc", "cost": "$X/mo", "note": "why" }
    ],
    "free_tier_possible": true/false,
    "annual_estimate": "$XXX - $XXX/year",
    "tip": "biggest cost saving tip"
  },
  "security": {
    "score": "A/B/C/D",
    "strengths": ["specific good things"],
    "vulnerabilities": ["specific issues found in code"],
    "critical_fixes": ["must-fix now"],
    "recommendations": ["nice-to-have"]
  },
  "scalability": {
    "score": "A/B/C/D",
    "max_concurrent_users": "range like 1K-5K",
    "bottlenecks": ["specific bottlenecks"],
    "improvements": ["what to add"]
  },
  "architecture": {
    "pattern": "monolith/microservices/serverless/etc",
    "strengths": ["good decisions"],
    "weaknesses": ["problems"],
    "missing_components": ["what to add"],
    "production_checklist": ["step1", "step2", "step3", "step4", "step5"]
  },
  "code_quality": {
    "score": "A/B/C/D",
    "issues": ["specific code issues"],
    "suggestions": ["improvements"]
  }
}

Use real cloud provider pricing (India region). Be honest about vulns.`;

        const userPrompt = `GitHub Repo: https://github.com/${owner}/${repo}

FILE TREE (${allPaths.length} total files, showing ${skippedPaths.slice(0, 80).length}):
${treeStr}

KEY FILES (${fileContents.length} analyzed):
${fileContents.map(f => `\n--- ${f.name} ---\n${f.content}`).join('\n')}`;

        const raw = await callLLM(systemPrompt, userPrompt, 4000, 2, model);

        let analysis;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (parseErr) {
            console.warn('⚠️ Repo analysis JSON parse failed');
            analysis = { summary: raw, cost: null, security: null, scalability: null, architecture: null, code_quality: null };
        }

        // Add repo info
        analysis.repo_url = `https://github.com/${owner}/${repo}`;
        analysis.files_analyzed = fileContents.length;
        analysis.total_files = allPaths.length;

        res.json(analysis);
    } catch (err) {
        console.error('❌ Repo analysis error:', err.message);
        res.status(500).json({ error: 'Repo analysis failed', details: err.message });
    }
});

module.exports = router;

