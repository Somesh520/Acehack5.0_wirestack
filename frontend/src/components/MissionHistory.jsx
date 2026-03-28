import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Calendar, Target, Trophy, ChevronLeft, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Cpu } from 'lucide-react';

export default function MissionHistory({ onBack }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/mission/history', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setHistory(data.missions || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch history:', err);
                setLoading(false);
            });
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 bg-white border-[6px] border-dashed border-black/10">
                <motion.div
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 180, 270, 360]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="p-6 border-[6px] border-black bg-[#FF3EA5] mb-8"
                >
                    <History size={48} className="text-white" strokeWidth={3} />
                </motion.div>
                <p className="font-black uppercase text-2xl tracking-[0.2em] animate-pulse">RECOVERING_MISSION_ARCHIVES...</p>
            </div>
        );
    }

    return (
        <div className="space-y-16 pb-40">
            {/* Archive Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-[6px] border-black pb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3EFFB2] opacity-5 rounded-full blur-3xl -translate-y-12 translate-x-12" />
                
                <div className="relative z-10">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest mb-6"
                    >
                        <ShieldCheck size={12} className="text-[#3EFFB2]" /> ENCRYPTED_ARCHIVE_ACCESS
                    </motion.div>
                    <h2 className="text-6xl md:text-8xl font-black uppercase tracking-[-0.05em] leading-[0.8] mb-6">
                        MISSION_LOGS
                    </h2>
                    <p className="text-xl font-bold text-black/50 uppercase max-w-xl">
                        A complete historical record of every tactical deployment and technical mastery achieved.
                    </p>
                </div>

                <button
                    onClick={onBack}
                    className="group relative px-10 py-5 border-[6px] border-black bg-white hover:bg-[#FFE145] transition-all active:scale-95 shrink-0"
                >
                    <div className="absolute inset-0 bg-black translate-x-1.5 translate-y-1.5 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
                    <div className="relative flex items-center gap-3 font-black uppercase text-sm tracking-widest">
                        <ChevronLeft size={20} strokeWidth={4} /> TERMINATE_ACCESS
                    </div>
                </button>
            </header>

            {history.length === 0 ? (
                <div className="p-24 border-[8px] border-dashed border-black/10 bg-white text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-black/5 flex items-center justify-center mb-10 border-4 border-dashed border-black/20">
                        <AlertCircle size={48} className="text-black/10" />
                    </div>
                    <h3 className="text-4xl font-black uppercase text-black/10 mb-8 tracking-tighter italic">ZERO_RECORDS_AVAILABLE</h3>
                    <p className="text-sm font-bold text-black/30 uppercase tracking-[0.3em] max-w-md leading-relaxed">
                        No previous missions have been archived. Complete a deployment to establish a permanent record.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-12">
                    {[...history].reverse().map((mission, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white border-[6px] border-black p-10 relative group"
                        >
                            {/* Shadow Offset */}
                            <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform pointer-events-none" />
                            
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* Mission ID & Type */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-black text-[#FFE145] p-4 border-[3px] border-black shadow-[4px_4px_0px_#000]">
                                            <Target size={32} strokeWidth={4} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-[#FF3EA5] uppercase tracking-[0.3em] mb-1">
                                                MISSION::{String(history.length - idx).padStart(3, '0')}
                                            </div>
                                            <h3 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                                                {mission.stack}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 px-4 py-2 bg-black/5 border-2 border-dashed border-black/20">
                                        <Calendar size={14} className="text-black/40" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-black/60">
                                            DEPLOYED: {formatDate(mission.completedAt || mission.startedAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Mission Stats Content */}
                                <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                                    <div className="p-6 border-[3px] border-black bg-[#FFE145] shadow-[4px_4px_0px_#000]">
                                        <span className="text-[9px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">DIAGNOSTIC_LVL</span>
                                        <div className="text-2xl font-black uppercase italic leading-none">{mission.level || 'RECRUIT'}</div>
                                    </div>
                                    <div className="p-6 border-[3px] border-black bg-[#3EFFB2] shadow-[4px_4px_0px_#000]">
                                        <span className="text-[9px] font-black uppercase tracking-widest block mb-2 opacity-50 text-black">SUCCESS_RATE</span>
                                        <div className="text-2xl font-black italic leading-none">
                                            {Math.round((mission.score / (mission.totalQuestions || 1)) * 100)}%
                                        </div>
                                    </div>
                                    <div className="p-6 border-[3px] border-black bg-white shadow-[4px_4px_0px_#000]">
                                        <span className="text-[9px] font-black uppercase tracking-widest block mb-2 text-black/40">MODULES_SYNCED</span>
                                        <div className="text-2xl font-black italic leading-none">{mission.moduleProgress?.length || 0}</div>
                                    </div>
                                    <div className="p-6 border-[3px] border-black bg-[#FF3EA5] text-white shadow-[4px_4px_0px_#000]">
                                        <span className="text-[9px] font-black uppercase tracking-widest block mb-2 opacity-50">SCORE_PTS</span>
                                        <div className="text-2xl font-black leading-none italic">{mission.score}/{mission.totalQuestions}</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="lg:col-span-3 flex lg:flex-col justify-end gap-4">
                                    <button className="w-full h-full lg:h-auto py-5 border-[4px] border-black bg-black text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-[#FF3EA5] transition-colors flex items-center justify-center gap-3 group/btn">
                                        GET_INTEL <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Decorative badge for high scores */}
                            {(mission.score / (mission.totalQuestions || 1)) >= 0.8 && (
                                <div className="absolute -top-4 -right-4 p-2 bg-[#FFE145] border-4 border-black rotate-12 shadow-[4px_4px_0px_#000] z-20">
                                    <Sparkles size={20} fill="black" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Terminal End */}
            <div className="pt-20 flex flex-col items-center gap-8 opacity-20">
                <div className="flex gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 bg-black transform rotate-45" />)}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em]">-- END_OF_HISTORICAL_LOGS --</div>
                <Cpu size={32} />
            </div>
        </div>
    );
}
