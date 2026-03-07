const express = require('express');
const Groq = require('groq-sdk');
const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `You are WireStack AI — a fun, energetic assistant that helps non-technical users plan their web application.

Your job:
1. Listen to the user's app idea (e.g., "I want an e-commerce website")
2. Suggest a tech stack using ONLY these components: Express Server, MongoDB, React Frontend, Google Auth, Stripe Pay
3. Explain each suggested component in 1-2 fun lines
4. Be encouraging and gamified — use emojis, celebrate progress!

Format your component suggestions as a JSON array inside a code block like this:
\`\`\`components
[{"id":"express","reason":"Your app's brain 🧠"},{"id":"mongodb","reason":"Where all your data lives 📦"},{"id":"react","reason":"The pretty face of your app 🎨"}]
\`\`\`

Keep responses SHORT (max 3-4 sentences + component block). Be conversational and fun!`;

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
            max_tokens: 500,
        });

        const reply = chatCompletion.choices[0]?.message?.content || 'Hmm, I got confused. Try again!';

        res.json({ reply });
    } catch (err) {
        console.error('❌ Groq AI Error:', err.message);
        res.status(500).json({ error: 'AI service unavailable' });
    }
});

module.exports = router;
