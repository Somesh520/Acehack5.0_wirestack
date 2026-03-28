const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const OpenAI = require('openai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const openai = process.env.NVIDIA_API_KEY
    ? new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' })
    : null;
const OLLAMA_ENABLED = false; // Ollama disabled as per request
const VERBOSE_AI_LOGS = process.env.VERBOSE_AI_LOGS === 'true';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout(promise, ms, label) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function callLLM(systemPrompt, userMessage, maxTokens = 4000, retries = 2, preferredModel = null) {
    const cloudModels = [
        { provider: 'groq', modelId: 'llama-3.3-70b-versatile', engineName: 'Groq (Llama 3.3 70B)' },
        { provider: 'groq', modelId: 'llama-3.1-8b-instant', engineName: 'Groq (Llama 3.1 8B)' },
        { provider: 'nvidia', modelId: 'minimaxai/minimax-m2.5', engineName: 'NVIDIA (Minimax M2.5)' },
        { provider: 'gemini', modelId: 'gemini-2.5-flash', engineName: 'Gemini (2.5 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-flash', engineName: 'Gemini (1.5 Flash)' },
        { provider: 'gemini', modelId: 'gemini-1.5-pro', engineName: 'Gemini (1.5 Pro)' }
    ];

    const modelsToTry = cloudModels;

    console.log(`🧠 AI REQUEST | Mode: ${preferredModel || 'AUTO'} | Providers: ${modelsToTry.map(m => m.provider).join(' -> ')}`);

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        for (const modelOpt of modelsToTry) {
            if (preferredModel && preferredModel !== modelOpt.provider) continue;

            try {
                if (VERBOSE_AI_LOGS) {
                    console.log(`🤖 Trying ${modelOpt.engineName} (attempt ${attempt}/${retries})`);
                }
                if (modelOpt.provider === 'nvidia' && openai) {
                    const completion = await withTimeout(openai.chat.completions.create({
                        model: modelOpt.modelId,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        temperature: 0.7,
                        max_tokens: Math.min(maxTokens, 4000), // Minimax allows larger responses
                    }), 60000, modelOpt.engineName);
                    const reply = completion.choices[0]?.message?.content;
                    if (reply) return reply;

                } else if (modelOpt.provider === 'groq' && process.env.GROQ_API_KEY) {
                    const chatCompletion = await withTimeout(groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        model: modelOpt.modelId,
                        temperature: 0.7,
                        // Not explicitly setting max_tokens to a huge number for Groq to prevent TPM overallocation on the free tier
                        max_tokens: Math.min(maxTokens, 1500),
                    }), 60000, modelOpt.engineName);
                    const reply = chatCompletion.choices[0]?.message?.content;
                    if (reply) return reply;

                } else if (modelOpt.provider === 'gemini' && process.env.GEMINI_API_KEY) {
                    const model = genAI.getGenerativeModel({
                        model: modelOpt.modelId,
                        systemInstruction: systemPrompt,
                        generationConfig: { maxOutputTokens: maxTokens },
                    });

                    const result = await withTimeout(model.generateContent(userMessage), 60000, modelOpt.engineName);
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
                    if (VERBOSE_AI_LOGS) {
                        console.log(`🐌 Rate Limited! Enforcing mandatory ${waitSeconds.toFixed(1)}s cooldown...`);
                    }
                    await sleep(waitSeconds * 1000);
                }
            }
        }

        if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            if (VERBOSE_AI_LOGS) {
                console.log(`⏳ Retrying all models in ${delay / 1000}s...`);
            }
            await sleep(delay);
        }
    }

    throw lastError || new Error('No AI providers available after trying all fallbacks');
}

module.exports = {
    callLLM,
    sleep,
};
