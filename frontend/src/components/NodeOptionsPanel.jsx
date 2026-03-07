import React, { useState } from 'react';
import { X, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { PIPELINE_STEPS } from './pipelineConfig';

const NodeOptionsPanel = ({ node, onSelectOption, onClose }) => {
    const { stepId, status, selectedOption: currentSelection } = node.data;
    const step = PIPELINE_STEPS.find(s => s.id === stepId);

    // Local state for previewing selection before confirming
    const [selectedId, setSelectedId] = useState(currentSelection || null);

    if (!step) return null;

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
                    style={{ backgroundColor: step.color }}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {step.icon}
                            <h2 className="text-2xl font-black uppercase tracking-tight">{step.title}</h2>
                        </div>
                        <p className="text-xs font-bold bg-black text-white px-2 py-0.5 inline-block uppercase">
                            Mission: {step.subtitle}
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
                    <h3 className="font-black uppercase mb-4 text-gray-400 text-sm tracking-widest">Available Tech Stacks</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {step.options.map(opt => (
                            <div
                                key={opt.id}
                                onClick={() => setSelectedId(opt.id)}
                                className={`cursor-pointer border-3 border-black p-4 transition-all ${selectedId === opt.id
                                        ? 'bg-[#FFD700] shadow-none translate-x-1 translate-y-1'
                                        : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-3xl">{opt.logo}</span>
                                    {selectedId === opt.id && <CheckCircle2 size={24} className="text-black" />}
                                </div>
                                <h4 className="font-black text-lg uppercase leading-none mb-1">{opt.name}</h4>
                                <p className="text-xs font-bold text-gray-600 leading-tight">{opt.desc}</p>
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
