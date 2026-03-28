/**
 * Shared LLM response parsing utilities.
 * Eliminates duplicate parsing logic across AI route handlers.
 * @module utils/llmResponseParser
 */

/**
 * Extract <thought>...</thought> blocks from an LLM reply and return
 * the cleaned reply along with a formatted thought process string.
 *
 * @param {string} reply     - Raw LLM response text
 * @param {string} engineName - Human-readable engine label (e.g. "Groq (Llama 3.3 70B)")
 * @returns {{ cleanReply: string, thoughtProcess: string }}
 */
function extractThoughtProcess(reply, engineName) {
    const thoughtMatch = reply.match(/<thought>([\s\S]*?)<\/thought>/);
    const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : null;
    const cleanReply =
        reply.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim() ||
        'Hmm, I got confused. Try again!';

    const thoughtProcess = thoughtContent
        ? `[POWERED BY ${engineName}]\n\n${thoughtContent}`
        : `I'm running on ${engineName} engine.`;

    return { cleanReply, thoughtProcess };
}

/**
 * Extract a fenced code block of a given language from raw LLM text.
 * Falls back to heuristic detection if the fence header is missing.
 *
 * @param {string} text - Raw LLM output
 * @param {string} lang - Language identifier (e.g. "jsx", "css")
 * @returns {string}      Extracted code (empty string if not found)
 */
function extractCodeBlock(text, lang) {
    const regex = new RegExp('`{3}(?:' + lang + ')?\\s*([\\s\\S]*?)`{3}', 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Parse a JSON object from raw LLM text that may contain markdown, prose,
 * or fencing around the JSON. Provides a structured fallback on failure.
 *
 * @param {string} rawText       - Raw LLM response
 * @param {object} [fallbackShape] - Shape to use if parsing fails (keys get null values)
 * @returns {object}               Parsed JSON or fallback object
 */
function parseJsonFromLLM(rawText, fallbackShape = {}) {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
        console.warn('⚠️ LLM JSON parse failed, returning fallback');
        const fallback = { summary: rawText };
        for (const key of Object.keys(fallbackShape)) {
            fallback[key] = null;
        }
        return fallback;
    }
}

/**
 * Parse a JSON array from raw LLM text, handling smart-quotes
 * and trailing commas that LLMs commonly produce.
 *
 * @param {string} raw - Raw LLM output
 * @returns {Array}      Parsed array
 * @throws {Error}       If no valid JSON array can be extracted
 */
function parseJsonArrayFromText(raw = '') {
    const text = String(raw || '').trim();
    const first = text.indexOf('[');
    const last = text.lastIndexOf(']');
    if (first === -1 || last === -1 || last <= first) {
        throw new Error('Model did not return a JSON array');
    }

    const candidate = text.slice(first, last + 1);
    try {
        return JSON.parse(candidate);
    } catch {
        const normalized = candidate
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(normalized);
    }
}

/**
 * Strip markdown code fences (```lang ... ```) that LLMs sometimes wrap
 * around generated file content.
 *
 * @param {string} content - Raw generated file content
 * @returns {string}         Clean content without fences
 */
function stripMarkdownFences(content) {
    return content
        .replace(/^`{3}[\w]*\n?/gm, '')
        .replace(/`{3}\s*$/gm, '')
        .trim();
}

module.exports = {
    extractThoughtProcess,
    extractCodeBlock,
    parseJsonFromLLM,
    parseJsonArrayFromText,
    stripMarkdownFences,
};
