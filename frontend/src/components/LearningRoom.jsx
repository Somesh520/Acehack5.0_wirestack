import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { BookOpen, Code2, Send, ArrowLeft, Lightbulb, AlertTriangle, Zap, Sparkles, FlaskConical, MessageSquareQuote, ListChecks } from 'lucide-react';

export default function LearningRoom({ module, onSubmitCode, onBack }) {
    const [code, setCode] = useState('// Write your code here\n');
    const [showHint, setShowHint] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [clipboardWarning, setClipboardWarning] = useState('');
    const editorRef = useRef(null);

    const conceptSections = generateConceptContent(module);
    const initialEditorCode = useMemo(() => getSafeStarterCode(module), [module]);
    const coachQuestions = useMemo(() => {
        if (Array.isArray(module?.coachQuestions) && module.coachQuestions.length > 0) {
            return module.coachQuestions.slice(0, 3);
        }
        return [
            `Why is ${module?.concept || 'this approach'} suitable for this challenge?`,
            'What trade-off did you accept, and what alternative did you reject?',
            'If this breaks in production, which line will you inspect first to isolate the issue and why?'
        ];
    }, [module]);
    const mustUse = useMemo(() => {
        if (Array.isArray(module?.mustUse) && module.mustUse.length > 0) {
            return module.mustUse.slice(0, 4);
        }
        if (/useeffect/i.test(module?.concept || '')) return ['useEffect', 'dependency array', 'cleanup function'];
        if (/form|input|controlled/i.test(module?.concept || '')) return ['useState', 'onChange', 'controlled value'];
        return ['concept-specific API', 'state or data flow', 'error/edge handling'];
    }, [module]);
    const acceptanceCriteria = useMemo(() => {
        if (Array.isArray(module?.acceptanceCriteria) && module.acceptanceCriteria.length > 0) {
            return module.acceptanceCriteria.slice(0, 3);
        }
        return [
            `Code clearly demonstrates ${module?.concept || 'the target concept'}.`,
            'The required APIs are present and used intentionally.',
            'Behavior works for both happy path and one edge case.'
        ];
    }, [module]);
    const submitGate = useMemo(
        () => validateSubmissionCode(module, code, mustUse),
        [module, code, mustUse]
    );

    const handleEditorMount = (editor) => {
        editorRef.current = editor;
        editor.onKeyDown((e) => {
            const nativeEvent = e?.browserEvent;
            if (!nativeEvent) return;

            const isMetaKey = nativeEvent.metaKey || nativeEvent.ctrlKey;
            const actionKey = (nativeEvent.key || '').toLowerCase();

            if (isMetaKey && ['c', 'v', 'x', 'a'].includes(actionKey)) {
                e.preventDefault();
                e.stopPropagation();
                nativeEvent.preventDefault();
                setClipboardWarning('Copy/paste and select-all are disabled during this challenge.');
            }
        });
        editor.focus();
    };

    const blockClipboardAction = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setClipboardWarning('Copy/paste is disabled in this challenge environment.');
    };

    useEffect(() => {
        setCode(initialEditorCode);
        if (editorRef.current) {
            editorRef.current.setValue(initialEditorCode);
        }
    }, [initialEditorCode]);

    const handleSubmit = () => {
        const currentCode = editorRef.current?.getValue() || code;
        const gate = validateSubmissionCode(module, currentCode, mustUse);
        if (!gate.isValid) {
            setSubmitError(`Warning: ${gate.issues[0] || 'Potential issue detected'}. AI review will still run.`);
        } else {
            setSubmitError('');
        }
        onSubmitCode(currentCode);
    };

    const applyDemoSnippet = () => {
        const demoCode = module?.demoSnippet;
        if (!demoCode) return;
        editorRef.current?.setValue(demoCode);
        setCode(demoCode);
    };

    if (!module) return null;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col font-mono bg-[linear-gradient(180deg,#f7f7f2_0%,#f1f1e8_100%)] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Top Action Bar */}
            <div className="px-4 py-3 border-b-4 border-black bg-[#FFE145] flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 px-4 py-2 border-4 border-black bg-white font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    <ArrowLeft size={14} /> Back To Roadmap
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Learning Room</span>
            </div>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Concept Panel */}
                <div className="w-[420px] shrink-0 border-r-4 border-black bg-[#f2f2f4] flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b-4 border-black bg-[#FFD700] shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen size={20} />
                                <h3 className="font-black text-sm uppercase">Conceptual Intel</h3>
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase mt-1 opacity-70">Target: {module.concept}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {conceptSections.map((section, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                {section.type === 'heading' && (
                                    <h4 className="font-black text-sm uppercase flex items-center gap-2 mb-3 text-[#FF3366]">
                                        <Zap size={14} fill="currentColor" /> {section.content}
                                    </h4>
                                )}
                                {section.type === 'text' && (
                                    <p className="text-xs font-bold leading-relaxed text-gray-700">
                                        {section.content}
                                    </p>
                                )}
                                {section.type === 'important' && (
                                    <div className="bg-white border-3 border-black p-3 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex gap-2">
                                        <Sparkles size={14} className="shrink-0 mt-0.5 text-[#00F0FF]" />
                                        <span>{section.content}</span>
                                    </div>
                                )}
                                {section.type === 'warning' && (
                                    <div className="bg-[#FF3366] text-white border-3 border-black p-3 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex gap-2">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>{section.content}</span>
                                    </div>
                                )}
                                {section.type === 'code' && (
                                    <pre className="bg-black text-[#33FF66] border-2 border-black p-4 text-[10px] overflow-x-auto font-mono">
                                        {section.content}
                                    </pre>
                                )}
                            </motion.div>
                        ))}

                        <div className="pt-6 border-t-2 border-dashed border-gray-300">
                            <button
                                onClick={() => setShowHint(!showHint)}
                                className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors text-[10px] font-black uppercase mb-4"
                            >
                                <Lightbulb size={14} /> {showHint ? 'HIDE INTEL' : 'REQUEST HINT?'}
                            </button>
                            <AnimatePresence>
                                {showHint && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <p className="p-3 bg-white border-2 border-black mt-2 text-[10px] font-bold text-gray-500 italic">
                                            {module.challenge_hint || `Deep dive into ${module.concept} fundamentals.` || 'Conceptual intelligence required for deployment.'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                <div className="px-4 py-3 border-b-4 border-black bg-[#3EFFB2] flex items-center gap-2">
                                    <ListChecks size={14} />
                                    <h4 className="font-black text-[10px] uppercase">Must Use In Your Code</h4>
                                </div>
                                <div className="p-4 space-y-2">
                                    {mustUse.map((item, index) => (
                                        <p key={index} className="text-[10px] font-bold text-gray-700 leading-relaxed">
                                            {index + 1}. {item}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                <div className="px-4 py-3 border-b-4 border-black bg-[#FFB703] flex items-center gap-2">
                                    <ListChecks size={14} />
                                    <h4 className="font-black text-[10px] uppercase">Acceptance Criteria</h4>
                                </div>
                                <div className="p-4 space-y-2">
                                    {acceptanceCriteria.map((item, index) => (
                                        <p key={index} className="text-[10px] font-bold text-gray-700 leading-relaxed">
                                            {index + 1}. {item}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {(module?.demoScenario || module?.demoSnippet) && (
                                <div className="mt-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                    <div className="px-4 py-3 border-b-4 border-black bg-[#00F0FF] flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <FlaskConical size={14} />
                                            <h4 className="font-black text-[10px] uppercase">Live Demo Blueprint</h4>
                                        </div>
                                        {module?.demoSnippet && (
                                            <button
                                                onClick={applyDemoSnippet}
                                                className="px-2 py-1 border-2 border-black bg-white text-[9px] font-black uppercase hover:bg-[#FFE145]"
                                            >
                                                Use Demo Snippet
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <p className="text-[11px] font-black uppercase text-black/70">
                                            {module?.demoTitle || `Mini Demo: ${module?.concept || 'Core Topic'}`}
                                        </p>
                                        <p className="text-[11px] font-bold leading-relaxed text-gray-700">
                                            {module?.demoScenario || `Create a compact demo to prove ${module?.concept || 'this concept'} in action with official docs patterns.`}
                                        </p>

                                        {Array.isArray(module?.demoSteps) && module.demoSteps.length > 0 && (
                                            <div className="space-y-2">
                                                {module.demoSteps.slice(0, 3).map((step, index) => (
                                                    <div key={index} className="flex items-start gap-2 text-[10px] font-bold text-gray-700">
                                                        <span className="mt-0.5 w-5 h-5 border-2 border-black bg-[#FFE145] flex items-center justify-center text-[9px] font-black">
                                                            {index + 1}
                                                        </span>
                                                        <span>{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                <div className="px-4 py-3 border-b-4 border-black bg-[#FFE145] flex items-center gap-2">
                                    <MessageSquareQuote size={14} />
                                    <h4 className="font-black text-[10px] uppercase">Code Explain Drill</h4>
                                </div>
                                <div className="p-4 space-y-2">
                                    {coachQuestions.map((question, index) => (
                                        <p key={index} className="text-[10px] font-bold text-gray-700 leading-relaxed">
                                            Q{index + 1}. {question}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Official Docs Link */}
                            {module.docs_url && (
                                <div className="mt-6 pt-6 border-t-[4px] border-black">
                                    <h4 className="text-[10px] font-black uppercase text-black/30 mb-3 tracking-widest italic">-- SOURCE_OF_TRUTH --</h4>
                                    <a 
                                        href={module.docs_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-black uppercase hover:bg-[#FF3EA5] transition-all group"
                                    >
                                        <BookOpen size={12} className="group-hover:rotate-12 transition-transform" />
                                        EXPLORE_OFFICIAL_DOCS
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Editor Area */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    {/* Challenge Header */}
                    <div className="px-6 py-4 border-b-4 border-black bg-[#00F0FF]">
                        <h3 className="font-black text-xs uppercase flex items-center gap-2">
                            <Code2 size={16} /> Mission Objective:
                        </h3>
                        <p className="text-[11px] font-bold mt-2 leading-relaxed text-black/80">{module.challenge}</p>
                    </div>

                    {/* Editor header */}
                    <div className="px-4 py-2 border-b-2 border-black bg-gray-50 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                            MONACO SOURCE EDITOR (AUTO-COMPLETE DISABLED)
                        </span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 rounded-full border border-black bg-white" />)}
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div
                        className="flex-1 relative"
                        onCopy={blockClipboardAction}
                        onCut={blockClipboardAction}
                        onPaste={blockClipboardAction}
                        onContextMenu={blockClipboardAction}
                    >
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            value={code}
                            theme="light"
                            onMount={handleEditorMount}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                tabSize: 2,
                                wordWrap: 'on',
                                suggestOnTriggerCharacters: false,
                                quickSuggestions: false,
                                parameterHints: { enabled: false },
                                padding: { top: 20, bottom: 20 },
                                renderLineHighlight: 'none',
                                hideCursorInOverviewRuler: true,
                                overviewRulerBorder: false,
                                contextmenu: false,
                                dragAndDrop: false,
                            }}
                        />
                    </div>

                    {/* Submit Footer */}
                    <div className="px-6 py-4 border-t-4 border-black bg-white flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase">
                                <AlertTriangle size={12} fill="#FF3366" stroke="white" /> Vibe-Coding Detection Active
                            </div>
                            {!submitGate.isValid && (
                                <div className="mt-2 border-2 border-black bg-[#FFE8E8] px-3 py-2 text-[10px] font-black text-[#B00020] uppercase">
                                    {submitGate.issues[0]}
                                </div>
                            )}
                            {submitError && (
                                <div className="mt-2 border-2 border-black bg-[#FFF3CD] px-3 py-2 text-[10px] font-black text-black uppercase">
                                    {submitError}
                                </div>
                            )}
                            {clipboardWarning && (
                                <div className="mt-2 border-2 border-black bg-[#E3F2FF] px-3 py-2 text-[10px] font-black text-[#003B70] uppercase">
                                    {clipboardWarning}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSubmit}
                            className={`px-8 py-3 border-4 border-black font-black text-sm uppercase transition-all flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none cursor-pointer ${submitGate.isValid ? 'bg-[#33FF66] text-black' : 'bg-[#FFE145] text-black'}`}
                        >
                            <Send size={18} /> {submitGate.isValid ? 'INITIATE VIBE CHECK' : 'SUBMIT ANYWAY'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function generateConceptContent(module) {
    if (!module) return [];
    
    const sections = [
        { type: 'heading', content: `Core Intel: ${module.concept || 'Mission Objective'}` },
    ];

    if (module.theory) {
        const chunks = module.theory
            .split(/\n\n+/)
            .map((chunk) => chunk.trim())
            .filter(Boolean);

        chunks.forEach((chunk, idx) => {
            if (idx > 0) {
                sections.push({ type: 'heading', content: idx === 1 ? 'How It Works' : 'Why It Matters' });
            }
            sections.push({ type: 'text', content: chunk });
        });
    } else {
        sections.push({ type: 'text', content: module.description || 'Analyzing mission parameters...' });
        sections.push({ type: 'heading', content: 'Operational Mechanics' });
        sections.push({ type: 'text', content: `Focus on the underlying architecture of ${module.concept || 'the target stack'}. Understanding the execution flow is critical.` });
    }

    sections.push({ type: 'important', content: `Understanding the WHY is mandatory for this mission.` });
    sections.push({ type: 'warning', content: `Relying on "Vibe" leads to critical failure during code deployment.` });
    
    return sections;
}

function isInvalidStarterCode(raw) {
        if (typeof raw !== 'string') return true;
        const trimmed = raw.trim();

        if (!trimmed) return true;
        if (/^https?:\/\/\S+$/i.test(trimmed)) return true;
        if (trimmed.length < 30) return true;

        const looksLikeCode = /(import\s+|export\s+|function\s+|const\s+|let\s+|var\s+|=>|return\s+|class\s+|<\w+)/.test(trimmed);
        return !looksLikeCode;
}

function isFillFriendlyStarter(raw) {
    if (typeof raw !== 'string') return false;
    const content = raw.trim();
    if (!content) return false;

    // Keep only scaffolds that still require the learner to implement core logic.
    const hasTodoHint = /TODO|IMPLEMENT|FILL|YOUR\s+CODE|WRITE\s+YOUR\s+CODE/i.test(content);
    const hasCompleteBehavior = /set\w+\s*\(\s*\(\w+\)\s*=>\s*\w+\s*[+\-*/]/.test(content)
        || /fetch\s*\(/.test(content)
        || /onClick\s*=\s*\{\s*\(.*\)\s*=>\s*set\w+/.test(content)
        || /return\s+\{\s*ok:\s*true/.test(content);

    if (!hasTodoHint) return false;
    return !hasCompleteBehavior;
}

function getSafeStarterCode(module) {
    const candidate = module?.starterCode;
    if (!isInvalidStarterCode(candidate) && isFillFriendlyStarter(candidate)) return candidate;

    const concept = module?.concept || 'core topic';
    const challenge = module?.challenge || 'complete the objective';
    const isReact = /react/i.test(module?.docs_url || '') || /react/i.test(module?.title || '') || /useState|useEffect|jsx/i.test(concept);

    if (isReact) {
        return `import { useState } from 'react';

export default function MissionComponent() {
    const [value, setValue] = useState(0);

    // TODO 1: Add required state handlers
    // TODO 2: Wire user interactions
    // TODO 3: Implement the mission behavior safely
    // ${challenge}

    const handlePrimaryAction = () => {
        // TODO: implement primary action
    };

    const handleSecondaryAction = () => {
        // TODO: implement secondary action
    };

    return (
        <section>
            <h2>${concept}</h2>
            <p>Value: {value}</p>
            <button onClick={handlePrimaryAction}>Primary Action</button>
            <button onClick={handleSecondaryAction}>Secondary Action</button>
        </section>
    );
}`;
    }

    return `function solveMission(input) {
    // TODO 1: Validate input
    // TODO 2: Apply ${concept}
    // TODO 3: Return final response shape
    // Challenge: ${challenge}
    if (!input) {
        return { ok: false, reason: 'input required' };
    }

    // TODO: replace this placeholder with actual solution
    return {
        ok: true,
        result: null,
    };
}

module.exports = { solveMission };`;
}

function normalizeToken(value) {
    return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hasBalancedDelimiters(code) {
    const pairs = { ')': '(', '}': '{', ']': '[' };
    const opens = new Set(['(', '{', '[']);
    const stack = [];

    for (const ch of code) {
        if (opens.has(ch)) stack.push(ch);
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

function validateSubmissionCode(module, code, mustUse = []) {
    const issues = [];
    const raw = (code || '').trim();

    if (!raw) {
        issues.push('Code is empty. Pehle implementation likho.');
    }

    if (raw.length > 0 && raw.length < 40) {
        issues.push('Code bahut short hai. Meaningful implementation do.');
    }

    if (raw && !hasBalancedDelimiters(raw)) {
        issues.push('Code structure issue: brackets/parentheses balanced nahi lag rahe.');
    }

    const normalizedCode = normalizeToken(raw);
    const required = Array.isArray(mustUse) ? mustUse : [];
    for (const token of required) {
        const normalizedToken = normalizeToken(token);
        if (normalizedToken && !normalizedCode.includes(normalizedToken)) {
            issues.push(`Required concept missing: ${token}`);  
            break;
        }
    }

    const challenge = (module?.challenge || '').toLowerCase();
    const concept = (module?.concept || '').toLowerCase();
    const needsEdgeCaseCheck = /input|form|fetch|api|empty|null|undefined|validation/.test(challenge) || /input|form|state/.test(concept);

    if (raw && needsEdgeCaseCheck && !hasEmptyEdgeCaseHandling(raw)) {
        issues.push('Empty edge case handle karo (if !value, trim check, ya default fallback).');
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
}
