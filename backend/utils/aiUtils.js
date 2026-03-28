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
const providerCooldownUntilGlobal = new Map(); // provider -> epoch ms (persists for process lifetime)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isRateLimitError(err) {
    const msg = String(err?.message || '').toLowerCase();
    return err?.status === 429 || msg.includes('rate limit') || msg.includes('rate_limit_exceeded');
}

function isHardQuotaError(err) {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('tokens per day') || msg.includes('quota') || msg.includes('service tier');
}

function parseRetryAfterSeconds(errMessage) {
    const message = String(errMessage || '').toLowerCase();

    // Handles patterns like "try again in 5h33m3.456s"
    const hmsMatch = message.match(/try again in\s*((?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?)/i);
    if (hmsMatch && hmsMatch[1]) {
        const chunk = hmsMatch[1];
        const hours = Number((chunk.match(/(\d+(?:\.\d+)?)h/) || [])[1] || 0);
        const mins = Number((chunk.match(/(\d+(?:\.\d+)?)m/) || [])[1] || 0);
        const secs = Number((chunk.match(/(\d+(?:\.\d+)?)s/) || [])[1] || 0);
        const total = Math.round((hours * 3600) + (mins * 60) + secs);
        if (total > 0) return total;
    }

    // Handles patterns like "try again in 12.5s"
    const secMatch = message.match(/try again in\s*([\d\.]+)s/i);
    if (secMatch && secMatch[1]) {
        return Math.ceil(Number(secMatch[1]));
    }

    return null;
}

function getProviderCooldownRemaining(provider) {
    const until = providerCooldownUntilGlobal.get(provider) || 0;
    const remainingMs = until - Date.now();
    return remainingMs > 0 ? remainingMs : 0;
}

function setProviderCooldown(provider, seconds) {
    if (!provider || !seconds || seconds <= 0) return;
    const nextUntil = Date.now() + (seconds * 1000);
    const current = providerCooldownUntilGlobal.get(provider) || 0;
    providerCooldownUntilGlobal.set(provider, Math.max(current, nextUntil));
}

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

    const modelsToTry = cloudModels.filter((modelOpt) => {
        if (modelOpt.provider === 'groq') return Boolean(process.env.GROQ_API_KEY && groq);
        if (modelOpt.provider === 'nvidia') return Boolean(process.env.NVIDIA_API_KEY && openai);
        if (modelOpt.provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
        return false;
    });

    if (modelsToTry.length === 0) {
        throw new Error('No AI providers configured (missing GROQ/NVIDIA/GEMINI keys)');
    }

    console.log(`🧠 AI REQUEST | Mode: ${preferredModel || 'AUTO'} | Providers: ${modelsToTry.map(m => `${m.provider}:${m.modelId}`).join(' -> ')}`);

    let lastError = null;
    const providerCooldownUntil = new Map(); // provider -> epoch ms

    for (let attempt = 1; attempt <= retries; attempt++) {
        for (const modelOpt of modelsToTry) {
            if (preferredModel && preferredModel !== modelOpt.provider) continue;

            const globalCooldownRemaining = getProviderCooldownRemaining(modelOpt.provider);
            if (globalCooldownRemaining > 0) {
                if (VERBOSE_AI_LOGS) {
                    const remainingSec = Math.ceil(globalCooldownRemaining / 1000);
                    console.log(`⏭️ Skipping ${modelOpt.engineName} due to global cooldown (${remainingSec}s remaining)`);
                }
                continue;
            }

            const cooldownUntil = providerCooldownUntil.get(modelOpt.provider) || 0;
            if (Date.now() < cooldownUntil) {
                if (VERBOSE_AI_LOGS) {
                    const remainingSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
                    console.log(`⏭️ Skipping ${modelOpt.engineName} due to cooldown (${remainingSec}s remaining)`);
                }
                continue;
            }

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

                // Handle rate limits: short waits sleep; hard quotas get provider cooldown for this request.
                if (isRateLimitError(err)) {
                    const parsedWait = parseRetryAfterSeconds(err.message);
                    const waitSeconds = parsedWait || 12;
                    const shouldCooldownProvider = isHardQuotaError(err) || waitSeconds > 90;

                    if (shouldCooldownProvider) {
                        providerCooldownUntil.set(modelOpt.provider, Date.now() + (waitSeconds * 1000));
                        setProviderCooldown(modelOpt.provider, waitSeconds);
                        if (VERBOSE_AI_LOGS) {
                            console.log(`🚫 ${modelOpt.provider} cooled down for ~${waitSeconds}s due to quota/rate-limit. Trying next provider.`);
                        }
                        continue;
                    }

                    if (VERBOSE_AI_LOGS) {
                        console.log(`🐌 Temporary rate limit on ${modelOpt.provider}. Waiting ${waitSeconds}s before continuing...`);
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
