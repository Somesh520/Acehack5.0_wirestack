/**
 * Template loader — reads inline template files from disk at startup
 * and provides simple variable substitution.
 * @module utils/templateLoader
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/** Cache: template filename → content string */
const cache = new Map();

/**
 * Load a template file from the templates/ directory.
 * Caches on first read for zero-cost subsequent calls.
 *
 * @param {string} filename - Template file name (e.g. "reactApp.jsx")
 * @returns {string} Raw template content
 */
function loadTemplate(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const content = fs.readFileSync(path.join(TEMPLATES_DIR, filename), 'utf-8');
    cache.set(filename, content);
    return content;
}

/**
 * Load a template and replace `{{key}}` placeholders with provided values.
 *
 * @param {string} filename - Template file name
 * @param {Record<string, string>} vars - Key-value pairs to substitute
 * @returns {string} Rendered template
 */
function renderTemplate(filename, vars = {}) {
    let content = loadTemplate(filename);
    for (const [key, value] of Object.entries(vars)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return content;
}

module.exports = { loadTemplate, renderTemplate };
