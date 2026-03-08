import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PIPELINE_STEPS } from './pipelineConfig';
import { Lock, Play, Check } from 'lucide-react';

const GamifiedNode = ({ data }) => {
    const { stepId, status, selectedOption, bestPractice, title: nodeTitle } = data; // 'locked', 'active', 'completed'

    // Find step info
    const stepDef = PIPELINE_STEPS.find(s => s.id === stepId) || { title: nodeTitle, color: '#FFD700' };

    // Find tech info if completed
    const techOpt = selectedOption
        ? (PIPELINE_STEPS.find(s => s.id === stepId)?.options.find(o => o.id === selectedOption) || { name: selectedOption })
        : null;

    const isActive = status === 'active';
    const isCompleted = status === 'completed';
    const isLocked = status === 'locked';

    // Styling based on state
    const bg = isCompleted ? '#33FF66' : isActive ? '#FFD700' : '#FF3366';
    const ring = isCompleted ? '#33FF66' : isActive ? '#FFD700' : '#FF3366';
    const label = isCompleted ? (techOpt?.name || 'Done') : (stepDef.title || nodeTitle);
    const logo = isCompleted ? (techOpt?.logo || '✅') : (isLocked ? <Lock size={20} /> : (bestPractice?.name || <Play size={20} />));

    return (
        <div className="flex flex-col items-center font-mono">
            <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />

            {/* Status badge above */}
            {isActive && (
                <div className="mb-2 bg-black text-[#FFD700] text-[8px] font-black px-2 py-0.5 uppercase tracking-widest border border-[#FFD700] animate-bounce">
                    ▶ CURRENT MISSION
                </div>
            )}

            {isCompleted && (
                <div className="mb-2 bg-black text-[#33FF66] text-[8px] font-black px-2 py-0.5 uppercase tracking-widest border border-[#33FF66]">
                    ✅ UNLOCKED
                </div>
            )}

            {/* Circle Node */}
            <div className="relative group cursor-pointer hover:-translate-y-1 transition-transform">
                {/* Outer ring */}
                <div
                    className={`w-[80px] h-[80px] rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.6)]' : ''}`}
                    style={{
                        background: `conic-gradient(${ring} 0%, ${ring}33 100%)`,
                        padding: '4px',
                    }}
                >
                    {/* Inner circle */}
                    <div
                        className="w-full h-full rounded-full flex flex-col items-center justify-center border-4"
                        style={{
                            backgroundColor: bg,
                            borderColor: '#000',
                            opacity: isLocked ? 0.8 : 1
                        }}
                    >
                        <div className={`text-2xl ${isLocked ? 'opacity-50' : ''}`}>
                            {logo}
                        </div>
                    </div>
                </div>

                {/* Layer / Category badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {label}
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        </div>
    );
};

export default GamifiedNode;
