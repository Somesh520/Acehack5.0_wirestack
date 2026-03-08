import React, { useState } from 'react';
import { X, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { PIPELINE_STEPS } from './pipelineConfig';

const NodeOptionsPanel = ({ node, onSelectOption, onClose }) => {
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

    if (!allOptions || allOptions.length === 0) return null;

    if (status === 'locked') {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 font-mono backdrop-blur-sm">
                <div className="w-[400px] bg-white border-4 border-black p-8 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                    <Lock size={48} className="mx-auto text-[#FF3366] mb-4" />
                    <h2 className="text-2xl font-black uppercase mb-2">Node Locked</h2>
                    <p className="text-sm font-bold text-gray-500">Complete the previous missions to unlock {step.title}!</p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 border-3 border-black bg-[#FFD700] font-black uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 font-mono backdrop-blur-sm">
            <div className="w-[600px] max-h-[80vh] flex flex-col bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Header */}
                <div
                    className="p-5 border-b-4 border-black flex items-center justify-between shrink-0"
                    style={{ backgroundColor: step.color || '#FFD700' }}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {step.icon || <Sparkles size={24} />}
                            <h2 className="text-2xl font-black uppercase tracking-tight">{step.title}</h2>
                        </div>
                        <p className="text-[10px] font-black bg-black text-white px-2 py-0.5 inline-block uppercase tracking-widest">
                            {status === 'completed' ? '✓ MISSION COMPLETE' : '▶ NEW CHALLENGE'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 border-3 border-black bg-white hover:bg-black hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <h3 className="font-black uppercase mb-4 text-gray-400 text-[10px] tracking-[0.2em]">Compare & Choose</h3>
                    <div className="flex flex-col gap-4">
                        {allOptions.map(opt => (
                            <div
                                key={opt.id}
                                onClick={() => setSelectedId(opt.id)}
                                className={`cursor-pointer border-4 border-black p-5 transition-all relative ${selectedId === opt.id
                                    ? 'bg-[#FFD700] shadow-none translate-x-1 translate-y-1'
                                    : 'bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                                    }`}
                            >
                                {opt.isBest && (
                                    <div className="absolute -top-3 right-4 bg-[#33FF66] border-2 border-black px-2 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        ⭐ Industry Standard
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{opt.logo || '📦'}</span>
                                        <h4 className="font-black text-xl uppercase tracking-tighter">{opt.name}</h4>
                                    </div>
                                    {selectedId === opt.id && <CheckCircle2 size={24} className="text-black" />}
                                </div>
                                <div className="pl-14">
                                    <p className="text-xs font-bold text-gray-700 leading-relaxed bg-black/5 p-3 border-l-4 border-black">
                                        {opt.reason || opt.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 border-t-4 border-black bg-white flex justify-end shrink-0">
                    <button
                        disabled={!selectedId}
                        onClick={() => onSelectOption(step.id, selectedId)}
                        className="flex items-center gap-2 px-8 py-3 border-4 border-black bg-[#33FF66] font-black text-lg uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        {status === 'completed' && selectedId === currentSelection ? 'Close' : 'Lock In Choice'}
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NodeOptionsPanel;
