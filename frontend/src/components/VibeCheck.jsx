import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, XCircle, MessageSquare, ArrowRight, Shield, Lock, Unlock, Brain, Lightbulb, AlertCircle } from 'lucide-react';

const API_BASE = '';

// Client-side validation - detect wrong code IMMEDIATELY without LLM
function performQuickValidation(code, module) {
    const issues = [];
    
    if (!code || code.trim().length === 0) {
        issues.push('Code is empty - write something first');
        return { hasErrors: true, issues, mustUse: [] };
    }

    // Check for common placeholder patterns
    if (/WRITE\s+YOUR\s+CODE|TODO|IMPLEMENT|YOUR\s+CODE\s+HERE|FILL\s+THIS/i.test(code) && code.split('\n').length < 5) {
        issues.push('Looks like a template - replace placeholder comments with actual code');
    }

    // Check if code has any actual logic/keywords
    const hasLogic = /function\s+|const\s+|let\s+|var\s+|if\s*\(|for\s*\(|while\s*\(|return\s+|=>|class\s+|async\s+|await\s+/i.test(code);
    if (!hasLogic) {
        issues.push('No JavaScript logic detected - add functions, variables, or control flow');
    }

    // Check for required keywords from mustUse
    const mustUse = module?.mustUse || [];
    const usedKeywords = [];
    const missingKeywords = [];

    mustUse.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(code)) {
            usedKeywords.push(keyword);
        } else {
            missingKeywords.push(keyword);
        }
    });

    if (missingKeywords.length > 0 && mustUse.length > 0) {
        const missing = missingKeywords.slice(0, 2).join(', ');
        issues.push(`Missing required: ${missing}`);
    }

    // Check for syntax errors (basic)
    try {
        // Count brackets
        const openBrace = (code.match(/{/g) || []).length;
        const closeBrace = (code.match(/}/g) || []).length;
        const openParen = (code.match(/\(/g) || []).length;
        const closeParen = (code.match(/\)/g) || []).length;

        if (openBrace !== closeBrace) {
            issues.push(`Bracket mismatch: ${openBrace} open, ${closeBrace} close`);
        }
        if (openParen !== closeParen) {
            issues.push(`Parenthesis mismatch: ${openParen} open, ${closeParen} close`);
        }
    } catch (e) {
        // ignore
    }

    return {
        hasErrors: issues.length > 0,
        issues,
        usedKeywords,
        missingKeywords
    };
}

function inferLocalLineReference(code) {
    if (!code || typeof code !== 'string') return 'line 1';
    const lines = code.split('\n');
    const target = lines.findIndex((line) => {
        const trimmed = line.trim();
        if (!trimmed || /^import\s+/.test(trimmed) || /^export\s+/.test(trimmed)) return false;
        return /(useEffect|useState|map\(|filter\(|reduce\(|if\s*\(|onChange|set[A-Z]|return\s+|await\s+|try\s*\{)/.test(trimmed);
    });
    return `line ${target >= 0 ? target + 1 : 1}`;
}

function parseLineNumber(lineReference) {
    const match = (lineReference || '').match(/line\s*(\d+)/i);
    return match ? Number(match[1]) : 1;
}

function extractTokenFromQuestion(question = '') {
    const backtick = question.match(/`([^`]+)`/);
    if (backtick && backtick[1]) return backtick[1].trim();
    return '';
}

function findLineByToken(code, token) {
    if (!code || !token) return null;
    const lines = code.split('\n');
    const index = lines.findIndex((line) => line.includes(token));
    return index >= 0 ? index + 1 : null;
}

function resolveFocusLine(code, vibeResult) {
    const fallback = parseLineNumber(vibeResult?.lineReference || inferLocalLineReference(code));
    const question = vibeResult?.vibeQuestion || '';
    const questionLine = parseLineNumber(question);
    const token = extractTokenFromQuestion(question);
    const tokenLine = findLineByToken(code, token);

    const lineNumber = tokenLine || questionLine || fallback;
    return {
        lineNumber: Math.max(1, lineNumber),
        source: tokenLine ? 'token-match' : questionLine ? 'question-line' : 'fallback',
        token,
    };
}

function getCodeLine(code, lineReference) {
    if (!code || typeof code !== 'string') return '';
    const lineNo = parseLineNumber(lineReference);
    const lines = code.split('\n');
    const selected = lines[lineNo - 1] || lines[0] || '';
    return selected.trim();
}

function buildLocalVibeQuestion(code, concept) {
    const lineRef = inferLocalLineReference(code);
    const codeLine = getCodeLine(code, lineRef);
    if (codeLine) {
        return `On ${lineRef}, you wrote "${codeLine}". Why did you choose this line, and what behavior would break if you remove it?`;
    }
    const safeConcept = concept || 'this concept';
    return `On ${lineRef}, why did you choose this ${safeConcept} approach, and what behavior would break if this line is removed?`;
}

export default function VibeCheck({ module, submittedCode, onPass, onFail, onBack }) {
    const [phase, setPhase] = useState('reviewing'); // reviewing | question | explaining | result
    const [vibeResult, setVibeResult] = useState(null);
    const [explanation, setExplanation] = useState('');
    const [finalResult, setFinalResult] = useState(null);
    const [error, setError] = useState(null);
    const [clipboardWarning, setClipboardWarning] = useState('');
    const [submissionTime, setSubmissionTime] = useState(null);
    const [attemptCount, setAttemptCount] = useState(1);
    const [showHint, setShowHint] = useState(false);
    const [validationErrors, setValidationErrors] = useState(null);
    const [lastSubmittedCode, setLastSubmittedCode] = useState('');
    const [resubmittedSameCode, setResubmittedSameCode] = useState(false);
    const effectiveModuleId = module?.moduleId || module?._id;
    const focusInfo = resolveFocusLine(submittedCode, vibeResult);
    const activeLineRef = `line ${focusInfo.lineNumber}`;
    const activeCodeLine = getCodeLine(submittedCode, activeLineRef);
    const codeLines = (submittedCode || '').split('\n');

    useEffect(() => {
        if (!submittedCode || !effectiveModuleId) return;

        // CHECK: Did they submit the exact same code twice without fixing?
        if (lastSubmittedCode === submittedCode && attemptCount > 1) {
            setResubmittedSameCode(true);
            setPhase('question');
            return;
        }

        setResubmittedSameCode(false);
        setLastSubmittedCode(submittedCode);

        // FIRST: Run client-side validation to get warnings
        const validation = performQuickValidation(submittedCode, module);
        setValidationErrors(validation.hasErrors ? validation : null);

        // ALWAYS send to backend for AI analysis (validation errors are just warnings)
        fetch(`${API_BASE}/api/v1/challenge/vibe-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleId: effectiveModuleId, submittedCode }),
            credentials: 'include'
        })
            .then(res => {
                return res.json().then((data) => {
                    if (!res.ok) {
                        throw new Error(data?.error || 'Vibe check failed');
                    }
                    return data;
                });
            })
            .then(data => {
                setVibeResult(data);
                setSubmissionTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                setPhase('question');
            })
            .catch(err => {
                console.error('Vibe check error:', err);
                setError(err.message);
                setVibeResult({
                    isCorrect: false,
                    feedback: 'AI review service had an issue. Local fallback question generated from your code.',
                    vibeQuestion: buildLocalVibeQuestion(submittedCode, module?.concept),
                    lineReference: inferLocalLineReference(submittedCode),
                    codeIssues: [err.message],
                    isLikelyAIGenerated: false,
                    aiSignals: [],
                });
                setPhase('question');
            });
    }, [submittedCode, effectiveModuleId]);

    const handleSubmitExplanation = async () => {
        if (explanation.trim().length < 15) {
            setError('Explanation too short. Prove your understanding.');
            return;
        }

        setPhase('explaining');
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/v1/challenge/verify-explanation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moduleId: effectiveModuleId,
                    vibeQuestion: vibeResult?.vibeQuestion || 'Explain your approach in detail.',
                    userExplanation: explanation
                }),
                credentials: 'include'
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Verification failed');
            setFinalResult(data);
            setPhase('result');
        } catch (err) {
            console.error('Verify error:', err);
            setError(err.message);
            setPhase('question');
        }
    };

    const blockClipboardAction = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setClipboardWarning('Copy/paste is disabled in the final gateway. Explain in your own words.');
    };

    return (
        <div className="max-w-4xl mx-auto py-8 font-mono">
            <AnimatePresence mode="wait">
                {/* REVIEW PHASE */}
                {phase === 'reviewing' && (
                    <motion.div key="rev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-white border-4 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                            <Shield size={80} className="text-[#FF3366]" fill="#FF3366" fillOpacity={0.1} />
                        </motion.div>
                        <h2 className="text-3xl font-black uppercase mt-8 tracking-tighter">Scanning Neural Logic...</h2>
                        <p className="text-gray-400 font-bold mt-2 uppercase text-xs">AI is auditing your submission</p>
                    </motion.div>
                )}

                {/* QUESTION PHASE */}
                {phase === 'question' && (
                    <motion.div key="q" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
                        {/* Static Header */}
                        <div className="flex items-center gap-4">
                            <div className="bg-[#FF3366] text-white border-4 border-black px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 tracking-wide">
                                <Shield size={14} />
                                <span>FINAL GATEWAY</span>
                                <span className="opacity-70">|</span>
                                <span className="bg-black/20 px-2 py-0.5">VIBE CHECK</span>
                            </div>
                            <div className="flex-1 border-b-4 border-dashed border-gray-200" />
                        </div>

                        {/* CLIENT-SIDE VALIDATION WARNINGS */}
                        {validationErrors && (
                            <div className="border-4 border-[#FFA500] bg-[#FFF8E7] p-4 text-black">
                                <p className="text-xs font-black uppercase mb-2 text-[#FF6B00]">⚠️ CODE QUALITY WARNINGS (from client):</p>
                                <div className="space-y-1">
                                    {validationErrors.issues.map((issue, idx) => (
                                        <p key={idx} className="text-xs font-bold text-[#662D00]">• {issue}</p>
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold mt-2 text-black/60">👉 You can still submit, but consider fixing these first.</p>
                            </div>
                        )}

                        {/* AI Code Feedback */}
                        {vibeResult && (
                            <div className={`border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${vibeResult.isCorrect ? 'bg-[#33FF66]' : 'bg-[#FF3366] text-white'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {vibeResult.isCorrect ? <CheckCircle size={28} /> : <XCircle size={28} />}
                                    <h3 className="font-black text-xl uppercase tracking-tight">
                                        {vibeResult.isCorrect ? 'Logic Validated' : 'Logic Flaw Detected'}
                                    </h3>
                                </div>
                                <p className="font-bold text-sm leading-relaxed mb-4">{vibeResult.feedback}</p>
                                <div className="pt-4 border-t-2 border-black/20 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-black uppercase tracking-wide">
                                    <div>Focus Line: {vibeResult.lineReference || 'line 1'}</div>
                                    <div>Confidence: {vibeResult.correctnessScore || 0}/100</div>
                                </div>
                                {vibeResult.isLikelyAIGenerated && (
                                    <div className="mt-3 p-3 border-2 border-black bg-white text-black text-[11px] font-bold">
                                        AI-Pattern Alert: Response style looks templated. Explain your own reasoning in detail.
                                    </div>
                                )}
                                {Array.isArray(vibeResult.aiSignals) && vibeResult.aiSignals.length > 0 && (
                                    <div className="mt-3 text-[11px] font-bold leading-relaxed">
                                        {vibeResult.aiSignals.slice(0, 2).map((signal, idx) => (
                                            <div key={idx}>- {signal}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {vibeResult?.isCorrect ? (
                            <>
                                {/* THE VIBE QUESTION CARD */}
                                <div className="bg-[#FFD700] border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h3 className="font-black text-xs uppercase flex items-center gap-2 bg-black text-white px-3 py-1 inline-flex">
                                            <MessageSquare size={14} /> The Vibe Question
                                        </h3>
                                        <span className="text-[10px] font-black uppercase text-black/70 tracking-widest">Answer should be line-specific</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                                        <div className="md:col-span-2 border-4 border-black bg-white overflow-hidden" onCopy={blockClipboardAction} onCut={blockClipboardAction} onPaste={blockClipboardAction} onContextMenu={blockClipboardAction}>
                                            <div className="px-3 py-2 bg-black text-white text-[10px] font-black uppercase tracking-wide">
                                                Referenced Code ({activeLineRef})
                                            </div>
                                            <pre className="px-4 py-3 text-sm font-black leading-relaxed whitespace-pre-wrap break-words select-none">{activeCodeLine || 'No code line detected.'}</pre>
                                        </div>
                                        <div className="md:col-span-3 bg-white border-4 border-black p-5" onCopy={blockClipboardAction} onCut={blockClipboardAction} onPaste={blockClipboardAction} onContextMenu={blockClipboardAction}>
                                            <p className="text-lg md:text-xl font-black leading-tight tracking-tight">
                                                {vibeResult?.vibeQuestion || buildLocalVibeQuestion(submittedCode, module?.concept)}
                                            </p>
                                        </div>
                                    </div>

                                    {submittedCode && (
                                        <details className="mb-4 border-4 border-black bg-white overflow-hidden group" onCopy={blockClipboardAction} onCut={blockClipboardAction} onPaste={blockClipboardAction} onContextMenu={blockClipboardAction}>
                                            <summary className="px-4 py-2 bg-[#111] text-white text-[10px] font-black uppercase tracking-wide cursor-pointer list-none flex items-center justify-between">
                                                <span>Full Submitted Code {focusInfo.source === 'token-match' ? `(matched: ${focusInfo.token})` : ''}</span>
                                                <span className="group-open:rotate-90 transition-transform">&gt;</span>
                                            </summary>
                                            <div className="px-4 py-1 text-[10px] font-black uppercase tracking-wide text-black/50 border-b-2 border-black/10 bg-[#f8f8f8]">
                                                Expand to inspect complete code context
                                            </div>
                                            <div className="max-h-56 overflow-y-auto">
                                                {codeLines.map((line, index) => {
                                                    const lineNo = index + 1;
                                                    const isFocus = lineNo === focusInfo.lineNumber;
                                                    return (
                                                        <div
                                                            key={lineNo}
                                                            className={`grid grid-cols-[48px_1fr] gap-3 px-3 py-1 text-[12px] font-bold leading-relaxed ${isFocus ? 'bg-[#FFF4B2]' : 'bg-white'}`}
                                                        >
                                                            <span className={`text-right ${isFocus ? 'text-black font-black' : 'text-black/40'}`}>{lineNo}</span>
                                                            <pre className="whitespace-pre-wrap break-words select-none">{line || ' '}</pre>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    )}

                                    <div className="bg-white border-4 border-black p-4">
                                        <div className="text-[10px] font-black uppercase mb-2 text-black/70 tracking-wider">Your answer must cover</div>
                                        <div className="text-[11px] font-bold leading-relaxed">
                                            1. Why this line was chosen
                                        </div>
                                        <div className="text-[11px] font-bold leading-relaxed">
                                            2. What exact behavior this line controls
                                        </div>
                                        <div className="text-[11px] font-bold leading-relaxed">
                                            3. What breaks if this line changes or is removed
                                        </div>
                                    </div>
                                </div>

                                {/* Explanation Area */}
                                <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
                                    <div className="bg-gray-100 px-4 py-2 border-b-2 border-black flex justify-between">
                                        <span className="text-[9px] font-black uppercase text-gray-400">Response Terminal</span>
                                        <span className="text-[9px] font-black uppercase text-gray-400">{explanation.length} Chars</span>
                                    </div>
                                    <textarea
                                        value={explanation}
                                        onChange={(e) => { setExplanation(e.target.value); setError(null); }}
                                        onPaste={blockClipboardAction}
                                        className="w-full h-64 p-6 font-mono text-sm font-bold focus:outline-none bg-white"
                                        placeholder="Explain this line: why you used it, what it does, and what breaks if removed."
                                    />
                                </div>

                                {clipboardWarning && (
                                    <div className="p-4 border-4 border-black bg-[#E3F2FF] text-[#003B70] font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        {clipboardWarning}
                                    </div>
                                )}

                                {error && (
                                    <div className="mb-6 p-4 border-4 border-black bg-[#FF3366] text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        ⚠️ {error}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button onClick={onBack} className="px-8 py-4 border-4 border-black font-black uppercase text-sm hover:bg-gray-50 transition-all">
                                        Revise Code
                                    </button>
                                    <button
                                        onClick={handleSubmitExplanation}
                                        className="flex-1 bg-[#00F0FF] border-4 border-black px-8 py-5 font-black text-xl uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Send size={20} /> VALIDATE INTEL
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-black uppercase flex items-center gap-2">
                                        <XCircle size={20} className="text-[#FF3366]" />
                                        TRY AGAIN
                                    </h3>
                                    {submissionTime && (
                                        <p className="text-[10px] font-black text-black/50 uppercase">
                                            SUBMITTED AT {submissionTime}
                                        </p>
                                    )}
                                </div>

                                {/* RE-SUBMISSION WARNING */}
                                {resubmittedSameCode && (
                                    <div className="mb-4 p-4 border-4 border-[#FF6B00] bg-[#FFE8D6] text-[#663300] font-black uppercase text-sm">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle size={20} className="mt-1 flex-shrink-0" />
                                            <div>
                                                <p>YOU RESUBMITTED THE SAME CODE</p>
                                                <p className="text-xs mt-1 font-bold">You need to CHANGE the code before resubmitting. Use the hint below to guide your fix.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Score Display */}
                                {vibeResult?.correctnessScore !== undefined && (
                                    <div className="mb-4 p-3 border-4 border-black bg-[#FFE145] text-black font-black uppercase text-lg">
                                        SCORE {vibeResult.correctnessScore}/100
                                    </div>
                                )}

                                {/* Error Details */}
                                {vibeResult?.feedback && (
                                    <div className="mb-4 p-4 border-4 border-black bg-[#FF3366] text-white font-black uppercase text-sm">
                                        ⚠️ {vibeResult.feedback}
                                    </div>
                                )}

                                {/* Code Issues */}
                                {Array.isArray(vibeResult?.codeIssues) && vibeResult.codeIssues.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-black uppercase text-black/70 mb-2">Issues Found:</p>
                                        <div className="space-y-1 bg-[#FFE8E8] p-3 border-2 border-black">
                                            {vibeResult.codeIssues.slice(0, 3).map((issue, idx) => (
                                                <p key={idx} className="text-xs font-bold text-[#B00020]">- {issue}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* HINT SECTION - Show when validation errors or low confidence */}
                                {(validationErrors || vibeResult?.correctnessScore < 50 || resubmittedSameCode) && (
                                    <div className="mb-4">
                                        <button
                                            onClick={() => setShowHint(!showHint)}
                                            className="w-full px-4 py-3 border-4 border-[#FFD700] bg-[#FFFACD] text-black font-black uppercase text-sm hover:shadow-[4px_4px_0px_0px_rgba(255,215,0,0.5)] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Lightbulb size={16} className="text-[#FFD700]" />
                                            {showHint ? 'HIDE' : 'REQUEST'} HINT
                                        </button>

                                        {showHint && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 p-4 border-4 border-[#FFD700] bg-[#FFFACD] text-black"
                                            >
                                                <p className="text-[10px] font-black uppercase text-black/60 mb-2">💡 HINT FROM MODULE:</p>
                                                <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                                                    {module?.challenge_hint || 
                                                     `Focus: Use ${module?.mustUse?.slice(0, 2).join(' and ') || 'the required API'} to solve this.\n\nStart with: ${module?.acceptanceCriteria?.[0] || 'Write clean, intentional code'}`}
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* Attempt Info */}
                                {attemptCount > 1 && (
                                    <div className="mb-4 p-3 border-2 border-black bg-[#F0F0F0] text-[10px] font-black uppercase">
                                        Attempt #{attemptCount}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-5">
                                    <button 
                                        onClick={() => {
                                            setAttemptCount(attemptCount + 1);
                                            setShowHint(false);
                                            onBack();
                                        }} 
                                        className="flex-1 px-6 py-4 border-4 border-black bg-[#00F0FF] font-black uppercase text-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all"
                                    >
                                        Fix & Retry
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* GRADING PHASE */}
                {phase === 'explaining' && (
                    <motion.div key="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-white border-4 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                            <Brain size={80} className="text-[#00F0FF]" />
                        </motion.div>
                        <h2 className="text-3xl font-black uppercase mt-8 tracking-tighter">Grading Explanation...</h2>
                        <p className="text-gray-400 font-bold mt-2 uppercase text-xs">AI is checking conceptual density</p>
                    </motion.div>
                )}

                {/* RESULT PHASE */}
                {phase === 'result' && finalResult && (
                    <motion.div key="res" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl mx-auto">
                        <div className={`border-8 border-black p-10 text-center shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] ${finalResult.passed ? 'bg-[#33FF66]' : 'bg-[#FF3366] text-white'}`}>
                            {finalResult.passed ? <Unlock size={80} className="mx-auto mb-6" /> : <Lock size={80} className="mx-auto mb-6" />}
                            <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
                                {finalResult.passed ? 'PASSED' : 'DENIED'}
                            </h1>
                            <div className="text-7xl font-black mb-8">{finalResult.score}</div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                {Object.entries(finalResult.breakdown || {}).map(([key, val]) => (
                                    <div key={key} className="bg-white/20 border-4 border-black p-3">
                                        <p className="text-[10px] font-black uppercase opacity-60">{key}</p>
                                        <p className="text-2xl font-black">{val}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white border-4 border-black p-6 mb-8 text-black text-left">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">AI Critique:</h4>
                                <p className="font-bold text-sm leading-relaxed uppercase">{finalResult.feedback}</p>
                            </div>

                            {finalResult.passed ? (
                                <button
                                    onClick={() => onPass(finalResult)}
                                    className="w-full bg-black text-white border-4 border-black py-6 font-black text-2xl uppercase shadow-[8px_8px_0px_0px_rgba(255,51,102,1)] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(255,51,102,1)] transition-all flex justify-center items-center gap-3"
                                >
                                    CONTINUE MISSION <ArrowRight size={32} />
                                </button>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={() => onFail(finalResult)}
                                        className="w-full bg-black text-white border-4 border-black py-6 font-black text-2xl uppercase hover:bg-gray-900 transition-all flex justify-center items-center gap-3"
                                    >
                                        RETRY MODULE <ArrowRight size={32} />
                                    </button>
                                    <button onClick={onBack} className="text-xs font-black uppercase underline decoration-4 underline-offset-4">
                                        Back to Code Editor
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
