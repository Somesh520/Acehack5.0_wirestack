const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
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

// Helper: call Gemini or Groq with a given system prompt + user message
async function callLLM(systemPrompt, userMessage, maxTokens = 4000) {
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
            console.warn('⚠️ Gemini failed, falling back to Groq:', err.message);
        }
    }

    // ENGINE 2: Groq fallback
    if (process.env.GROQ_API_KEY) {
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
    }

    throw new Error('No AI providers available');
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

    const systemPrompt = `You are a senior software architect. Given a project idea and tech stack, return ONLY a JSON array of files needed to build the project. Each entry has "name" (filename) and "purpose" (1-line description).

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

    const isHtml = fileName.endsWith('.html');
    const isJson = fileName.endsWith('.json');
    const isDocker = fileName === 'Dockerfile' || fileName === 'docker-compose.yml';
    const isServerConfig = fileName === 'server.js' || fileName === 'package.json';

    let contextBlock = '';
    if (existingFiles.length > 0) {
        contextBlock = '\n\nFiles already generated (reference them for consistency):\n' +
            existingFiles.map(f => `--- ${f.name} ---\n${f.content?.substring(0, 300)}...`).join('\n\n');
    }

    const systemPrompt = `You are an expert senior software engineer writing production-ready code.

RULES:
1. Return ONLY the file content. No markdown backticks, no explanations, no conversation.
2. Write REAL, working, professional code that would impress hackathon judges.
3. The code should be for: "${idea}" using stack: ${stack}.
${isHtml ? `4. This is the MAIN DEMO FILE. You must create a FULLY FUNCTIONAL, INTERACTIVE single-page application using:
   - Tailwind CDN (https://cdn.tailwindcss.com) for styling
   - Vanilla JavaScript for ALL interactivity
   
   THIS MUST BE A WORKING APP, NOT JUST A LANDING PAGE. Include ALL of these:
   
   A) SIMULATED BACKEND (JavaScript mock API):
      - Create a MockAPI object that simulates REST endpoints using localStorage
      - Pre-populate localStorage with 8-12 realistic dummy data items on first load
      - Support CRUD operations (Create, Read, Update, Delete)
      - Example: MockAPI.getProducts(), MockAPI.addToCart(), MockAPI.login()
   
   B) WORKING FEATURES (must actually work when clicked):
      - Authentication: Login/Signup modal with form validation, stores user in localStorage
      - Data Display: Dynamically render items from the mock database
      - Search & Filter: Real-time search bar that filters displayed items
      - CRUD Actions: Add/edit/delete items with immediate UI updates
      - Cart/Selection: If e-commerce, full add-to-cart with quantity, total price calculation
      - Notifications: Toast notifications on actions (added to cart, logged in, etc.)
   
   C) PREMIUM UI/UX:
      - Dark gradient background (slate-900 to indigo-950)
      - Glass-morphism cards with backdrop-blur
      - Smooth CSS transitions and hover animations
      - Responsive grid layout (mobile-friendly)
      - Professional navigation bar with logo, search, and user menu
      - Footer with links
      - Loading skeleton animations
      - At least 300 lines of well-structured code
   
   D) INTERACTIVITY:
      - Modal dialogs that open/close
      - Tab switching between views
      - Dynamic counters (cart badge, notification count)
      - Form submissions that actually save data
      - State management using a simple JavaScript store pattern
   
   The goal is that a hackathon judge can click through this preview and see a REAL, WORKING application.` : ''}
${isJson ? '4. Return valid JSON only.' : ''}
${isDocker ? `4. Write clean, reliable Docker configurations.
   - For Dockerfile: Use Node 18+ Alpine, set WORKDIR to /app, copy package.json, run npm install, copy source, expose the correct port (usually 3000 or 8080), and run the server.
   - For docker-compose.yml: Expose the backend port (e.g., "3000:3000" or "8080:8080"). If MongoDB is used in the stack, add a 'mongo' service and pass MONGO_URI to the backend.` : ''}
${isServerConfig ? `4. Write robust server configuration.
   - For server.js: Ensure it serves index.html statically using express.static if it exists. Example: \`app.use(express.static(__dirname)); app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));\`
   - For package.json: Ensure "scripts": {"start": "node server.js"} is present.` : ''}
${!isHtml && !isJson && !isDocker && !isServerConfig ? '4. Write clean, well-commented code with proper error handling.' : ''}`;

    const userMessage = `Generate the file: "${fileName}"
Purpose: ${filePurpose}
${contextBlock}

Return ONLY the raw file content, nothing else.`;

    try {
        const tokens = isHtml ? 8000 : 4000;
        let content = await callLLM(systemPrompt, userMessage, tokens);

        // Strip any markdown code fences the LLM might have added
        content = content.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();

        res.json({ name: fileName, content });
    } catch (err) {
        console.error(`❌ File generation error (${fileName}):`, err.message);
        res.status(500).json({ error: `Failed to generate ${fileName}`, details: err.message });
    }
});

module.exports = router;
