import React, { useState } from 'react';
import { X, CheckCircle2, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { PIPELINE_STEPS } from './pipelineConfig';

const NodeOptionsPanel = ({ node, onSelectOption, onClose, isLocked }) => {
    const { stepId, status, selectedOption: currentSelection, bestPractice, alternatives, title: nodeTitle } = node.data;

    // Use dynamic data from AI if available, otherwise fallback to static pipeline
    const step = PIPELINE_STEPS.find(s => s.id === stepId) || {
        id: stepId,
        title: nodeTitle || stepId,
        subtitle: 'Choice based on your idea',
        color: '#FFD700',
        options: [
            ...(bestPractice ? [{ ...bestPractice, isBest: true }] : []),
            ...(alternatives || [])
        ]
    };

    // If options are raw from AI (best_practice + alternatives), combine them
    const allOptions = (bestPractice || alternatives)
        ? [
            ...(bestPractice ? [{ ...bestPractice, isBest: true }] : []),
            ...(alternatives || [])
        ]
        : step.options;

    // Local state for previewing selection before confirming
    const [selectedId, setSelectedId] = useState(currentSelection || null);

    // Helper to map tech IDs to nice emojis
    const getTechIcon = (id, defaultLogo) => {
        if (defaultLogo && defaultLogo !== '📦') return defaultLogo;
        const iconMap = {
            'react': '⚛️', 'vue': '💚', 'nextjs': '▲', 'svelte': '🧡',
            'express': '⚡', 'nestjs': '🐱', 'fastapi': '🚀', 'django': '🐍',
            'mongodb': '🍃', 'postgresql': '🐘', 'postgres': '🐘', 'mysql': '🐬',
            'python': '🐍', 'node': '🟩', 'supabase': '⚡', 'firebase': '🔥'
        };
        const normalizedId = String(id).toLowerCase().replace(/[^a-z0-9]/g, '');
        return iconMap[normalizedId] || '💎';
    };

    if (!allOptions || allOptions.length === 0) return null;

    if (status === 'locked' && !isLocked) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 font-mono backdrop-blur-sm">
                <div className="w-[400px] bg-white border-4 border-black p-8 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1">
                    <Lock size={48} className="mx-auto text-[#FF3366] mb-4" />
                    <h2 className="text-2xl font-black uppercase mb-2">Node Locked</h2>
                    <p className="text-sm font-bold text-gray-500">Complete the previous missions to unlock {step.title}!</p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 border-3 border-black bg-[#FFD700] font-black uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:scale-95"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-[2px] font-mono p-4">
            <div className="w-full max-w-[650px] max-h-[85vh] flex flex-col bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div
                    className="p-6 border-b-4 border-black flex items-center justify-between shrink-0 transition-colors"
                    style={{ backgroundColor: isLocked ? '#33FF66' : (step.color || '#FFD700') }}
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {isLocked ? <Lock size={28} /> : (step.icon || <Sparkles size={28} />)}
                            <h2 className="text-3xl font-black uppercase tracking-tight">{isLocked ? "MISSION SECURED" : step.title}</h2>
                        </div>
                        <p className="text-[11px] font-black bg-black text-white px-3 py-1 inline-block uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                            {isLocked ? '🛡️ ARCHITECTURE LOCKED' : (status === 'completed' ? '✓ MISSION COMPLETE' : '▶ NEW CHALLENGE')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 border-4 border-black bg-white hover:bg-[#FF3366] hover:text-white transition-colors hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/80 custom-scrollbar">
                    <h3 className="font-black uppercase mb-5 text-gray-500 text-[11px] tracking-[0.2em] flex items-center gap-2">
                        <span className="w-4 h-[2px] bg-gray-400"></span> {isLocked ? "FINAL SELECTION" : "Compare & Choose"}
                    </h3>
                    <div className={`flex flex-col gap-5 ${isLocked ? 'opacity-75 pointer-events-none' : ''}`}>
                        {allOptions.map(opt => (
                            <div
                                key={opt.id}
                                onClick={() => !isLocked && setSelectedId(opt.id)}
                                className={`cursor-pointer border-4 border-black p-5 transition-all relative group flex flex-col gap-3 ${selectedId === opt.id
                                    ? 'bg-[#00F0FF]/10 shadow-none translate-x-1 translate-y-1'
                                    : 'bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]'
                                    }`}
                            >
                                {opt.isBest && (
                                    <div className="absolute -top-3.5 right-4 bg-[#33FF66] border-2 border-black px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-10 flex items-center gap-1">
                                        <Sparkles size={10} className="fill-black" /> Industry Standard
                                    </div>
                                )}

                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                                            {getTechIcon(opt.id, opt.logo)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xl uppercase tracking-tighter text-black">{opt.name}</h4>
                                            {opt.isBest && <span className="text-[10px] font-bold text-[#008000]">Recommended choice for most apps</span>}
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 border-2 border-black rounded-full flex items-center justify-center transition-colors ${selectedId === opt.id ? 'bg-[#FF3366]' : 'bg-gray-200 group-hover:bg-gray-300'}`}>
                                        {selectedId === opt.id && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                    </div>
                                </div>
                                <div className="pl-[64px] pr-2">
                                    <p className="text-xs font-bold text-gray-700 leading-relaxed bg-[#FFD700]/20 p-3 border-l-4 border-black">
                                        {opt.reason || opt.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t-4 border-black bg-white flex justify-end shrink-0">
                    <button
                        disabled={!selectedId || isLocked}
                        onClick={() => onSelectOption(step.id, selectedId)}
                        className="flex items-center justify-center gap-3 w-full py-4 border-4 border-black bg-[#33FF66] font-black text-xl uppercase disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none"
                    >
                        {isLocked ? 'MISSION COMPLETED' : (status === 'completed' && selectedId === currentSelection ? 'Confirm Checkpoint' : 'Lock In Choice')}
                        {isLocked ? <CheckCircle2 size={24} /> : <ChevronRight size={24} strokeWidth={3} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NodeOptionsPanel;
