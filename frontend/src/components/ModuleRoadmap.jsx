import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, CheckCircle, ChevronRight, BookOpen, Zap, ArrowLeft, Star, Target, Info, Sparkles, AlertCircle, Info as InfoIcon, Cpu, Map, Plus } from 'lucide-react';

function formatModuleTitle(title) {
    if (!title) return 'UNTITLED_MODULE';
    return title
        .toString()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

export default function ModuleRoadmap({ stack, level, onSelectModule, onBack }) {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/v1/modules?stack=${encodeURIComponent(stack)}`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setModules(data.modules || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch modules:', err);
                setLoading(false);
            });
    }, [stack]);

    const statusConfig = {
        locked: { 
            icon: Lock, 
            bg: 'bg-[#f6f6f6]', 
            border: 'border-black/10', 
            text: 'text-black/60', 
            label: 'ACCESS_RESTRICTED', 
            accent: 'bg-[#efefef]',
            shadow: 'shadow-none',
            iconColor: 'text-black/35'
        },
        unlocked: { 
            icon: Unlock, 
            bg: 'bg-white', 
            border: 'border-black', 
            text: 'text-black', 
            label: 'READY_TO_DEPLOY', 
            accent: 'bg-[#FFE145]',
            shadow: 'shadow-[8px_8px_0px_#000]',
            iconColor: 'text-black'
        },
        in_progress: { 
            icon: BookOpen, 
            bg: 'bg-white', 
            border: 'border-black', 
            text: 'text-black', 
            label: 'CURRENT_OBJECTIVE', 
            accent: 'bg-[#FF3EA5]',
            shadow: 'shadow-[8px_8px_0px_#000]',
            iconColor: 'text-white'
        },
        completed: { 
            icon: CheckCircle, 
            bg: 'bg-white', 
            border: 'border-black', 
            text: 'text-black', 
            label: 'MISSION_ACCOMPLISHED', 
            accent: 'bg-[#3EFFB2]',
            shadow: 'shadow-[8px_8px_0px_#000]',
            iconColor: 'text-black'
        },
    };

    return (
        <div className="font-mono bg-[#FFFFF0] min-h-screen">
            {/* Header / Brand Section */}
            <div className="mb-12 relative p-8 md:p-12 border-b-[6px] border-black bg-white overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-[#FFE145] opacity-5 -skew-x-12 translate-x-12" />
                
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 relative z-10">
                    <div className="space-y-6 max-w-3xl">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest"
                        >
                            <Target size={12} className="text-[#3EFFB2]" /> MISSION::PHASE_02
                        </motion.div>
                        
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
                            {stack} <span className="text-[#FF3EA5]">ARCHITECT</span>
                        </h1>
                        
                        <div className="flex items-center gap-4">
                            <div className="h-[4px] w-12 bg-black" />
                            <div className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">
                                LEVEL: {level || 'RECRUIT'}
                            </div>
                        </div>

                        <p className="text-lg font-bold text-black/40 uppercase leading-snug">
                            Strategic roadmap for <span className="text-black border-b-4 border-[#3EFFB2]">{stack}</span> ecosystem. Sync all tactical modules to achieve full system mastery.
                        </p>

                    </div>
                    
                    {/* Progress Overview Widgets */}
                    {!loading && modules.length > 0 && (
                        <div className="flex flex-wrap gap-4 shrink-0">
                            <div className="relative p-6 border-[4px] border-black bg-white shadow-[6px_6px_0px_#000] min-w-[140px] flex flex-col items-center">
                                <span className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1 italic">PROGRESS</span>
                                <div className="text-4xl font-black">
                                    {Math.round((modules.filter(m => m.userStatus === 'completed').length / modules.length) * 100)}%
                                </div>
                            </div>
                            <div className="relative p-6 border-[4px] border-black bg-[#3EFFB2] shadow-[6px_6px_0px_#000] min-w-[140px] flex flex-col items-center">
                                <span className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1 italic">XP_SYNCED</span>
                                <div className="text-4xl font-black">
                                    {modules.filter(m => m.userStatus === 'completed').reduce((acc, m) => acc + (m.xpReward || 100), 0)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Roadmap Path */}
            <div className="max-w-6xl mx-auto p-8 md:p-12 pb-40">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 bg-white border-[6px] border-dashed border-black/10">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="p-6 border-[6px] border-black bg-[#FFE145] mb-8"
                        >
                            <Cpu size={48} strokeWidth={3} />
                        </motion.div>
                        <p className="font-black uppercase text-xl tracking-[0.3em] animate-pulse text-black/30 text-center px-6">INITIALIZING_TACTICAL_INTERFACE...</p>
                    </div>
                ) : modules.length === 0 ? (
                    <div className="py-32 px-10 border-[8px] border-dashed border-black/10 bg-white flex flex-col items-center justify-center text-center">
                        <div className="relative mb-12">
                             <div className="absolute inset-0 bg-black translate-x-3 translate-y-3" />
                             <div className="relative p-8 border-4 border-black bg-white">
                                <AlertCircle size={64} strokeWidth={3} className="text-black/20" />
                             </div>
                        </div>
                        
                        <h2 className="font-black uppercase text-5xl md:text-6xl text-black tracking-tighter mb-4 leading-none italic">
                            NO_INTEL_<span className="text-black/10">GATHERED</span>
                        </h2>
                        
                        <p className="max-w-md text-sm font-bold text-black/30 uppercase tracking-widest mb-12">
                            Select a technical ecosystem in the sidebar or return to the main hub to begin your mission.
                        </p>
                        
                        <button 
                            onClick={onBack} 
                            className="group relative"
                        >
                            <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-all" />
                            <div className="relative px-12 py-5 border-[4px] border-black bg-[#FFE145] font-black uppercase text-lg tracking-widest flex items-center gap-4 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all">
                                <Plus size={24} strokeWidth={4} /> CHOOSE_TACTICAL_PATH
                            </div>
                        </button>

                        <div className="mt-20 flex gap-4 opacity-10">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-2 h-10 bg-black -skew-x-12" />)}
                        </div>
                    </div>
                ) : (
                    <div className="relative pl-24 md:pl-32">
                        {/* The Spine Line */}
                        <div className="absolute left-[44px] md:left-[56px] top-0 bottom-0 w-[8px] bg-black shadow-[4px_0px_0px_rgba(0,0,0,0.05)]" />
                        
                        <div className="space-y-24">
                            {modules.map((mod, i) => {
                                const status = statusConfig[mod.userStatus] || statusConfig.locked;
                                const isClickable = mod.userStatus !== 'locked';
                                const displayTitle = formatModuleTitle(mod.title);
                                
                                return (
                                    <motion.div
                                        key={mod._id || mod.moduleId || `module-${i}`}
                                        initial={{ opacity: 0, x: -30 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ delay: i * 0.1 }}
                                        className="relative"
                                    >
                                        {/* Status Node Circle */}
                                        <div className={`absolute -left-[64px] md:-left-[96px] top-4 w-16 h-16 border-[4px] border-black z-20 flex items-center justify-center shadow-[6px_6px_0px_#000] ${status.accent}`}>
                                            {mod.userStatus === 'completed' ? (
                                                <CheckCircle size={32} strokeWidth={4} />
                                            ) : (
                                                <span className="font-black text-2xl italic leading-none">
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Horizontal Link */}
                                        <div className="absolute -left-[20px] md:-left-[30px] top-12 w-8 h-[4px] bg-black z-10" />

                                        {/* Module Card container */}
                                        <div className="relative group">
                                            {/* Shadow layer */}
                                            <div className={`absolute inset-0 ${isClickable ? 'bg-black' : 'bg-black/25'} translate-x-3 translate-y-3 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform pointer-events-none`} />
                                            
                                            <button
                                                onClick={() => isClickable && onSelectModule(mod)}
                                                disabled={!isClickable}
                                                className={`w-full relative p-10 border-[6px] border-black ${status.bg} flex flex-col md:flex-row gap-12 text-left transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-4 mb-6">
                                                        <div className={`px-3 py-1 border-[3px] border-black text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] ${status.accent}`}>
                                                            {status.label}
                                                        </div>
                                                        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">ID::UNIT_{i+1}</span>
                                                    </div>

                                                    <h3 className={`text-3xl md:text-4xl font-black uppercase leading-tight mb-6 tracking-tight whitespace-normal break-words ${isClickable ? 'group-hover:text-[#FF3EA5]' : ''}`}>
                                                        {displayTitle}
                                                    </h3>

                                                    <p className={`text-lg font-bold uppercase leading-relaxed mb-8 max-w-2xl italic ${isClickable ? 'text-black/50' : 'text-black/45'}`}>
                                                        {mod.description}
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {(mod.skills || []).map((skill, si) => (
                                                            <span key={si} className="text-[9px] font-black uppercase bg-black text-white px-2.5 py-1">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {mod.difficulty && (
                                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 border-2 border-black ${mod.difficulty === 'advanced' ? 'bg-[#FF3EA5] text-white' : 'bg-[#FFE145] text-black'}`}>
                                                                {mod.difficulty}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex flex-row md:flex-col justify-between items-end md:items-center gap-8 border-t-[4px] md:border-t-0 md:border-l-[4px] border-black/5 pt-8 md:pt-0 md:pl-10">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-black italic">+{mod.xpReward}</div>
                                                        <span className="text-[9px] font-black text-black/20 uppercase tracking-widest">XP_GAINED</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-black italic">{mod.estimatedMinutes}M</div>
                                                        <span className="text-[9px] font-black text-black/20 uppercase tracking-widest">TIME_EST</span>
                                                    </div>
                                                    <div className={`mt-auto p-4 border-[4px] border-black transition-all ${isClickable ? 'bg-black text-white group-hover:bg-[#FF3EA5] group-hover:rotate-6' : 'bg-black/5 text-black/10'}`}>
                                                        {mod.userStatus === 'locked' ? <Lock size={28} strokeWidth={4} /> : <ChevronRight size={28} strokeWidth={4} />}
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {/* End of Line Decoration */}
                            <div className="pt-24 flex flex-col items-center gap-8 opacity-20">
                                <div className="flex gap-4">
                                    {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 bg-black transform rotate-45" />)}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.5em]">-- MISSION_END_OF_SEQUENCE --</div>
                                <Cpu size={32} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
