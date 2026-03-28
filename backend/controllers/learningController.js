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

// ═══════════════════════════════════════════════════════════════
// LLM SYSTEM PROMPTS — The soul of the anti-vibe-coding engine
// ═══════════════════════════════════════════════════════════════

/**
 * DIAGNOSTIC PROMPT — Generates conceptual MCQs to gauge knowledge level.
 * 
 * Key design decisions:
 * - Questions test UNDERSTANDING, not syntax memorization
 * - Each question maps to a concept (used later for module recommendations)
 * - Strict JSON output format enforced in prompt
 */
const DIAGNOSTIC_SYSTEM_PROMPT = `You are an expert technical interviewer and educator. Your job is to generate a SHORT diagnostic test to gauge a learner's fundamental understanding of a given technology.

CRITICAL RULES:
1. Generate EXACTLY 3 multiple-choice questions.
2. Questions must test CONCEPTUAL UNDERSTANDING, not syntax memorization.
   - BAD: "What is the correct syntax for useState?"
   - GOOD: "Why does React re-render a component when state changes?"
3. Each question must have exactly 4 options (A, B, C, D).
4. Questions should range from beginner to intermediate difficulty.
5. Include a "concept" field so we know what each question tests.

You MUST return ONLY a valid JSON object in this EXACT format, with no other text:
{
  "questions": [
    {
      "id": 1,
      "question": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "concept": "core-concept-being-tested",
      "difficulty": "beginner"
    },
    {
      "id": 2,
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 2,
      "concept": "another-concept",
      "difficulty": "intermediate"
    },
    {
      "id": 3,
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 1,
      "concept": "advanced-concept",
      "difficulty": "intermediate"
    }
  ]
}

RETURN ONLY THE JSON. No markdown, no backticks, no explanations.`;

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
2. Generate a "Vibe Question" — a specific question about WHY the student used a particular function, pattern, or approach in their code.

The Vibe Question is designed to catch "vibe coders" (people who blindly copy-paste from AI/Stack Overflow without understanding). The question should:
- Reference a SPECIFIC line or function in their submitted code
- Ask WHY they chose that approach (not WHAT it does)
- Be impossible to answer correctly without genuine understanding
- Be conversational but probing, like a tech lead doing a code review

Examples of good Vibe Questions:
- "I see you used useEffect with an empty dependency array on line 5. What would happen if you added 'count' to the dependency array instead, and why did you choose not to?"
- "You're using .map() to iterate here. Could you have used .forEach() instead? What's the fundamental difference that made you pick .map()?"
- "You wrapped this in a try-catch block. What specific error are you anticipating, and what would happen if you removed the try-catch entirely?"

You MUST return ONLY a valid JSON object in this EXACT format:
{
  "isCorrect": true,
  "correctnessScore": 85,
  "feedback": "Brief feedback on what they did well and what needs improvement",
  "codeIssues": ["issue 1 if any", "issue 2 if any"],
  "vibeQuestion": "Your specific vibe question referencing their actual code"
}

RETURN ONLY THE JSON. No markdown, no backticks, no explanations.`;

/**
 * VERIFY EXPLANATION PROMPT — Grades if the user truly understands.
 * 
 * Key design decisions:
 * - Uses a rubric: Understanding (0-40), Specificity (0-30), Accuracy (0-30)
 * - Score >= 60 = PASS (genuine understanding)
 * - Score < 60 = FAIL (likely guessing or surface-level answer)
 * - Provides encouraging but honest feedback
 */
const VERIFY_EXPLANATION_SYSTEM_PROMPT = `You are an expert CS educator grading a student's verbal explanation of their code. Your job is to determine if the student GENUINELY UNDERSTANDS the concept or is just guessing/parroting.

GRADING RUBRIC:
- Understanding (0-40 points): Do they explain the WHY, not just the WHAT?
- Specificity (0-30 points): Do they reference specific behavior, edge cases, or trade-offs?
- Accuracy (0-30 points): Is their explanation technically correct?

PASSING SCORE: 60/100 or higher = PASS (they understand it)
FAILING SCORE: Below 60 = FAIL (likely vibe coding)

Signs of a VIBE CODER (auto-fail patterns):
- "I saw it in a tutorial" without explaining why
- Vague answers like "it just works better" or "it's best practice"
- Repeating the question back as an answer
- Only describing WHAT the code does, never WHY

Signs of GENUINE UNDERSTANDING:
- Explains trade-offs ("I used X instead of Y because...")
- Mentions edge cases or potential issues
- Can explain what would break if they changed the approach
- Uses their own words, not copy-pasted definitions

You MUST return ONLY a valid JSON object in this EXACT format:
{
  "passed": true,
  "score": 75,
  "breakdown": {
    "understanding": 30,
    "specificity": 25,
    "accuracy": 20
  },
  "feedback": "Encouraging and specific feedback about their explanation",
  "isVibeCoder": false,
  "tip": "A specific tip to deepen their understanding of this concept"
}

RETURN ONLY THE JSON. No markdown, no backticks, no explanations.`;

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

        const userPrompt = `Generate a diagnostic test for a student learning: ${stack}

The test should gauge whether they are a Beginner, Intermediate, or Advanced learner.
- Question 1: Test a fundamental/beginner concept
- Question 2: Test an intermediate concept  
- Question 3: Test an intermediate-to-advanced concept

Make questions specific to ${stack} — not generic programming questions.`;

        const raw = await callLLM(DIAGNOSTIC_SYSTEM_PROMPT, userPrompt, 2000, 2);
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
        // Calculate score
        const correct = answers.filter(a => a.selectedIndex === a.correctIndex).length;
        const total = answers.length;
        const percentage = Math.round((correct / total) * 100);

        // Determine level based on score
        let level;
        if (percentage >= 80) {
            level = 'Advanced';
        } else if (percentage >= 50) {
            level = 'Intermediate';
        } else {
            level = 'Beginner';
        }

        // Update user in MongoDB
        if (req.user?._id) {
            await User.findByIdAndUpdate(req.user._id, {
                diagnosticLevel: level,
                diagnosticResults: {
                    score: correct,
                    totalQuestions: total,
                    completedAt: new Date(),
                },
                lastActiveAt: new Date(),
            });

            // Auto-unlock the first module for their stack
            const firstModule = await Module.findOne({
                stack: req.user.selectedStack || 'React',
                order: 1,
                isActive: true
            });

            if (firstModule) {
                await User.findByIdAndUpdate(req.user._id, {
                    $push: {
                        moduleProgress: {
                            moduleId: firstModule._id,
                            status: 'unlocked',
                            unlockedAt: new Date(),
                        }
                    }
                });
            }
        }

        console.log(`✅ [DIAGNOSTIC] User scored ${correct}/${total} (${percentage}%) → Level: ${level}`);

        res.json({
            score: correct,
            totalQuestions: total,
            percentage,
            level,
            message: level === 'Advanced'
                ? '🔥 Impressive! You clearly know your stuff. Let\'s challenge you with advanced modules.'
                : level === 'Intermediate'
                    ? '💪 Solid foundation! You understand the basics. Time to level up your skills.'
                    : '🚀 Great starting point! We\'ll build your fundamentals step by step.',
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
        // Fetch the module to get challenge context
        const module = await Module.findById(moduleId);
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }

        console.log(`🔍 [VIBE CHECK] Reviewing code for module: "${module.title}"`);

        const userPrompt = `CHALLENGE: ${module.challenge}

CONCEPT BEING TESTED: ${module.concept}
DIFFICULTY: ${module.difficulty}
STARTER CODE GIVEN:
\`\`\`
${module.starterCode}
\`\`\`

STUDENT'S SUBMITTED CODE:
\`\`\`
${submittedCode}
\`\`\`

Review this code:
1. Does it correctly solve the challenge?
2. Generate a specific "Vibe Question" about WHY they made a particular choice in their code.
3. The question should be impossible to answer if they just copy-pasted this code without understanding it.`;

        const raw = await callLLM(VIBE_CHECK_SYSTEM_PROMPT, userPrompt, 2000, 2);
        const result = parseJsonFromLLM(raw, {
            isCorrect: null, correctnessScore: null, feedback: null, codeIssues: null, vibeQuestion: null
        });

        // Validate the vibe question exists
        if (!result.vibeQuestion) {
            result.vibeQuestion = `Can you explain the overall approach you took to solve this challenge? Why did you structure your code this way?`;
        }

        // Save the submitted code to user's progress
        const effectiveUserId = userId || req.user?._id;
        if (effectiveUserId) {
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

        console.log(`✅ [VIBE CHECK] Code reviewed. Correct: ${result.isCorrect}. Vibe question generated.`);

        res.json({
            isCorrect: Boolean(result.isCorrect),
            correctnessScore: result.correctnessScore || 0,
            feedback: result.feedback || 'Code review complete.',
            codeIssues: result.codeIssues || [],
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
        // Fetch the module for context
        const module = await Module.findById(moduleId);
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }

        console.log(`📝 [VERIFY] Grading explanation for module: "${module.title}"`);

        const userPrompt = `CONCEPT: ${module.concept}
CHALLENGE: ${module.challenge}
DIFFICULTY: ${module.difficulty}

THE VIBE QUESTION ASKED:
"${vibeQuestion}"

THE STUDENT'S EXPLANATION:
"${userExplanation}"

Grade this explanation. Does the student genuinely understand the concept, or are they just guessing / repeating surface-level knowledge?`;

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
        const modules = await Module.find({ stack, isActive: true }).sort({ order: 1 });

        // Get user's progress for these modules
        let userProgress = [];
        if (req.user?._id) {
            const user = await User.findById(req.user._id).select('moduleProgress diagnosticLevel');
            userProgress = user?.moduleProgress || [];
        }

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
