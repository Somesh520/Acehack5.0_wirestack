const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const OpenAI = require('openai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({
    apiKey: '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',
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callLLM(systemPrompt, userMessage, maxTokens = 4000, retries = 2, preferredModel = null) {
    const modelsToTry = [
        { provider: 'nvidia', modelId: 'minimaxai/minimax-m2.5', engineName: 'NVIDIA (Minimax M2.5)' },
        { provider: 'groq', modelId: 'llama-3.3-70b-versatile', engineName: 'Groq (Llama 3.3 70B)' },
        { provider: 'groq', modelId: 'llama-3.1-8b-instant', engineName: 'Groq (Llama 3.1 8B)' },
        { provider: 'gemini', modelId: 'gemini-2.5-flash', engineName: 'Gemini (2.5 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-flash', engineName: 'Gemini (1.5 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-pro', engineName: 'Gemini (1.5 Pro)' }
    ];

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        for (const modelOpt of modelsToTry) {
            if (preferredModel && preferredModel !== modelOpt.provider) continue;

            try {
                if (modelOpt.provider === 'nvidia') {
                    const completion = await openai.chat.completions.create({
                        model: modelOpt.modelId,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        temperature: 0.7,
                        max_tokens: Math.min(maxTokens, 4000), // Minimax allows larger responses
                    });
                    const reply = completion.choices[0]?.message?.content;
                    if (reply) return reply;

                } else if (modelOpt.provider === 'groq' && process.env.GROQ_API_KEY) {
                    const chatCompletion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        model: modelOpt.modelId,
                        temperature: 0.7,
                        // Not explicitly setting max_tokens to a huge number for Groq to prevent TPM overallocation on the free tier
                        max_tokens: Math.min(maxTokens, 1500),
                    });
                    const reply = chatCompletion.choices[0]?.message?.content;
                    if (reply) return reply;

                } else if (modelOpt.provider === 'gemini' && process.env.GEMINI_API_KEY) {
                    const model = genAI.getGenerativeModel({
                        model: modelOpt.modelId,
                        systemInstruction: systemPrompt,
                        generationConfig: { maxOutputTokens: maxTokens },
                    });

                    const result = await model.generateContent(userMessage);
                    const reply = result.response.text();
                    if (reply) return reply;
                }
            } catch (err) {
                console.warn(`⚠️ ${modelOpt.engineName} failed (attempt ${attempt}/${retries}):`, err.message);
                lastError = err;

                // Handle Groq/Gemini Rate Limits gracefully
                if (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit'))) {
                    let waitSeconds = 12; // default wait
                    const match = err.message.match(/try again in ([\d\.]+)s/i);
                    if (match && match[1]) {
                        waitSeconds = parseFloat(match[1]) + 1; // Parse exact wait time and add 1s buffer
                    }
                    console.log(`🐌 Rate Limited! Enforcing mandatory ${waitSeconds.toFixed(1)}s cooldown...`);
                    await sleep(waitSeconds * 1000);
                }
            }
        }

        if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Retrying all models in ${delay / 1000}s...`);
            await sleep(delay);
        }
    }

    throw lastError || new Error('No AI providers available after trying all fallbacks');
}

module.exports = {
    callLLM,
    sleep,
};
