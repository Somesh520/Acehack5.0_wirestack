const express = require('express');
const Groq = require('groq-sdk');
const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

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

    try {
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: message }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 4000,
        });

        const reply = chatCompletion.choices[0]?.message?.content || 'Hmm, I got confused. Try again!';

        res.json({ reply });
    } catch (err) {
        console.error('❌ Groq AI Error:', err.message);
        res.status(500).json({ error: 'AI service unavailable' });
    }
});

module.exports = router;
