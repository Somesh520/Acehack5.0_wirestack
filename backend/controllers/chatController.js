/**
 * Chat controller — handles the AI chat conversation endpoint.
 * @module controllers/chatController
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { callLLM } = require('../utils/aiUtils');
const { extractThoughtProcess } = require('../utils/llmResponseParser');

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const SYSTEM_PROMPT = `You are **WireStack Agent** — an intelligent AI architect that helps non-technical users build their dream app! 🚀

You are like a game master guiding players through a skill tree. Your job is to:
1. Listen to the user's app idea and understand their vision.
2. Design an industry-standard architecture based on their input.
3. Break it down into 4-6 LEVELS (Frontend, Backend, Database, Auth, Payment, Cache, etc.).
4. For each level, suggest the **BEST PRACTICE** (Industry Standard) and provide **3-5 ALTERNATIVES** to give them a real choice.
5. Use highly descriptive names and reasons that explain the "WHY" to a non-technical person.

Output your system design in this format:
\`\`\`system_design
[
  {
    "id": "frontend",
    "category": "frontend",
    "title": "Frontend (Interface)",
    "best_practice": { "id": "react", "name": "React (Modern Web)", "reason": "Fast, modular, and the most popular choice for web apps today." },
    "alternatives": [
      { "id": "vue", "name": "Vue.js", "reason": "Very easy to learn and great for rapid prototyping." },
      { "id": "nextjs", "name": "Next.js", "reason": "Superior for search engine visibility and performance." },
      { "id": "svelte", "name": "Svelte", "reason": "Blazing fast with much smaller code footprint." }
    ]
  },
  {
    "id": "backend",
    "category": "backend",
    "title": "Backend (The Brain)",
    "best_practice": { "id": "express", "name": "Express.js", "reason": "Standard for JavaScript backends; fits perfectly with React." },
    "alternatives": [
      { "id": "nestjs", "name": "NestJS", "reason": "Organized like LEGOs; best for large, complex systems." },
      { "id": "python-fastapi", "name": "FastAPI (AI & Speed)", "reason": "Top choice if you want to integrate Python-based AI later." },
      { "id": "go-fiber", "name": "Go Fiber", "reason": "Extreme performance for massive scale." }
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

const THOUGHT_SUFFIX = '\n\nCRITICAL: Before providing your final response, you MUST think step-by-step. Wrap your internal thought process inside <thought>...</thought> tags. Then provide your final response to the user.';

function buildModelList() {
    let models = [
        { provider: 'groq', modelId: 'llama-3.3-70b-versatile', engineName: 'Groq (Llama 3.3 70B)' },
        { provider: 'groq', modelId: 'llama-3.1-8b-instant', engineName: 'Groq (Llama 3.1 8B)' },
        { provider: 'nvidia', modelId: 'minimaxai/minimax-m2.5', engineName: 'NVIDIA (Minimax M2.5)' },
        { provider: 'gemini', modelId: 'gemini-2.0-flash', engineName: 'Gemini (2.0 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-flash', engineName: 'Gemini (1.5 Flash)' }
    ];

    return { models };
}

/**
 * Sanitize Gemini chat history to strict alternating user/model roles.
 * @param {Array} history - Raw chat history
 * @returns {Array} Sanitized history for Gemini
 */
function sanitizeGeminiHistory(history) {
    const formatted = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const sanitized = [];
    let expectedRole = 'user';
    for (const msg of formatted) {
        if (msg.role === expectedRole) {
            sanitized.push(msg);
            expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
    }
    return sanitized;
}

/**
 * Try a single provider and return the formatted response.
 * @returns {{ reply: string, thoughtProcess: string, engine: string } | null}
 */
async function tryProvider(attempt, message, history) {
    const systemWithThought = SYSTEM_PROMPT + THOUGHT_SUFFIX;

    if (attempt.provider === 'groq' && process.env.GROQ_API_KEY) {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...history.slice(-10),
                { role: 'user', content: message }
            ],
            model: attempt.modelId,
            temperature: 0.7,
            max_tokens: 8000,
        });
        const reply = chatCompletion.choices[0]?.message?.content;
        if (reply) {
            const { cleanReply, thoughtProcess } = extractThoughtProcess(reply, attempt.engineName);
            return { reply: cleanReply, thoughtProcess, engine: attempt.provider };
        }

    } else if (attempt.provider === 'gemini' && process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({
            model: attempt.modelId,
            systemInstruction: systemWithThought,
        });
        const geminiHistory = sanitizeGeminiHistory(history);
        const chat = model.startChat({
            history: geminiHistory,
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
        });
        const result = await chat.sendMessage([{ text: message }]);
        const reply = result.response.text();
        if (reply) {
            const { cleanReply, thoughtProcess } = extractThoughtProcess(reply, attempt.engineName);
            return { reply: cleanReply, thoughtProcess, engine: 'Gemini' };
        }

    } else if (attempt.provider === 'nvidia' && process.env.NVIDIA_API_KEY) {
        const { OpenAI } = require('openai');
        const nvidiaClient = new OpenAI({
            apiKey: process.env.NVIDIA_API_KEY,
            baseURL: 'https://integrate.api.nvidia.com/v1',
        });
        const completion = await nvidiaClient.chat.completions.create({
            model: attempt.modelId,
            messages: [
                { role: 'system', content: systemWithThought },
                ...history.slice(-10),
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 4000,
        });
        const reply = completion.choices[0]?.message?.content;
        if (reply) {
            const { cleanReply, thoughtProcess } = extractThoughtProcess(reply, attempt.engineName);
            return { reply: cleanReply, thoughtProcess, engine: 'NVIDIA' };
        }
    }

    return null;
}

/**
 * Handle POST /api/ai/chat
 */
async function handleChat(req, res) {
    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const { models } = buildModelList();
    let lastError = null;

    for (const attempt of models) {
        console.log(`🤖 Attempting to generate response using: ${attempt.engineName}...`);
        try {
            const result = await tryProvider(attempt, message, history, null);
            if (result) return res.json(result);
        } catch (err) {
            console.warn(`⚠️ ${attempt.engineName} failed:`, err.message);
            lastError = err;
        }
    }

    console.error('❌ ALL AI MODELS FAILED:', lastError);
    return res.status(500).json({
        error: 'AI service completely unavailable after trying all fallbacks.',
        details: lastError?.message
    });
}

module.exports = { handleChat };
