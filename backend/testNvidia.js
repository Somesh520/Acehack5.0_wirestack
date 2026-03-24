require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function main() {
    console.log("Testing NVIDIA...");
    try {
        const completion = await openai.chat.completions.create({
            model: "minimaxai/minimax-m2.5",
            messages: [{ "content": "Write a 5 line python script", "role": "user" }],
            temperature: 0.7,
            max_tokens: 100,
        });
        console.log("SUCCESS:", completion.choices[0]?.message?.content);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
main();
