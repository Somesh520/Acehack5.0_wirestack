const fs = require('fs');
const path = require('path');

const aiRoutesPath = path.join(__dirname, 'routes', 'aiRoutes.js');
let code = fs.readFileSync(aiRoutesPath, 'utf8');

// Find the start and end of the function we want to replace
const startMarker = 'async function generateFrontendFilesWithLLM(idea, stack, onProgress) {';
const endMarker = 'const SYSTEM_PROMPT = `You are';

const strat = code.indexOf(startMarker);
const end = code.indexOf(endMarker, strat);

if (strat === -1 || end === -1) {
    console.error('Could not find target function markers in aiRoutes.js');
    process.exit(1);
}

// Construct the replacement function body with Smooth Progress logic
const repLines = [
    'async function generateFrontendFilesWithLLM(idea, stack, onProgress) {',
    '    const stackText = String(stack || "React + Vite");',
    '    onProgress?.(20);',
    '    let currentProgress = 20;',
    '',
    '    // Smooth Progress Engine: Keep the bar moving while LLM works',
    '    const progressInterval = setInterval(() => {',
    '        if (currentProgress < 68) {',
    '            currentProgress += 1;',
    '            onProgress?.(currentProgress);',
    '        }',
    '    }, 2500);',
    '',
    '    try {',
    '        const systemPrompt = "You are an expert Frontend React Developer specializing in Neo-Brutalism design. You output complete, production-ready code. Output ONLY valid markdown blocks. NO conversation.";',
    '        const userPrompt = `Build a fully functional React application based on the following idea:',
    'IDEA: ${idea}',
    'TECH STACK: ${stackText} (Use React)',
    '',
    'Design Requirements (CRITICAL):',
    '- Use a stunning Neo-Brutalism design (thick black borders, bold high-contrast colors, offset shadows, large typography).',
    '- Make it look fully polished, like a premium modern Saas.',
    '- Use Unsplash random images for placeholders (e.g. https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400)',
    '',
    'I need EXACTLY TWO markdown code blocks from you. Do not output anything else.',
    '',
    'Block 1: \\`\\`\\`jsx',
    '- A complete React component (App.jsx) handling the full UI.',
    "- CRITICAL: Use 'lucide-react' for icons. NEVER use prefixes like Hi, Fa, or Md.",
    "- CRITICAL: DO NOT import any external libraries like swiper, react-icons, framer-motion. Only 'react' and 'lucide-react'.",
    '- Build out ALL necessary sub-components within this same single file.',
    '',
    'Block 2: \\`\\`\\`css',
    '- A complete CSS file (index.css) containing the Neo-Brutalist styles. Include base resets, thick borders, box-shadows (4px 4px 0px #000), font imports, etc.',
    '- CRITICAL: Write pure, custom CSS classes. DO NOT use Tailwind CSS classes.`;',
    '',
    "        console.log('[LATENCY FIX] Generating neo-brutalism frontend with smooth progress...');",
    "        const out = await callLLM(systemPrompt, userPrompt, 8192, 1);",
    '        ',
    '        clearInterval(progressInterval);',
    '        onProgress?.(70);',
    '',
    '        const extractCodeBlock = (text, lang) => {',
    '            const regex = new RegExp("`{3}(?:" + lang + ")?\\\\s*([\\\\s\\\\S]*?)`{3}", "i");',
    '            const match = text.match(regex);',
    '            return match ? match[1].trim() : "";',
    '        };',
    '',
    "        let appJsx = extractCodeBlock(out, 'jsx');",
    "        let css = extractCodeBlock(out, 'css');",
    '',
    "        if (!appJsx && out.includes('import')) {",
    "            const parts = out.split('```');",
    "            const jsxPart = parts.find(p => p.includes('export default function ') || p.includes('import React'));",
    "            if (jsxPart) appJsx = jsxPart.replace(/^jsx/, '').trim();",
    '        }',
    "        if (!css && (out.includes('body {') || out.includes('.container'))) {",
    "            const parts = out.split('```');",
    "            const cssPart = parts.find(p => p.includes('body {') || p.includes('.container'));",
    "            if (cssPart) css = cssPart.replace(/^css/, '').trim();",
    '        }',
    '',
    "        if (appJsx) appJsx = appJsx.replace(/(?:Hi|Fa|Md)([A-Z][a-z]+)/g, '$1');",
    '',
    '        appJsx = appJsx || "import React from \\"react\\";\\\\nexport default function App() { return <h1>Failed LLM Output. Check Logs.</h1>; }";',
    '        css = css || "body { font-family: \\"Space Grotesk\\", sans-serif; background: #eee; margin:20px; }\\\\n";',
    '',
    '        onProgress?.(85);',
    '',
    '        return [',
    '            {',
    "                name: 'package.json',",
    '                content: JSON.stringify({',
    "                    name: 'neo-brutalism-app', private: true, version: '1.0.0', type: 'module',",
    "                    scripts: { dev: 'vite --host 0.0.0.0 --port 3000', build: 'vite build', preview: 'vite preview --host 0.0.0.0 --port 3000' },",
    "                    dependencies: { 'react': '^18.3.1', 'react-dom': '^18.3.1', 'lucide-react': '^0.292.0', 'vite': '^5.4.10', '@vitejs/plugin-react': '^4.3.2' },",
    '                    devDependencies: {}',
    '                }, null, 2)',
    '            },',
    '            {',
    "                name: 'index.html',",
    "                content: `<!doctype html><html><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/><title>\\${idea.substring(0,20)}</title><link href=\"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap\" rel=\"stylesheet\"></head><body style=\"margin:0;\"><div id=\"root\"></div><script type=\"module\" src=\"/src/main.jsx\"></script></body></html>`",
    '            },',
    '            {',
    "                name: 'vite.config.js',",
    "                content: \"import { defineConfig } from 'vite';\\\\nimport react from '@vitejs/plugin-react';\\\\nexport default defineConfig({ plugins: [react()] });\\\\n\"",
    '        },',
    '        {',
    "            name: 'src/main.jsx',",
    "            content: \"import React from 'react';\\\\nimport { createRoot } from 'react-dom/client';\\\\nimport App from './App.jsx';\\\\nimport './index.css';\\\\ncreateRoot(document.getElementById('root')).render(<App />);\\\\n\"",
    '        },',
    "        { name: 'src/App.jsx', content: appJsx },",
    "        { name: 'src/index.css', content: css }",
    '    ];',
    '    } finally {',
    '        clearInterval(progressInterval);',
    '    }',
    '}',
    ''
];

const rep = repLines.join('\n');
code = code.substring(0, strat) + rep + code.substring(end);

// Restore the necessary escapes in the SYSTEM_PROMPT (same as before)
code = code.replace(/- Use `box-shadow/g, '- Use \\`box-shadow');
code = code.replace(/Borders must be `2px/g, 'Borders must be \\`2px');
code = code.replace(/thick black borders: `border/g, 'thick black borders: \\`border');
code = code.replace(/Hard, unblurred shadows: `box-shadow/g, 'Hard, unblurred shadows: \\`box-shadow');
code = code.replace(/active states \(e.g., `transform/g, 'active states (e.g., \\`transform');

fs.writeFileSync(aiRoutesPath, code);
console.log('Successfully patched aiRoutes.js with Smooth Progress logic');
