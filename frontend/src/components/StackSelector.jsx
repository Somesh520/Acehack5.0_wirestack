import React from 'react';
import { motion } from 'framer-motion';
import { Code, Server, Layers, Cpu, Globe, Layout, Database, Terminal, ShieldCheck, ArrowRight, Sparkles, Activity } from 'lucide-react';
import { STACKS } from '../constants/stacks.jsx';

export default function StackSelector({ onSelect, modeLabel = 'MISSION_PHASE_01::SPECIALIZATION' }) {
    return (
        <div className="min-h-screen bg-[#FFFFF0] font-mono flex flex-col items-center py-24 px-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-32 bg-[#FFE145] border-b-[6px] border-black opacity-10 -skew-y-2 origin-top-left" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#FF3EA5] opacity-5 rounded-full blur-3xl translate-x-20 translate-y-20" />
            
            <header className="text-center mb-24 max-w-5xl relative z-10">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-6 py-2 border-[4px] border-black bg-[#FFE145] mb-8 shadow-[6px_6px_0px_#000] uppercase font-black text-xs tracking-[0.2em]"
                >
                    <Activity size={16} strokeWidth={4} /> {modeLabel}
                </motion.div>
                
                <h1 className="text-6xl md:text-9xl font-black uppercase mb-8 tracking-[-0.05em] leading-[0.8] text-black">
                    CHOOSE YOUR<br/>
                    <span className="text-[#FF3EA5] italic skew-x-[-10deg] inline-block mt-4">WEAPON_PATH</span>
                </h1>
                
                <p className="text-xl md:text-2xl font-bold uppercase text-black/40 max-w-3xl mx-auto leading-none">
                    Select a technical ecosystem. We verify your fundamentals, then architect your mastery. <span className="text-black bg-[#3EFFB2] px-1">NO_VIBE_CODING_ALLOWED.</span>
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl w-full relative z-10 px-4">
                {STACKS.map((stack, idx) => (
                    <motion.div
                        key={stack.id}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05, type: 'spring' }}
                        className="relative group h-full"
                    >
                        {/* Shadow Offset */}
                        <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform" />
                        
                        <button
                            onClick={() => onSelect(stack.id)}
                            className="w-full h-full relative bg-white border-[4px] border-black p-10 text-left transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1 flex flex-col items-start"
                        >
                            <div className={`w-16 h-16 border-[4px] border-black mb-8 flex items-center justify-center shadow-[6px_6px_0px_#000] transition-transform group-hover:rotate-12 ${stack.color}`}>
                                {React.cloneElement(stack.icon, { size: 32, strokeWidth: 3 })}
                            </div>
                            
                            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter italic leading-none">{stack.title}</h3>
                            
                            <p className="text-[11px] font-black text-black/50 uppercase leading-relaxed mb-10 flex-1 tracking-tight">
                                {stack.desc}
                            </p>
                            
                            <div className="w-full pt-6 border-t-[3px] border-black/5 flex items-center justify-between group/action">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF3EA5]">INITIALIZE_PATH</span>
                                <div className="p-2 border-2 border-black bg-black text-white group-hover:bg-[#FF3EA5] transition-colors">
                                    <ArrowRight size={18} strokeWidth={3} />
                                </div>
                            </div>

                            {/* Decorative corner element */}
                            <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-10 transition-opacity">
                                <Sparkles size={32} className="text-black" />
                            </div>
                        </button>
                    </motion.div>
                ))}
            </div>

            <footer className="mt-32 py-12 border-t-[6px] border-black w-full flex flex-col items-center gap-6 relative z-10">
                <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-2 h-2 bg-black/20 rounded-full" />)}
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] text-black/30 text-center px-6">
                    SYSTEM_LINK_ACTIVE // AWAITING_OPERATIVE_SPECIALIZATION_DATA
                </p>
                <div className="mt-4 flex items-center gap-3 grayscale opacity-30">
                    <ShieldCheck size={20} />
                    <Cpu size={20} />
                    <Code size={20} />
                </div>
            </footer>
        </div>
    );
}
