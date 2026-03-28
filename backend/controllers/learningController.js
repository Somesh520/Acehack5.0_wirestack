/**
 * Learning Controller — The Anti-Vibe-Coding AI Engine.
 * 
 * Handles the core learning flow:
 *   1. Diagnostic Test → Gauge user's knowledge level
 *   2. Vibe Check      → Review code + ask "why did you write this?"
 *   3. Verify Answer    → Grade explanation + unlock next module
 * 
 * All AI calls use the shared callLLM() utility (Ollama-first, cloud fallback).
 * All responses force strict JSON output via prompt engineering.
 * 
 * Frontend Connection Points:
 *   - User selects stack → calls generateDiagnostic
 *   - User completes diagnostic → frontend plays learning animation
 *   - User writes code → calls vibeCheck → gets question
 *   - User explains → calls verifyExplanation → module unlocks
 * 
 * @module controllers/learningController
 */

const User = require('../models/User');
const Module = require('../models/Module');
const { callLLM } = require('../utils/aiUtils');
const { parseJsonFromLLM } = require('../utils/llmResponseParser');

// --- Official Documentation Sources ---
const DOCS_MAPPING = {
    'react': 'https://react.dev/learn',
    'vue': 'https://vuejs.org/guide',
    'angular': 'https://angular.io/docs',
    'svelte': 'https://svelte.dev/docs',
    'next': 'https://nextjs.org/docs',
    'htmlcss': 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    'node': 'https://nodejs.org/docs',
    'express': 'https://expressjs.com/',
    'python': 'https://docs.python.org/3/',
    'java': 'https://docs.oracle.com/en/java/',
    'csharp': 'https://learn.microsoft.com/en-us/dotnet/csharp/',
    'go': 'https://go.dev/doc/',
    'ruby': 'https://guides.rubyonrails.org/',
    'cpp': 'https://en.cppreference.com/',
    'mern': 'https://www.mongodb.com/mern-stack',
    'mean': 'https://www.mongodb.com/mean-stack',
    'jamstack': 'https://jamstack.org/docs/',
    'reactnative': 'https://reactnative.dev/docs/getting-started',
    'flutter': 'https://docs.flutter.dev/',
    'swift': 'https://developer.apple.com/documentation/swift',
    'android': 'https://developer.android.com/docs',
    'mongodb': 'https://www.mongodb.com/docs/',
    'postgres': 'https://www.postgresql.org/docs/',
    'mysql': 'https://dev.mysql.com/doc/',
    'redis': 'https://redis.io/docs/',
    'aws': 'https://docs.aws.amazon.com/',
    'docker': 'https://docs.docker.com/',
    'kubernetes': 'https://kubernetes.io/docs/',
    'ai-ml': 'https://www.tensorflow.org/learn'
};

const getDocsUrl = (stack) => DOCS_MAPPING[stack?.toLowerCase()?.replace(/\s+/g, '')] || `Official ${stack} Documentation`;

function normalizeConceptForStack(stack, concept) {
    const raw = (concept || 'Core documentation topic').toString().trim();

    if (!stack) return raw;

    const stackKey = stack.toLowerCase();
    if (stackKey.includes('react')) {
        return raw
            .replace(/state\s+and\s+lifecycle\s+methods?/gi, 'State with useState and side effects with useEffect')
            .replace(/lifecycle\s+methods?/gi, 'useEffect lifecycle and cleanup')
            .replace(/class\s+components?/gi, 'function components with hooks')
            .trim();
    }

    return raw;
}

function toTopicTitle(concept, fallback) {
    const source = (concept || fallback || 'MODULE').toString().trim();
    const cleaned = source
        .replace(/[_-]+/g, ' ')
        .replace(/^how\s+to\s+/i, '')
        .replace(/^(using|understanding|mastering|building|implementing|exploring)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    const stopWords = new Set(['A', 'AN', 'THE', 'FOR', 'AND', 'WITH', 'IN', 'TO', 'OF', 'ON', 'BY']);
    const words = cleaned
        .split(' ')
        .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
        .filter(Boolean)
        .map((word) => word.toUpperCase())
        .filter((word, index) => index === 0 || !stopWords.has(word));

    const concise = words.slice(0, 6).join('_');
    return concise || 'MODULE';
}

function buildDemoPack(stack, concept) {
    const normalizedConcept = normalizeConceptForStack(stack, concept);
    const stackLabel = stack || 'JavaScript';
    const isReact = stackLabel.toLowerCase().includes('react');

    if (isReact) {
        return {
            demoTitle: `Mini Demo: ${normalizedConcept}`,
            demoScenario: `Build a tiny UI that demonstrates ${normalizedConcept} using the same pattern recommended in React official docs.`,
            demoSteps: [
                'Start from a single component and keep state local first.',
                'Introduce one side effect only when UI must sync with external time, network, or browser APIs.',
                'Validate behavior with a quick manual test: initial render, update flow, cleanup flow.'
            ],
            demoSnippet: `import { useEffect, useState } from 'react';\n\nexport default function DemoWidget() {\n  const [seconds, setSeconds] = useState(0);\n\n  useEffect(() => {\n    const id = setInterval(() => setSeconds((s) => s + 1), 1000);\n    return () => clearInterval(id);\n  }, []);\n\n  return <p>Seconds active: {seconds}</p>;\n}`
        };
    }

    return {
        demoTitle: `Mini Demo: ${normalizedConcept}`,
        demoScenario: `Create a compact proof-of-concept that demonstrates ${normalizedConcept} as described in the official ${stackLabel} docs.`,
        demoSteps: [
            'Implement the smallest working version first.',
            'Add one realistic edge case from the docs guidance.',
            'Explain which line enforces the core docs rule and why.'
        ],
        demoSnippet: `function demoTask(input) {\n  // Apply the documentation-recommended approach here\n  if (!input) return null;\n  return { ok: true, input };\n}`
    };
}

function buildCoachQuestions(concept, challenge) {
    const safeConcept = concept || 'this concept';
    const safeChallenge = challenge || 'the module challenge';

    return [
        `Why is ${safeConcept} the right choice for ${safeChallenge}?`,
        `Which trade-off did you accept in your implementation, and what alternative did you reject?`,
        'If this code fails in production, which line will you inspect first and why?'
    ];
}

function inferLineReference(submittedCode) {
    if (typeof submittedCode !== 'string' || !submittedCode.trim()) {
        return 'line 1';
    }

    const lines = submittedCode.split('\n');
    const targetIndex = lines.findIndex((line) => {
        const trimmed = line.trim();
        if (!trimmed || /^import\s+/.test(trimmed) || /^export\s+/.test(trimmed)) return false;
        return /(useEffect|useState|map\(|filter\(|reduce\(|try\s*\{|await\s+|onChange|set[A-Z]|if\s*\(|return\s+)/.test(trimmed);
    });
    const lineNo = targetIndex >= 0 ? targetIndex + 1 : 1;
    return `line ${lineNo}`;
}

function buildFallbackVibeQuestion(submittedCode, concept) {
    const lineRef = inferLineReference(submittedCode);
    const safeConcept = concept || 'this concept';
    return `On ${lineRef}, why did you choose this ${safeConcept} approach? What behavior would change if that line was removed or rewritten differently?`;
}

function normalizeToken(value) {
    return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hasBalancedDelimiters(code) {
    const pairs = { ')': '(', '}': '{', ']': '[' };
    const open = new Set(['(', '{', '[']);
    const stack = [];

    for (const ch of code) {
        if (open.has(ch)) stack.push(ch);
        if (pairs[ch]) {
            if (stack.pop() !== pairs[ch]) return false;
        }
    }

    return stack.length === 0;
}

function hasEmptyEdgeCaseHandling(code) {
    const checks = [
        /if\s*\(\s*!\s*[a-zA-Z_$][\w$]*/,
        /\.trim\(\)\.length\s*===?\s*0/,
        /\?\?/,
        /\|\|\s*['"\[\{0-9]/,
    ];
    return checks.some((rx) => rx.test(code));
}

function validateSubmittedCode(module, submittedCode) {
    const issues = [];
    const raw = (submittedCode || '').trim();

    if (!raw) {
        issues.push('Submitted code is empty.');
        return issues;
    }

    if (raw.length < 40) {
        issues.push('Submitted code is too short to evaluate properly.');
    }

    if (!hasBalancedDelimiters(raw)) {
        issues.push('Code has unbalanced brackets/parentheses.');
    }

    const mustUse = Array.isArray(module?.mustUse) ? module.mustUse : [];
    const normalizedCode = normalizeToken(raw);
    for (const token of mustUse) {
        const normToken = normalizeToken(token);
        if (normToken && !normalizedCode.includes(normToken)) {
            issues.push(`Missing required concept usage: ${token}`);
            break;
        }
    }

    const challenge = (module?.challenge || '').toLowerCase();
    const concept = (module?.concept || '').toLowerCase();
    const needsEdgeCase = /input|form|fetch|api|empty|null|undefined|validation/.test(challenge) || /input|form|state/.test(concept);

    if (needsEdgeCase && !hasEmptyEdgeCaseHandling(raw)) {
        issues.push('Handle an empty edge case (for example: if !value, trim check, or fallback default).');
    }

    return issues;
}

function isInvalidStarterCode(value) {
        if (typeof value !== 'string') return true;

        const trimmed = value.trim();
        if (!trimmed) return true;

        // Reject plain links pasted by the model instead of actual starter code
        if (/^https?:\/\/\S+$/i.test(trimmed)) return true;

        // Too short usually means placeholder text, not usable code
        if (trimmed.length < 30) return true;

        // If it has no obvious code tokens, treat it as invalid instructional text
        const hasCodeSignal = /(import\s+|export\s+|function\s+|const\s+|let\s+|var\s+|=>|return\s+|class\s+)/.test(trimmed);
        return !hasCodeSignal;
}

function buildStarterCode(stack, concept, challenge) {
        const safeConcept = concept || 'core topic';
        const safeChallenge = challenge || 'complete the objective';
        const isReact = (stack || '').toLowerCase().includes('react');

        if (isReact) {
                return `import { useState } from 'react';

export default function MissionComponent() {
    const [value, setValue] = useState(0);

    const handleIncrement = () => setValue((v) => v + 1);
    const handleDecrement = () => setValue((v) => v - 1);

    // TODO: apply the ${safeConcept} pattern to satisfy the challenge.
    // Challenge: ${safeChallenge}
    return (
        <section>
            <h2>${safeConcept}</h2>
            <p>Current value: {value}</p>
            <button onClick={handleIncrement}>Increment</button>
            <button onClick={handleDecrement}>Decrement</button>
        </section>
    );
}`;
        }

        return `function solveMission(input) {
    // TODO: apply ${safeConcept} to solve: ${safeChallenge}
    if (!input) return { ok: false, reason: 'missing input' };

    return {
        ok: true,
        input,
    };
}

module.exports = { solveMission };`;
}

function normalizeToken(token) {
    return (token || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function codeContainsRequiredToken(code, token) {
    const normalizedCode = normalizeToken(code);
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) return true;
    return normalizedCode.includes(normalizedToken);
}

function buildExpandedTheory(theory, concept, stack) {
    const safeConcept = concept || 'this topic';
    const base = (theory || '').trim();

    if (base.length >= 220) return base;

    const prefix = base
        ? `${base}\n\n`
        : '';

    return `${prefix}${safeConcept} is important in ${stack || 'modern web development'} because it controls how predictable and maintainable your code remains under changing requirements.

In practice, apply ${safeConcept} to keep state transitions explicit, side effects isolated, and UI behavior easy to reason about. Use the official docs pattern first, then adapt only when you can explain the trade-off.

When reviewing your own solution, verify correctness, failure behavior, and readability. A strong implementation should clearly show where ${safeConcept} is used and why that choice is better than alternatives for this scenario.`;
}

function deriveConceptRequirements(stack, concept) {
    const lowerStack = (stack || '').toLowerCase();
    const lowerConcept = (concept || '').toLowerCase();

    if (lowerStack.includes('react')) {
        if (lowerConcept.includes('useeffect') || lowerConcept.includes('effect') || lowerConcept.includes('lifecycle')) {
            return {
                mustUse: ['useEffect', 'cleanup function', 'dependency array'],
                acceptanceCriteria: [
                    'useEffect is used for the side effect, not in render body.',
                    'Dependency array is intentionally chosen and explained.',
                    'Cleanup function prevents leaks or duplicate subscriptions.'
                ],
                starterCode: `import { useEffect, useState } from 'react';

export default function MissionComponent() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return <p>Seconds active: {seconds}</p>;
}`
            };
        }

        if (lowerConcept.includes('form') || lowerConcept.includes('controlled') || lowerConcept.includes('input')) {
            return {
                mustUse: ['useState', 'onChange', 'controlled input value'],
                acceptanceCriteria: [
                    'Input value is controlled from component state.',
                    'onChange updates state using event value.',
                    'Form submit handles validation without page reload.'
                ],
                starterCode: `import { useState } from 'react';

export default function MissionComponent() {
  const [form, setForm] = useState({ name: '', email: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form>
      <input name="name" value={form.name} onChange={handleChange} />
      <input name="email" value={form.email} onChange={handleChange} />
    </form>
  );
}`
            };
        }

        return {
            mustUse: ['useState'],
            acceptanceCriteria: [
                'State is updated via setter function, not direct mutation.',
                'UI re-renders from state changes predictably.',
                'Edge cases are handled without breaking interaction flow.'
            ],
            starterCode: buildStarterCode(stack, concept, `Implement ${concept} with a real user interaction.`)
        };
    }

    return {
        mustUse: [concept || 'core docs pattern'],
        acceptanceCriteria: [
            'Solution clearly applies the target documentation concept.',
            'Implementation handles at least one realistic edge case.',
            'Code remains readable and explainable during review.'
        ],
        starterCode: buildStarterCode(stack, concept, `Implement ${concept} with a realistic scenario.`)
    };
}

function alignChallengeWithConcept(challenge, concept, requirements) {
    const safeConcept = (concept || 'core concept').trim();
    const base = (challenge || '').trim() || `Implement a realistic scenario using ${safeConcept}.`;
    const mustUse = Array.isArray(requirements?.mustUse) ? requirements.mustUse : [];

    const conceptMentioned = base.toLowerCase().includes(safeConcept.toLowerCase());
    const usageLine = mustUse.length > 0 ? `Mandatory usage: ${mustUse.join(', ')}.` : '';

    const aligned = conceptMentioned
        ? base
        : `${base} Ensure your implementation explicitly demonstrates ${safeConcept}.`;

    if (!usageLine) return aligned;
    if (aligned.toLowerCase().includes('mandatory usage:')) return aligned;
    return `${aligned} ${usageLine}`;
}

// ═══════════════════════════════════════════════════════════════
// LLM SYSTEM PROMPTS — The soul of the anti-vibe-coding engine
// ═══════════════════════════════════════════════════════════════

/**
 * DIAGNOSTIC PROMPT — Generates varied, docs-grounded MCQs.
 * 
 * Goals:
 * - No "same question every time" feeling for the learner
 * - Each question targets a different docs concept and uses real scenarios
 * - Output stays in a strict JSON shape for the frontend
 */
const DIAGNOSTIC_SYSTEM_PROMPT = `You are an expert technical interviewer and educator. Your job is to generate a tactical 'IQ Check' diagnostic test to gauge a learner's mastery of a given technology.

CRITICAL RULES:
1. Generate EXACTLY 5 multiple-choice questions.
2. DIFFICULTY TIERING:
    - Q1 & Q2: BEGINNER (core concepts, but not pure definition recall).
    - Q3 & Q4: INTERMEDIATE (implementation patterns, performance, or behavior in realistic scenarios).
    - Q5: ADVANCED (architectural decisions, edge cases, or trade‑offs in a real-world situation).
3. CONTENT GROUNDING: Use the provided OFFICIAL DOCS URL to ground your questions.
    - Questions must reflect patterns and terminology found in the official documentation.
4. VARIETY & NON‑REPETITION (IMPORTANT):
    - All 5 questions must target DIFFERENT underlying concepts from the docs.
    - Do NOT reuse the same wording like "primary purpose of X" across multiple questions.
    - Avoid asking the exact same question text that commonly appears in generic quizzes.
5. QUESTION STYLE:
    - Prefer small code snippets, UI scenarios, or bug descriptions over trivia.
    - Even beginner questions should ask "what happens" or "which option matches the docs" instead of just "what is X?".
6. OPTIONS FORMAT:
    - Each question must have exactly 4 options (A, B, C, D).

You MUST return ONLY a valid JSON object in this EXACT format, containing EXACTLY 5 questions:
{
  "questions": [
     {
        "id": 1,
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "concept": "...",
        "difficulty": "beginner"
     }
  ]
}

RETURN ONLY THE JSON.`;

/**
 * VIBE CHECK PROMPT — The strict code reviewer that catches vibe coders.
 * 
 * Key design decisions:
 * - Analyzes code correctness AND intent
 * - Generates a specific "vibe question" about a line/approach in their code
 * - The vibe question is designed to be unanswerable by someone who copy-pasted
 */
const VIBE_CHECK_SYSTEM_PROMPT = `You are a STRICT Senior Code Reviewer and mentor. Your job is to:
1. Analyze submitted code for correctness against the given challenge.
2. Check whether the code appears to be genuinely understood or likely pasted/generated without understanding.
3. Generate a line-specific challenge question that forces the learner to explain intent.

Rules for the question:
- Must reference a specific line number from submitted code.
- Must ask "why this approach" and "what happens if this line changes/removes".
- Must be difficult to fake without understanding.

You MUST return ONLY valid JSON in this exact shape:
{
    "isCorrect": true,
    "correctnessScore": 85,
    "feedback": "Short review summary",
    "codeIssues": ["issue 1", "issue 2"],
    "isLikelyAIGenerated": false,
    "aiSignals": ["signal 1", "signal 2"],
    "lineReference": "line 7",
    "vibeQuestion": "Why did you use X on line 7, and what would break if that line was changed?"
}

RETURN ONLY JSON. No markdown or extra text.`;

/**
 * VERIFY EXPLANATION PROMPT — Grades if the user truly understands.
 * 
 * Key design decisions:
 * - Uses a rubric: Understanding (0-40), Specificity (0-30), Accuracy (0-30)
 * - Score >= 60 = PASS (genuine understanding)
 * - Score < 60 = FAIL (likely guessing or surface-level answer)
 * - Provides encouraging but honest feedback
 */
const VERIFY_EXPLANATION_SYSTEM_PROMPT = `You are a strict technical evaluator.

You will receive:
- Concept and official theory context
- The exact vibe question asked about a specific line
- Learner explanation

Scoring rubric:
- Understanding (0-40): Does learner explain WHY they used that line/approach?
- Specificity (0-30): Do they reference concrete behavior, trade-off, and what-if changes?
- Accuracy (0-30): Is explanation technically correct with docs-aligned reasoning?

Pass rule:
- score >= 60 -> passed true
- score < 60 -> passed false

You MUST return ONLY valid JSON:
{
    "passed": true,
    "score": 78,
    "breakdown": {
        "understanding": 30,
        "specificity": 24,
        "accuracy": 24
    },
    "feedback": "Short mentor feedback",
    "isVibeCoder": false,
    "tip": "One clear actionable tip"
}

No markdown. No extra text.`;

/**
 * ROADMAP SYSTEM PROMPT — Generates a docs-grounded topic roadmap.
 * 
 * Design goals:
 * - Each unit is a concrete TOPIC from official docs (not a vague buzzword)
 * - Roadmap flows from the user's failed concepts → senior-level mastery
 * - Output is strict JSON for direct injection into the user's dynamic roadmap
 */
const ROADMAP_SYSTEM_PROMPT = `You are a Senior Curriculum Architect at an elite engineering firm. Your mission is to generate a 7-unit "Elite Mastery" roadmap made of REAL documentation topics.

CRITICAL RULES:
1. MISSION OBJECTIVE: Construct a comprehensive, 7-unit learning arc from identified "Gaps" to "Senior Architect" mastery for the target stack.
2. TOPIC FOCUS (IMPORTANT):
    - Treat each unit as ONE primary TOPIC from the OFFICIAL DOCS.
    - Prefer actual section/heading names from the docs (e.g., "Managing Form State", "Reacting to Input with useState").
    - Do NOT invent generic marketing names like "Ultimate Form Wizard" or vague buzzwords.
3. CONTENT GROUNDING:
    - Use ONLY the provided OFFICIAL DOCS URL.
    - Every field you generate must be explainable and traceable back to real documentation.
4. GAP ALIGNMENT:
    - The FIRST 3 modules must directly target the failed/weak concepts listed in TOPIC GAPS.
    - Make this mapping obvious: the module's title and concept should clearly reflect that specific topic from the docs.
5. MODULE SHAPE:
    For each module you MUST include:
    - title: A concise TOPIC-style name, ideally mirroring an official docs heading. Use UPPER_SNAKE_CASE (e.g., "REACTIVE_FORM_MANAGEMENT").
    - description: 1–2 sentences describing what the learner will master for this TOPIC.
    - theory: A clear, docs-grounded explanation of the "WHY" and "HOW" of this TOPIC. Minimum 120 words.
    - concept: A short phrase naming the underlying documentation principle (e.g., "Controlled components for form state", "Using useEffect for side effects").
    - challenge: A non-trivial Senior-level engineering scenario that forces the learner to APPLY this docs topic in real code.
    - mustUse: Array of 2 to 4 concrete APIs/patterns that MUST appear in the solution.
    - acceptanceCriteria: Array of exactly 3 review checks that verify concept usage.
    - demoScenario: 1 concise practical demo setup where this topic is visibly used.
    - demoSteps: Exactly 3 short steps (array of strings) to run the demo mentally or in code.
    - demoSnippet: 6 to 12 lines of starter demo code.
    - coachQuestions: Exactly 3 concise code-review questions that ask the learner to explain their code decisions.
    - vibeQuestion: A specific, tactical question to ask AFTER they submit code, referencing this TOPIC and typical pitfalls from the docs.
    - starterCode: A robust starter template aligned with the docs examples.
    - xpReward: 500
    - estimatedMinutes: Between 60 and 120 minutes.
6. DIFFICULTY RAMP:
    - Units 1–3: bridge the failed topics with targeted, focused challenges.
    - Units 4–7: progressively combine earlier topics into senior-level architecture, scaling, or reliability scenarios.
7. JSON FORMAT: Return ONLY a valid JSON object with EXACTLY 7 modules in the "modules" array.`;

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/diagnostic/generate
 * 
 * Generates an AI diagnostic test to gauge the user's knowledge level.
 * Frontend calls this when user selects their tech stack.
 * 
 * @body {{ stack: string }}
 * @returns {{ questions: Array<{ id, question, options, correctIndex, concept, difficulty }> }}
 */
async function generateDiagnostic(req, res) {
    const { stack } = req.body;

    if (!stack) {
        return res.status(400).json({ error: 'stack is required (e.g., "React", "Node.js", "Python")' });
    }

    try {
        // Update user's selected stack
        if (req.user?._id) {
            await User.findByIdAndUpdate(req.user._id, { selectedStack: stack });
        }

        console.log(`🧠 [DIAGNOSTIC] Generating diagnostic test for stack: ${stack}`);

        const docsUrl = getDocsUrl(stack);
        const userPrompt = `Technology Stack: ${stack}\nOfficial Docs: ${docsUrl}\nGenerate a 5-question tiered IQ check. Ground everything in the official documentation patterns.`;

        const raw = await callLLM(DIAGNOSTIC_SYSTEM_PROMPT, userPrompt, 5000, 2);
        const result = parseJsonFromLLM(raw, { questions: null });

        // Validate the structure
        if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
            console.warn('⚠️ [DIAGNOSTIC] LLM returned invalid structure, generating fallback');
            return res.status(500).json({
                error: 'AI generated an invalid test format. Please try again.',
                raw: process.env.VERBOSE_AI_LOGS === 'true' ? raw : undefined
            });
        }

        // Sanitize: ensure each question has required fields
        const sanitizedQuestions = result.questions.map((q, i) => ({
            id: q.id || i + 1,
            question: q.question || 'Question unavailable',
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            concept: q.concept || 'general',
            difficulty: q.difficulty || 'beginner',
        }));

        console.log(`✅ [DIAGNOSTIC] Generated ${sanitizedQuestions.length} questions for ${stack}`);

        res.json({
            stack,
            questions: sanitizedQuestions,
            totalQuestions: sanitizedQuestions.length,
            instructions: 'Answer all questions. Your score determines your starting difficulty level.'
        });
    } catch (err) {
        console.error('❌ [DIAGNOSTIC] Generation failed:', err.message);
        res.status(500).json({ error: 'Failed to generate diagnostic test', details: err.message });
    }
}

/**
 * POST /api/v1/diagnostic/submit
 * 
 * Frontend calls this when user completes the diagnostic test.
 * Calculates score and sets the user's diagnostic level.
 * 
 * @body {{ answers: Array<{ questionId, selectedIndex, correctIndex }> }}
 * @returns {{ score, totalQuestions, level, message }}
 */
async function submitDiagnostic(req, res) {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'answers array is required' });
    }

    try {
        const total = answers.length;
        const correctCount = answers.filter(a => a.selectedIndex === a.correctIndex).length;
        
        // ADAPTIVE LOGIC: IDENTIFY FAILURES BY TIER
        // Assuming questions: 0,1=Easy; 2,3=Medium; 4=Hard
        const solvedEasy = answers.slice(0, 2).filter(a => a.selectedIndex === a.correctIndex).length;
        const solvedMedium = answers.slice(2, 4).filter(a => a.selectedIndex === a.correctIndex).length;
        const solvedHard = (answers[4] && answers[4].selectedIndex === answers[4].correctIndex) ? 1 : 0;

        // Determination: If they fail both Medium questions, they MUST be marked as Beginner (Easy).
        let level;
        let tacticalMessage;

        if (solvedMedium === 0) {
            level = 'Beginner';
            tacticalMessage = '⚠️ CORE PROTOCOL ERROR: Failed Intermediate synchronization. Reverting to fundamental training.';
        } else if (correctCount === 5) {
            level = 'Advanced';
            tacticalMessage = '🔥 ARCHITECT DETECTED: 100% IQ synchronization achieved. Advanced tracks unlocked.';
        } else if (correctCount >= 3) {
            level = 'Intermediate';
            tacticalMessage = '💪 FIELD STRENGTH CONFIRMED: Solid intermediate foundation. Deploying advanced implementation tasks.';
        } else {
            level = 'Beginner';
            tacticalMessage = '🚀 OPERATIVE READY: Building fundamentals from target zero.';
        }

        const percentage = Math.round((correctCount / total) * 100);

        // Update user in MongoDB
        if (req.user?._id) {
            await User.findByIdAndUpdate(req.user._id, {
                diagnosticLevel: level,
                diagnosticResults: {
                    score: correctCount,
                    totalQuestions: total,
                    completedAt: new Date(),
                },
                lastActiveAt: new Date(),
            });

            // Identify failed concepts for Gap Analysis
            const failedConcepts = answers
                .filter(a => a.selectedIndex !== a.correctIndex && a.concept)
                .map(a => a.concept);

            // ─── GENERATE DYNAMIC ROADMAP ────────────────────────
            console.log(`🗺️ [GAP ANALYSIS] Generating senior roadmap for ${req.user.selectedStack} Gaps: ${failedConcepts.join(', ')}`);
            
            const docsUrl = getDocsUrl(req.user.selectedStack);

            const roadmapPrompt = `Technology: ${req.user.selectedStack || 'Modern Web'}
Official Docs: ${docsUrl}
User IQ Level: ${level}
TOPIC GAPS (FAILED): ${failedConcepts.length > 0 ? failedConcepts.join(', ') : 'Minor refinement needed in fundamentals'}

Generate a 7-unit Elite Mastery roadmap. The first 3 modules must aggressively bridge the identified Gaps. The remaining modules must push the user to Senior Architect level. 
Ground all 'theory' and 'challenges' in official patterns from ${docsUrl}.`;

            try {
                const rawRoadmap = await callLLM(ROADMAP_SYSTEM_PROMPT, roadmapPrompt, 3000, 2);
                const roadmapData = parseJsonFromLLM(rawRoadmap, { modules: [] });

                if (roadmapData.modules?.length > 0) {
                    const dynamicModules = roadmapData.modules.map((m, i) => {
                        const rawConcept = normalizeConceptForStack(req.user.selectedStack, m.concept || m.title || `Module ${i + 1}`);
                        const normalizedTitle = toTopicTitle(rawConcept, m.title);
                        const fallbackDemo = buildDemoPack(req.user.selectedStack, rawConcept);
                        const requirements = deriveConceptRequirements(req.user.selectedStack, rawConcept);
                        const alignedChallenge = alignChallengeWithConcept(m.challenge, rawConcept, requirements);
                        const fallbackStarterCode = requirements.starterCode || buildStarterCode(req.user.selectedStack, rawConcept, alignedChallenge);
                        const generatedStarterCode = isInvalidStarterCode(m.starterCode) ? fallbackStarterCode : m.starterCode;
                        const starterCode = requirements.mustUse.every((token) => codeContainsRequiredToken(generatedStarterCode, token))
                            ? generatedStarterCode
                            : fallbackStarterCode;
                        const coachQuestions = Array.isArray(m.coachQuestions) && m.coachQuestions.length > 0
                            ? m.coachQuestions.slice(0, 3)
                            : buildCoachQuestions(rawConcept, alignedChallenge);
                        const mustUse = Array.isArray(m.mustUse) && m.mustUse.length > 0
                            ? m.mustUse.slice(0, 4)
                            : requirements.mustUse;
                        const acceptanceCriteria = Array.isArray(m.acceptanceCriteria) && m.acceptanceCriteria.length > 0
                            ? m.acceptanceCriteria.slice(0, 3)
                            : requirements.acceptanceCriteria;
                        const enrichedTheory = buildExpandedTheory(m.theory, rawConcept, req.user.selectedStack);

                        return {
                            ...m,
                            // Force the visual card title to be a clear TOPIC based on the concept
                            title: normalizedTitle || m.title || `MODULE_${i + 1}`,
                            concept: rawConcept,
                            theory: enrichedTheory,
                            challenge: alignedChallenge,
                            mustUse,
                            acceptanceCriteria,
                            demoTitle: m.demoTitle || fallbackDemo.demoTitle,
                            demoScenario: m.demoScenario || fallbackDemo.demoScenario,
                            demoSteps: Array.isArray(m.demoSteps) && m.demoSteps.length > 0 ? m.demoSteps.slice(0, 3) : fallbackDemo.demoSteps,
                            demoSnippet: m.demoSnippet || fallbackDemo.demoSnippet,
                            starterCode,
                            coachQuestions,
                            docs_url: docsUrl, // Inject real docs URL
                            order: i + 1,
                            status: i === 0 ? 'unlocked' : 'locked',
                            unlockedAt: i === 0 ? new Date() : null
                        };
                    });

                    await User.findByIdAndUpdate(req.user._id, {
                        activeRoadmap: dynamicModules
                    });
                    console.log(`✅ [IQ CHECK] Dynamic roadmap constructed with ${dynamicModules.length} units.`);
                }
            } catch (err) {
                console.warn('⚠️ [IQ CHECK] Dynamic roadmap generation failed, user will fallback to static modules.', err.message);
            }
        }

        console.log(`✅ [IQ CHECK] User scored ${correctCount}/${total} (${percentage}%) → Level: ${level} (Med Solved: ${solvedMedium})`);

        res.json({
            score: correctCount,
            totalQuestions: total,
            percentage,
            level,
            message: tacticalMessage,
        });
    } catch (err) {
        console.error('❌ [DIAGNOSTIC] Submit failed:', err.message);
        res.status(500).json({ error: 'Failed to submit diagnostic', details: err.message });
    }
}

/**
 * POST /api/v1/challenge/vibe-check
 * 
 * The heart of the anti-vibe-coding system.
 * Takes submitted code → AI reviews it → generates a "vibe question"
 * that only someone who wrote the code themselves can answer.
 * 
 * Frontend: User writes code in editor → clicks "Submit for Vibe Check"
 * 
 * @body {{ userId, moduleId, submittedCode }}
 * @returns {{ isCorrect, correctnessScore, feedback, codeIssues, vibeQuestion }}
 */
async function vibeCheck(req, res) {
    const { userId, moduleId, submittedCode } = req.body;

    if (!moduleId || !submittedCode) {
        return res.status(400).json({ error: 'moduleId and submittedCode are required' });
    }

    try {
        // Fetch the module (Priority: Dynamic Roadmap > Static Collection)
        const module = req.user?.activeRoadmap?.find(m => m.moduleId === moduleId) || 
                       await Module.findById(moduleId);

        if (!module) {
            return res.status(404).json({ error: 'Module not found in mission history' });
        }

        const validationIssues = validateSubmittedCode(module, submittedCode);

        console.log(`🔍 [VIBE CHECK] Reviewing code for module: "${module.title}"`);
        
        const docsUrl = module.docs_url || getDocsUrl(module.stack);

        const userPrompt = `
OFFICIAL DOCUMENTATION: ${docsUrl}
CHALLENGE: ${module.challenge}
CONCEPT: ${module.concept}
    MUST USE IN SOLUTION: ${Array.isArray(module.mustUse) && module.mustUse.length > 0 ? module.mustUse.join(', ') : 'Use the core concept explicitly'}
    ACCEPTANCE CRITERIA: ${Array.isArray(module.acceptanceCriteria) && module.acceptanceCriteria.length > 0 ? module.acceptanceCriteria.join(' | ') : 'Concept usage must be explicit and verifiable'}

STARTER CODE GIVEN:
\`\`\`
${module.starterCode}
\`\`\`

STUDENT'S SUBMITTED CODE:
\`\`\`
${submittedCode}
\`\`\`

PRECHECK ISSUES (if any):
${validationIssues.length > 0 ? validationIssues.join(' | ') : 'none'}

Review this code against official documentation patterns:
1. Does it correctly solve the challenge? (Score it 0-100)
2. Confirm whether the required concept APIs/patterns are actually present in code.
3. Generate a "Vibe Question" referencing a SPECIFIC line or pattern in their code, asking WHY they chose it over official alternatives.`;

        const rawResult = await callLLM(VIBE_CHECK_SYSTEM_PROMPT, userPrompt, 5000, 2);
        const result = parseJsonFromLLM(rawResult, {
            isCorrect: null,
            correctnessScore: null,
            feedback: null,
            codeIssues: null,
            isLikelyAIGenerated: null,
            aiSignals: null,
            lineReference: null,
            vibeQuestion: null
        });

        const lineReference = typeof result.lineReference === 'string' && result.lineReference.trim()
            ? result.lineReference.trim()
            : inferLineReference(submittedCode);

        // Validate the vibe question exists and is line-specific
        if (!result.vibeQuestion || !/line\s*\d+/i.test(result.vibeQuestion)) {
            result.vibeQuestion = buildFallbackVibeQuestion(submittedCode, module.concept);
        }

        // Save the submitted code (Priority: Dynamic Roadmap > Static Progress)
        const effectiveUserId = userId || req.user?._id;
        if (effectiveUserId) {
            // Check if it's a dynamic module first
            const isDynamic = req.user?.activeRoadmap?.some(m => m.moduleId === moduleId);
            
            if (isDynamic) {
                await User.updateOne(
                    { _id: effectiveUserId, 'activeRoadmap.moduleId': moduleId },
                    { 
                        $set: { 'activeRoadmap.$.codeSubmitted': submittedCode, 'activeRoadmap.$.status': 'in_progress' },
                        $inc: { 'activeRoadmap.$.vibeCheckAttempts': 1 }
                    }
                );
            } else {
                await User.updateOne(
                    { _id: effectiveUserId, 'moduleProgress.moduleId': moduleId },
                    {
                        $set: {
                            'moduleProgress.$.codeSubmitted': submittedCode,
                            'moduleProgress.$.status': 'in_progress',
                        },
                        $inc: { 'moduleProgress.$.vibeCheckAttempts': 1 }
                    }
                );
            }
        }

        console.log(`✅ [VIBE CHECK] Code reviewed. Correct: ${result.isCorrect}. Vibe question generated.`);

        res.json({
            isCorrect: Boolean(result.isCorrect),
            correctnessScore: result.correctnessScore || 0,
            feedback: result.feedback || (validationIssues.length > 0 ? `Precheck failed: ${validationIssues[0]}` : 'Code review complete.'),
            codeIssues: [
                ...validationIssues,
                ...(Array.isArray(result.codeIssues) ? result.codeIssues : []),
            ],
            isLikelyAIGenerated: Boolean(result.isLikelyAIGenerated),
            aiSignals: Array.isArray(result.aiSignals) ? result.aiSignals : [],
            lineReference,
            vibeQuestion: result.vibeQuestion,
            moduleTitle: module.title,
            concept: module.concept,
        });
    } catch (err) {
        console.error('❌ [VIBE CHECK] Failed:', err.message);
        res.status(500).json({ error: 'Vibe check failed', details: err.message });
    }
}

/**
 * POST /api/v1/challenge/verify-explanation
 * 
 * Final gate: AI grades if the user truly understands or is vibe coding.
 * If they pass → unlock the next module in MongoDB.
 * 
 * Frontend: User sees the vibe question → types explanation → submits
 * 
 * @body {{ userId, moduleId, vibeQuestion, userExplanation }}
 * @returns {{ passed, score, breakdown, feedback, isVibeCoder, tip, unlockedModuleId? }}
 */
async function verifyExplanation(req, res) {
    const { userId, moduleId, vibeQuestion, userExplanation } = req.body;

    if (!moduleId || !vibeQuestion || !userExplanation) {
        return res.status(400).json({
            error: 'moduleId, vibeQuestion, and userExplanation are required'
        });
    }

    try {
        // Fetch the module (Priority: Dynamic Roadmap > Static Collection)
        let module = req.user?.activeRoadmap?.find(m => m.moduleId === moduleId);
        
        if (!module) {
            module = await Module.findById(moduleId);
        }

        if (!module) {
            return res.status(404).json({ error: 'Module not found in mission history' });
        }

        console.log(`📝 [VERIFY] Grading explanation for module: "${module.title}"`);

        const docsUrl = module.docs_url || getDocsUrl(module.stack);

        const userPrompt = `
OFFICIAL DOCUMENTATION: ${docsUrl}
CONCEPT: ${module.concept}
OFFICIAL THEORY: ${module.theory || 'Grounded in documentation patterns.'}
VIBE QUESTION ASKED: ${vibeQuestion}
THE STUDENT'S EXPLANATION: ${userExplanation}

Grade this explanation based on the official documentation's core principles. Does the student genuinely understand the concept, or are they just guessing? Reference the OFFICIAL THEORY to ensure high-stakes accuracy.`;

        const raw = await callLLM(VERIFY_EXPLANATION_SYSTEM_PROMPT, userPrompt, 1500, 2);
        const result = parseJsonFromLLM(raw, {
            passed: null, score: null, breakdown: null, feedback: null, isVibeCoder: null, tip: null
        });

        const passed = Boolean(result.passed);
        const score = result.score || 0;
        let unlockedModuleId = null;

        // If passed → unlock the next module
        const effectiveUserId = userId || req.user?._id;
        if (passed && effectiveUserId) {
            const isDynamic = req.user?.activeRoadmap?.some(m => m.moduleId === moduleId);

            if (isDynamic) {
                // Mark current dynamic module as completed
                await User.updateOne(
                    { _id: effectiveUserId, 'activeRoadmap.moduleId': moduleId },
                    {
                        $set: {
                            'activeRoadmap.$.status': 'completed',
                            'activeRoadmap.$.vibeCheckScore': score,
                            'activeRoadmap.$.completedAt': new Date(),
                        }
                    }
                );

                // Unlock next dynamic module (by order)
                const nextOrder = (module.order || 0) + 1;
                const nextMod = req.user.activeRoadmap.find(m => m.order === nextOrder);
                if (nextMod) {
                    await User.updateOne(
                        { _id: effectiveUserId, 'activeRoadmap.moduleId': nextMod.moduleId },
                        { $set: { 'activeRoadmap.$.status': 'unlocked', 'activeRoadmap.$.unlockedAt': new Date() } }
                    );
                    unlockedModuleId = nextMod.moduleId;
                    console.log(`🔓 [VERIFY] Dynamic module unlocked: ${nextMod.title}`);
                }
                
                await User.findByIdAndUpdate(effectiveUserId, {
                    $inc: { totalModulesCompleted: 1 },
                    $set: { lastActiveAt: new Date() },
                });

            } else {
                // FALLBACK: Static module completion logic
                // Mark current module as completed
                await User.updateOne(
                    { _id: effectiveUserId, 'moduleProgress.moduleId': moduleId },
                    {
                        $set: {
                            'moduleProgress.$.status': 'completed',
                            'moduleProgress.$.vibeCheckScore': score,
                            'moduleProgress.$.completedAt': new Date(),
                        }
                    }
                );

                // Find and unlock the next module
                const nextModule = await Module.findOne({
                    stack: module.stack,
                    order: module.order + 1,
                    isActive: true
                });

                if (nextModule) {
                    unlockedModuleId = nextModule._id.toString();

                    // Check if user already has this module in progress
                    const userDoc = await User.findById(effectiveUserId);
                    const alreadyHasModule = userDoc?.moduleProgress?.some(
                        p => p.moduleId.toString() === unlockedModuleId
                    );

                    if (!alreadyHasModule) {
                        await User.findByIdAndUpdate(effectiveUserId, {
                            $push: {
                                moduleProgress: {
                                    moduleId: nextModule._id,
                                    status: 'unlocked',
                                    unlockedAt: new Date(),
                                }
                            },
                            $inc: { totalModulesCompleted: 1 },
                            $set: { lastActiveAt: new Date() },
                        });
                    } else {
                        await User.updateOne(
                            { _id: effectiveUserId, 'moduleProgress.moduleId': nextModule._id },
                            { $set: { 'moduleProgress.$.status': 'unlocked', 'moduleProgress.$.unlockedAt': new Date() } }
                        );
                        await User.findByIdAndUpdate(effectiveUserId, {
                            $inc: { totalModulesCompleted: 1 },
                            $set: { lastActiveAt: new Date() },
                        });
                    }

                    console.log(`🔓 [VERIFY] Unlocked next module: "${nextModule.title}" (ID: ${unlockedModuleId})`);
                } else {
                    console.log(`🏆 [VERIFY] User completed ALL modules for stack: ${module.stack}!`);
                }
            }
        }

        console.log(`✅ [VERIFY] Score: ${score}/100. Passed: ${passed}. Vibe Coder: ${result.isVibeCoder}`);

        res.json({
            passed,
            score,
            breakdown: result.breakdown || { understanding: 0, specificity: 0, accuracy: 0 },
            feedback: result.feedback || (passed ? 'Great explanation!' : 'Try to explain more deeply.'),
            isVibeCoder: Boolean(result.isVibeCoder),
            tip: result.tip || '',
            unlockedModuleId,
            message: passed
                ? '🎉 Vibe Check PASSED! You actually understand this. Next module unlocked!'
                : '🚫 Vibe Check FAILED. Your explanation suggests you might be guessing. Study the concept and try again.',
        });
    } catch (err) {
        console.error('❌ [VERIFY] Failed:', err.message);
        res.status(500).json({ error: 'Verification failed', details: err.message });
    }
}

/**
 * GET /api/v1/modules
 * 
 * Fetch all modules for a given stack, with user's progress overlay.
 * Frontend uses this to render the skill tree / module map.
 * 
 * @query {{ stack: string }}
 * @returns {{ modules: Array, userProgress: Array }}
 */
async function getModules(req, res) {
    const { stack } = req.query;

    if (!stack) {
        return res.status(400).json({ error: 'stack query param is required' });
    }

    try {
        let userProgress = [];
        let activeRoadmap = [];
        
        if (req.user?._id) {
            const user = await User.findById(req.user._id).select('moduleProgress diagnosticLevel activeRoadmap');
            userProgress = user?.moduleProgress || [];
            activeRoadmap = user?.activeRoadmap || [];
        }

        // Priority 1: Use Dynamic Roadmap if available
        if (activeRoadmap.length > 0) {
            const enriched = activeRoadmap.map(mod => ({
                ...mod.toObject(),
                userStatus: mod.status, // already tracked in dynamic object
                vibeCheckScore: mod.vibeCheckScore || 0,
                vibeCheckAttempts: mod.vibeCheckAttempts || 0,
            }));
            return res.json({ stack, modules: enriched, total: enriched.length, isDynamic: true });
        }

        // Priority 2: Fallback to static modules
        const modules = await Module.find({ stack, isActive: true }).sort({ order: 1 });

        // Merge module data with user progress
        const enriched = modules.map(mod => {
            const progress = userProgress.find(p => p.moduleId?.toString() === mod._id.toString());
            return {
                ...mod.toObject(),
                userStatus: progress?.status || 'locked',
                vibeCheckScore: progress?.vibeCheckScore || 0,
                vibeCheckAttempts: progress?.vibeCheckAttempts || 0,
            };
        });

        res.json({ stack, modules: enriched, total: enriched.length });
    } catch (err) {
        console.error('❌ [MODULES] Fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch modules', details: err.message });
    }
}

/**
 * GET /api/v1/progress
 * 
 * Fetch user's overall learning progress and stats.
 * Frontend uses this for the dashboard / progress overview.
 */
async function getProgress(req, res) {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id)
            .select('selectedStack diagnosticLevel diagnosticResults moduleProgress totalModulesCompleted currentStreak lastActiveAt');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            selectedStack: user.selectedStack,
            diagnosticLevel: user.diagnosticLevel,
            diagnosticResults: user.diagnosticResults,
            moduleProgress: user.moduleProgress,
            totalModulesCompleted: user.totalModulesCompleted,
            currentStreak: user.currentStreak,
            lastActiveAt: user.lastActiveAt,
        });
    } catch (err) {
        console.error('❌ [PROGRESS] Fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch progress', details: err.message });
    }
}

/**
 * POST /api/v1/mission/reset
 * 
 * Archives the current mission (stack, level, progress) into the missions history
 * and clears the active fields so the user can start a new mission.
 */
async function resetMission(req, res) {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only archive if there's actually a mission in progress
        if (user.selectedStack) {
            const currentMission = {
                stack: user.selectedStack,
                level: user.diagnosticLevel,
                score: user.diagnosticResults?.score || 0,
                totalQuestions: user.diagnosticResults?.totalQuestions || 0,
                moduleProgress: [...user.moduleProgress],
                completedAt: new Date(),
                status: 'archived'
            };

            // Push to history and clear active fields
            await User.findByIdAndUpdate(req.user._id, {
                $push: { missions: currentMission },
                $set: {
                    selectedStack: null,
                    diagnosticLevel: null,
                    diagnosticResults: { score: 0, totalQuestions: 0, completedAt: null },
                    moduleProgress: [],
                    totalModulesCompleted: 0
                }
            });

            console.log(`📦 [MISSION] Archived current mission (${user.selectedStack}) for user ${user.email}`);
        }

        res.json({ message: 'Mission reset successfully. You can now start a new one.' });
    } catch (err) {
        console.error('❌ [MISSION] Reset failed:', err.message);
        res.status(500).json({ error: 'Failed to reset mission', details: err.message });
    }
}

/**
 * GET /api/v1/mission/history
 * 
 * Returns the history of all completed/archived missions for the current user.
 */
async function getMissionHistory(req, res) {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id).select('missions');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ missions: user.missions || [] });
    } catch (err) {
        console.error('❌ [MISSION] History fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch mission history', details: err.message });
    }
}

module.exports = {
    generateDiagnostic,
    submitDiagnostic,
    vibeCheck,
    verifyExplanation,
    getModules,
    getProgress,
    resetMission,
    getMissionHistory,
};
