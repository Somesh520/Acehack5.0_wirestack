import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, XCircle, Loader2, MessageSquare, ArrowRight, Shield, Lock, Unlock, Sparkles } from 'lucide-react';

const API_BASE = '';

export default function VibeCheck({ module, submittedCode, onPass, onFail, onBack }) {
    const [phase, setPhase] = useState('reviewing'); // reviewing | question | explaining | result
    const [vibeResult, setVibeResult] = useState(null);
    const [explanation, setExplanation] = useState('');
    const [finalResult, setFinalResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!submittedCode || !module?._id) return;

        fetch(`${API_BASE}/api/v1/challenge/vibe-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleId: module._id, submittedCode }),
            credentials: 'include'
        })
            .then(res => {
                if (!res.ok) throw new Error('Vibe check failed');
                return res.json();
            })
            .then(data => {
                setVibeResult(data);
                setPhase('question');
            })
            .catch(err => {
                console.error('Vibe check error:', err);
                setError(err.message);
                setPhase('question');
            });
    }, [submittedCode, module?._id]);

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
                    moduleId: module._id,
                    vibeQuestion: vibeResult?.vibeQuestion || 'Explain your approach in detail.',
                    userExplanation: explanation
                }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Verification failed');
            const data = await res.json();
            setFinalResult(data);
            setPhase('result');
        } catch (err) {
            console.error('Verify error:', err);
            setError(err.message);
            setPhase('question');
        }
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
                    <motion.div key="q" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        {/* Static Header */}
                        <div className="mb-10 flex items-center gap-4">
                            <div className="bg-[#FF3366] text-white border-4 border-black px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                                <Shield size={16} /> Final Gateway: Vibe Check
                            </div>
                            <div className="flex-1 border-b-4 border-dashed border-gray-200" />
                        </div>

                        {/* Code Feedback */}
                        {vibeResult && (
                            <div className={`border-4 border-black p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${vibeResult.isCorrect ? 'bg-[#33FF66]' : 'bg-[#FF3366] text-white'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {vibeResult.isCorrect ? <CheckCircle size={28} /> : <XCircle size={28} />}
                                    <h3 className="font-black text-xl uppercase tracking-tight">
                                        {vibeResult.isCorrect ? 'Logic Validated' : 'Logic Flaw Detected'}
                                    </h3>
                                </div>
                                <p className="font-bold text-sm leading-relaxed">{vibeResult.feedback}</p>
                            </div>
                        )}

                        {/* THE VIBE QUESTION CARD */}
                        <div className="bg-[#FFD700] border-4 border-black p-8 mb-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="font-black text-xs uppercase flex items-center gap-2 mb-4 bg-black text-white px-3 py-1 inline-block">
                                <MessageSquare size={14} /> The Vibe Question:
                            </h3>
                            <div className="bg-white border-4 border-black p-6 text-xl font-black leading-tight tracking-tight mb-4">
                                "{vibeResult?.vibeQuestion || 'How does your solution handle the core requirements of this module?'}"
                            </div>
                            <p className="text-[10px] font-black uppercase opacity-60">
                                Explain the 'Why'. If you copy-pasted or used AI to generate this without understanding, you will fail.
                            </p>
                        </div>

                        {/* Explanation Area */}
                        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] mb-8 overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 border-b-2 border-black flex justify-between">
                                <span className="text-[9px] font-black uppercase text-gray-400">Response Terminal</span>
                                <span className="text-[9px] font-black uppercase text-gray-400">{explanation.length} Chars</span>
                            </div>
                            <textarea
                                value={explanation}
                                onChange={(e) => { setExplanation(e.target.value); setError(null); }}
                                className="w-full h-64 p-6 font-mono text-sm font-bold focus:outline-none bg-white"
                                placeholder="Start typing your explanation here..."
                            />
                        </div>

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
