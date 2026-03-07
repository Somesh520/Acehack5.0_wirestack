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
async function callLLM(systemPrompt, userMessage) {
    // ENGINE 1: Gemini
    if (process.env.GEMINI_API_KEY) {
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction: systemPrompt,
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
            max_tokens: 4000,
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
2. Include 5-8 files maximum.
3. ALWAYS include "index.html" as the LAST file — this is a beautiful Tailwind CSS frontend preview.
4. ALWAYS include "package.json" as the FIRST file.
5. Include files relevant to the chosen stack (e.g., server.js for Express, db.js for MongoDB, auth.js for Auth).
6. File names should be flat (no folders), just filenames.

Example output:
[{"name":"package.json","purpose":"Project dependencies and scripts"},{"name":"server.js","purpose":"Express API server with routes"},{"name":"index.html","purpose":"Beautiful Tailwind frontend preview"}]`;

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
${isHtml ? `4. This is the frontend preview file. Create a STUNNING, fully functional single-page HTML using Tailwind CDN (https://cdn.tailwindcss.com). Include:
   - Beautiful gradient backgrounds and modern typography
   - Responsive layout with navigation, hero section, feature cards
   - Interactive elements with JavaScript (modals, tabs, cart functionality for e-commerce, etc.)
   - Dummy data that makes the preview look REAL and ALIVE
   - Dark/light theme with premium feel
   - At least 150 lines of well-structured code` : ''}
${isJson ? '4. Return valid JSON only.' : ''}
${!isHtml && !isJson ? '4. Write clean, well-commented code with proper error handling.' : ''}`;

    const userMessage = `Generate the file: "${fileName}"
Purpose: ${filePurpose}
${contextBlock}

Return ONLY the raw file content, nothing else.`;

    try {
        let content = await callLLM(systemPrompt, userMessage);

        // Strip any markdown code fences the LLM might have added
        content = content.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();

        res.json({ name: fileName, content });
    } catch (err) {
        console.error(`❌ File generation error (${fileName}):`, err.message);
        res.status(500).json({ error: `Failed to generate ${fileName}`, details: err.message });
    }
});

module.exports = router;
