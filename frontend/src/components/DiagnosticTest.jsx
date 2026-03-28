import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, XCircle, ArrowRight, Loader2, Sparkles, Zap, Target } from 'lucide-react';

const API_BASE = '';

export default function DiagnosticTest({ stack, onComplete, onSkip }) {
    const [phase, setPhase] = useState('loading'); // loading | intro | quiz | result
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showCorrect, setShowCorrect] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!stack) return;
        setPhase('loading');
        setError(null);

        fetch(`${API_BASE}/api/v1/diagnostic/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stack }),
            credentials: 'include'
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to generate test');
                return res.json();
            })
            .then(data => {
                if (data.questions?.length > 0) {
                    setQuestions(data.questions);
                    setPhase('intro');
                } else {
                    throw new Error('No questions received');
                }
            })
            .catch(err => {
                console.error('Diagnostic fetch error:', err);
                setError(err.message);
                setPhase('loading');
            });
    }, [stack]);

    const handleConfirm = () => {
        if (selectedOption === null) return;
        const q = questions[currentQ];
        const isCorrect = selectedOption === q.correctIndex;
        setShowCorrect(true);

        setTimeout(() => {
            const newAnswers = [...answers, {
                questionId: q.id,
                selectedIndex: selectedOption,
                correctIndex: q.correctIndex,
                isCorrect
            }];
            setAnswers(newAnswers);

            if (currentQ + 1 < questions.length) {
                setCurrentQ(currentQ + 1);
                setSelectedOption(null);
                setShowCorrect(false);
            } else {
                handleSubmit(newAnswers);
            }
        }, 800);
    };

    const handleSubmit = async (finalAnswers) => {
        setSubmitting(true);
        setPhase('result');

        try {
            const res = await fetch(`${API_BASE}/api/v1/diagnostic/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: finalAnswers }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Submit failed');
            const data = await res.json();
            setResult(data);

            setTimeout(() => {
                onComplete?.({
                    score: data.score,
                    total: data.totalQuestions,
                    level: data.level,
                    percentage: data.percentage
                });
            }, 2500);
        } catch (err) {
            console.error('Submit error:', err);
            const correct = finalAnswers.filter(a => a.isCorrect).length;
            const total = finalAnswers.length;
            const percentage = Math.round((correct / total) * 100);
            const level = percentage >= 80 ? 'Advanced' : percentage >= 50 ? 'Intermediate' : 'Beginner';
            setResult({ score: correct, totalQuestions: total, percentage, level, message: `Completed with ${correct}/${total}` });
            setTimeout(() => {
                onComplete?.({ score: correct, total, level, percentage });
            }, 2500);
        } finally {
            setSubmitting(false);
        }
    };

    if (phase === 'loading') {
        return (
            <div className="py-20 flex flex-col items-center justify-center font-mono">
                {error ? (
                    <div className="text-center">
                        <XCircle size={64} className="mx-auto mb-6 text-[#FF3366]" />
                        <h2 className="text-2xl font-black uppercase mb-2">Sync Error</h2>
                        <p className="text-gray-400 font-bold mb-8">{error}</p>
                        <button onClick={onSkip} className="px-8 py-3 bg-[#FFD700] border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all">
                            Proceed Anyway →
                        </button>
                    </div>
                ) : (
                    <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                            <Brain size={64} className="text-[#FF3366]" />
                        </motion.div>
                        <h2 className="text-2xl font-black uppercase mt-8 tracking-tighter">AI Analysis in Progress...</h2>
                        <p className="text-gray-400 font-bold mt-2 uppercase text-xs">Generating {stack} Baseline Questions</p>
                    </>
                )}
            </div>
        );
    }

    if (phase === 'intro') {
        return (
            <div className="py-8 max-w-2xl mx-auto font-mono">
                <div className="bg-[#FFD700] border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(255,51,102,0.1)]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-black p-4">
                            <Target size={32} className="text-[#FFD700]" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter">Vibe Check</h1>
                            <p className="text-xs font-black opacity-50 uppercase">Initial Diagnostic Mission</p>
                        </div>
                    </div>

                    <div className="bg-white border-4 border-black p-6 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="font-bold text-base leading-relaxed uppercase">
                            To unlock the best learning path for <span className="bg-[#00F0FF] px-1 font-black">{stack}</span>, we need to gauge your current conceptual understanding. 
                            <br/><br/>
                            <span className="text-[#FF3366]">Rule 1:</span> No Googling. <br/>
                            <span className="text-[#FF3366]">Rule 2:</span> Be honest.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white border-4 border-black p-4 text-center">
                            <Zap size={24} className="mx-auto mb-2 text-[#FF3366]" />
                            <p className="text-[10px] font-black uppercase">3 Challenges</p>
                        </div>
                        <div className="bg-white border-4 border-black p-4 text-center">
                            <Brain size={24} className="mx-auto mb-2 text-[#00F0FF]" />
                            <p className="text-[10px] font-black uppercase">Conceptual</p>
                        </div>
                        <div className="bg-white border-4 border-black p-4 text-center">
                            <Sparkles size={24} className="mx-auto mb-2 text-[#33FF66]" />
                            <p className="text-[10px] font-black uppercase">AI Evaluation</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setPhase('quiz')}
                            className="flex-1 bg-black text-white border-4 border-black px-8 py-5 font-black text-xl uppercase hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]"
                        >
                            ENGAGE MISSION <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        const levelData = {
            Beginner: { color: 'bg-[#33FF66]', text: 'Junior Operative' },
            Intermediate: { color: 'bg-[#FFD700]', text: 'Field Engineer' },
            Advanced: { color: 'bg-[#FF3366]', text: 'Senior Architect' },
        };
        const level = levelData[result?.level] || levelData.Beginner;

        return (
            <div className="py-20 flex items-center justify-center font-mono">
                {result ? (
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md w-full">
                        <div className={`border-8 border-black p-10 text-center shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] ${level.color}`}>
                            <CheckCircle size={80} className="mx-auto mb-6" />
                            <h1 className="text-6xl font-black uppercase mb-2">{result.score}/{result.totalQuestions}</h1>
                            <div className="bg-black h-2 w-full mb-6" />
                            <h2 className="text-3xl font-black uppercase mb-2 tracking-tighter">{result.level}</h2>
                            <p className="text-xs font-black uppercase opacity-60 mb-6">{level.text}</p>
                            
                            <div className="bg-white border-4 border-black p-4 mb-8">
                                <p className="font-black text-sm uppercase">{result.message}</p>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-black/40" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Constructing Personalized Roadmap...</p>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="text-center">
                        <Loader2 className="w-16 h-16 animate-spin mx-auto text-[#FF3366]" />
                        <h2 className="text-xl font-black uppercase mt-6">Grading Submissions...</h2>
                    </div>
                )}
            </div>
        );
    }

    const q = questions[currentQ];
    if (!q) return null;

    return (
        <div className="max-w-3xl mx-auto py-8 font-mono">
            {/* Mission Progress */}
            <div className="flex items-center gap-4 mb-10">
                <div className="flex-1 h-6 border-4 border-black bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <motion.div 
                        className="h-full bg-[#FF3366]" 
                        initial={{ width: 0 }} 
                        animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    />
                </div>
                <div className="px-4 py-1 border-4 border-black bg-black text-white font-black uppercase text-sm">
                    {currentQ + 1} / {questions.length}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={currentQ} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    {/* Question Card */}
                    <div className="bg-white border-6 border-black p-8 shadow-[12px_12px_0px_0px_rgba(255,51,102,0.1)] mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="bg-[#FFD700] border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase">
                                Conceptual Challenge
                            </span>
                            {q.concept && <span className="text-[10px] font-black text-gray-400 uppercase">Target: {q.concept}</span>}
                        </div>
                        <h2 className="text-2xl font-black uppercase leading-tight tracking-tight">{q.question}</h2>
                    </div>

                    {/* Options Grid */}
                    <div className="grid gap-4">
                        {q.options.map((option, idx) => {
                            let style = "bg-white border-4 border-black hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
                            if (showCorrect) {
                                if (idx === q.correctIndex) style = "bg-[#33FF66] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
                                else if (idx === selectedOption) style = "bg-[#FF3366] text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
                                else style = "bg-gray-50 border-4 border-gray-200 text-gray-400 shadow-none";
                            } else if (selectedOption === idx) {
                                style = "bg-[#00F0FF] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1 translate-y-1 shadow-none";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !showCorrect && setSelectedOption(idx)}
                                    className={`w-full text-left p-5 flex items-center gap-4 transition-all ${style}`}
                                >
                                    <span className={`w-8 h-8 flex items-center justify-center border-2 border-black font-black text-xs ${selectedOption === idx ? 'bg-black text-white' : 'bg-[#FFD700]'}`}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="font-black text-sm uppercase">{option}</span>
                                    {showCorrect && idx === q.correctIndex && <CheckCircle className="ml-auto" />}
                                    {showCorrect && idx === selectedOption && idx !== q.correctIndex && <XCircle className="ml-auto" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Submit Action */}
                    {!showCorrect && (
                        <button
                            disabled={selectedOption === null}
                            onClick={handleConfirm}
                            className="w-full mt-10 bg-[#FF3366] text-white border-4 border-black py-5 font-black text-xl uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:bg-[#e62e5c] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            VALIDATE ANSWER <ArrowRight size={24} />
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
