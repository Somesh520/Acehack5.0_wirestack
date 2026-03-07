import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const techData = {
    express: {
        label: 'Express.js',
        color: '#00F0FF',
        category: 'Backend',
        tasks: 3,
        logo: '⚡',
        alternatives: [
            { name: 'Fastify', logo: '🚀' },
            { name: 'Hapi.js', logo: '🔧' },
            { name: 'NestJS', logo: '🐱' },
        ]
    },
    mongodb: {
        label: 'MongoDB',
        color: '#33FF66',
        category: 'Database',
        tasks: 2,
        logo: '🍃',
        alternatives: [
            { name: 'PostgreSQL', logo: '🐘' },
            { name: 'MySQL', logo: '🐬' },
            { name: 'Firebase', logo: '🔥' },
        ]
    },
    auth: {
        label: 'Auth',
        color: '#FF3366',
        category: 'Security',
        tasks: 2,
        logo: '🔐',
        alternatives: [
            { name: 'Auth0', logo: '🛡️' },
            { name: 'Firebase Auth', logo: '🔥' },
            { name: 'JWT', logo: '🎟️' },
        ]
    },
    react: {
        label: 'React',
        color: '#A020F0',
        category: 'Frontend',
        tasks: 4,
        logo: '⚛️',
        alternatives: [
            { name: 'Vue.js', logo: '💚' },
            { name: 'Svelte', logo: '🧡' },
            { name: 'Next.js', logo: '▲' },
        ]
    },
    stripe: {
        label: 'Stripe',
        color: '#FFA500',
        category: 'Payments',
        tasks: 2,
        logo: '💳',
        alternatives: [
            { name: 'Razorpay', logo: '💰' },
            { name: 'PayPal', logo: '🅿️' },
            { name: 'Square', logo: '⬛' },
        ]
    }
};

const WorkflowNode = ({ data, type }) => {
    const [showAlts, setShowAlts] = useState(false);
    const tech = techData[type] || techData.express;
    const status = data?.status || 'locked'; // 'active', 'locked', 'completed'

    const statusColors = {
        active: { bg: '#FFD700', border: '#000', ring: '#FFD700' },
        locked: { bg: '#FF3366', border: '#000', ring: '#FF3366' },
        completed: { bg: '#33FF66', border: '#000', ring: '#33FF66' },
    };

    const colors = statusColors[status];
    const isActive = status === 'active';

    return (
        <div className="flex flex-col items-center font-mono">
            <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />

            {/* Status badge above */}
            {isActive && (
                <div className="mb-2 bg-black text-[#33FF66] text-[8px] font-black px-2 py-0.5 uppercase tracking-widest border border-[#33FF66]">
                    ▶ Current Mission
                </div>
            )}

            {/* Circle Node */}
            <div
                onClick={() => setShowAlts(!showAlts)}
                className="relative cursor-pointer group"
            >
                {/* Outer ring */}
                <div
                    className={`w-[90px] h-[90px] rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'animate-pulse' : ''}`}
                    style={{
                        background: `conic-gradient(${colors.ring} 0%, ${colors.ring}33 100%)`,
                        padding: '4px',
                    }}
                >
                    {/* Inner circle */}
                    <div
                        className="w-full h-full rounded-full flex flex-col items-center justify-center border-4 group-hover:scale-105 transition-transform"
                        style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                        }}
                    >
                        {status === 'locked' ? (
                            <span className="text-2xl">🔒</span>
                        ) : status === 'completed' ? (
                            <span className="text-2xl">✅</span>
                        ) : (
                            <span className="text-2xl">▶</span>
                        )}
                        <span className="text-[9px] font-black uppercase mt-0.5">
                            {tech.tasks} Tasks
                        </span>
                    </div>
                </div>

                {/* Task count badge */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white border-2 border-black px-2 py-0.5 text-[8px] font-black uppercase whitespace-nowrap">
                    {tech.logo} {tech.label}
                </div>
            </div>

            {/* Label below */}
            <div className="mt-5 text-center">
                <h3 className="text-[11px] font-black uppercase tracking-wide bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {tech.category}
                </h3>
            </div>

            {/* Alternatives popup */}
            {showAlts && (
                <div className="absolute top-full mt-8 bg-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 min-w-[160px]">
                    <div className="bg-black text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-wider">
                        Alternatives
                    </div>
                    {tech.alternatives.map((alt) => (
                        <div
                            key={alt.name}
                            className="px-3 py-2 flex items-center gap-2 hover:bg-[#FFD700] cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors"
                        >
                            <span className="text-base">{alt.logo}</span>
                            <span className="text-[10px] font-black">{alt.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
        </div>
    );
};

// Export node types mapping for ReactFlow
export const workflowNodeTypes = {
    express: WorkflowNode,
    mongodb: WorkflowNode,
    auth: WorkflowNode,
    react: WorkflowNode,
    stripe: WorkflowNode,
};

export default WorkflowNode;
