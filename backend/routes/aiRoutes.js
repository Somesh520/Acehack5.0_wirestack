const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const archiver = require('archiver');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are **WireStack Agent** — an intelligent AI architect that helps non-technical users build their dream app! 🚀

You are like a game master guiding players through a skill tree. Your job is to:
1. Listen to the user's app idea and understand their vision
2. Break it down into a clear MISSION with tech components
3. Explain the architecture like a roadmap — what connects to what and why
4. Use ONLY these component IDs: express, mongodb, react, auth, stripe
5. Make them feel like they're leveling up in a game! 🎮

When suggesting the tech stack, format as:
\`\`\`components
[{"id":"express","reason":"Your mission control center 🎯"},{"id":"mongodb","reason":"Your treasure chest of data 📦"},{"id":"react","reason":"The portal your users see ✨"}]
\`\`\`

Personality:
- Talk like an AI agent/architect: "I've analyzed your requirements..."
- Use mission/quest language: "Your first mission is...", "Level up with..."
- Be concise: max 3-4 sentences + component block
- After suggesting, say "Your skill tree is ready! Want to unlock more nodes?"
- Use emojis: 🎯🔓✅🗺️⚡🛡️💎`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const formattedHistoryGemini = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const formattedHistoryGroq = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10),
        { role: 'user', content: message }
    ];

    try {
        // ENGINE 1: PRIMARY (Google Gemini 1.5 Pro)
        if (process.env.GEMINI_API_KEY) {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                systemInstruction: SYSTEM_PROMPT + "\n\nCRITICAL: Before providing your final response, you MUST think step-by-step. Wrap your internal thought process inside <thought>...</thought> tags. Then provide your final response to the user.",
            });

            const chat = model.startChat({
                history: formattedHistoryGemini,
                generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
            });

            const result = await chat.sendMessage([{ text: message }]);
            let reply = result.response.text();

            // Extract thoughts and clean response for the UI
            const thoughtMatch = reply.match(/<thought>([\s\S]*?)<\/thought>/);
            const thoughtProcess = thoughtMatch ? thoughtMatch[1].trim() : null;
            const cleanReply = reply.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim() || 'Hmm, I got confused. Try again!';

            return res.json({ reply: cleanReply, thoughtProcess, engine: 'Gemini' });
        }
    } catch (err) {
        console.warn('⚠️ Gemini AI Error (Falling back to Groq):', err.message);
    }

    try {
        // ENGINE 2: FALLBACK (Groq Llama 3)
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'No AI providers available. Check API keys.' });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: formattedHistoryGroq,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 8000,
        });

        const reply = chatCompletion.choices[0]?.message?.content || 'Hmm, I got confused. Try again!';
        return res.json({ reply, thoughtProcess: "I'm running on fallback engines (Groq), so my thought logs are disabled.", engine: 'Groq' });

    } catch (err) {
        console.error('❌ Groq AI Error FULL STACK:', err);
        res.status(500).json({ error: 'AI service completely unavailable', details: err.message });
    }
});

// ============================================================
// SEQUENTIAL CODE GENERATION PIPELINE
// ============================================================

// Helper: sleep for ms milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: call Gemini or Groq with retry logic and exponential backoff
async function callLLM(systemPrompt, userMessage, maxTokens = 4000, retries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        // ENGINE 1: Gemini
        if (process.env.GEMINI_API_KEY) {
            try {
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.0-flash",
                    systemInstruction: systemPrompt,
                    generationConfig: { maxOutputTokens: maxTokens },
                });
                const result = await model.generateContent(userMessage);
                return result.response.text();
            } catch (err) {
                console.warn(`⚠️ Gemini failed (attempt ${attempt}/${retries}):`, err.message);
                lastError = err;
            }
        }

        // ENGINE 2: Groq fallback
        if (process.env.GROQ_API_KEY) {
            try {
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.7,
                    max_tokens: maxTokens,
                });
                return chatCompletion.choices[0]?.message?.content || '';
            } catch (err) {
                console.warn(`⚠️ Groq failed (attempt ${attempt}/${retries}):`, err.message);
                lastError = err;
            }
        }

        // Wait before retrying (exponential backoff: 2s, 4s, 8s)
        if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Retrying in ${delay / 1000}s...`);
            await sleep(delay);
        }
    }

    throw lastError || new Error('No AI providers available after retries');
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

module.exports = router;
