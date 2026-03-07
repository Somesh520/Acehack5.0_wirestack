import React, { useState, useEffect } from 'react';
import { X, Zap, Clock, Target, Layers, ArrowRight, Loader2 } from 'lucide-react';

const NodeDetailPanel = ({ node, onClose }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    const techNames = {
        express: 'Express.js',
        mongodb: 'MongoDB',
        auth: 'Google Auth / OAuth',
        react: 'React.js',
        stripe: 'Stripe Payments'
    };

    const techColors = {
        express: '#00F0FF',
        mongodb: '#33FF66',
        auth: '#FF3366',
        react: '#A020F0',
        stripe: '#FFA500'
    };

    const nodeType = node?.type || 'express';
    const techName = techNames[nodeType] || nodeType;
    const color = techColors[nodeType] || '#FFD700';

    useEffect(() => {
        if (!node) return;
        setLoading(true);

        fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Explain "${techName}" for a non-technical person building a web app. Structure your answer EXACTLY like this with these exact headers:

**WHY:** Why is ${techName} used? (2 sentences)
**WHEN:** When should someone use ${techName}? (2 sentences)  
**HOW IT WORKS:** Simple analogy of how it works (1-2 sentences)
**TYPES & ALTERNATIVES:**
- Type 1: Name — one line description
- Type 2: Name — one line description
- Type 3: Name — one line description
**DIFFICULTY:** Easy/Medium/Hard
**SETUP TIME:** Approximate time to set up`,
                history: []
            }),
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                setDetails(data.reply);
                setLoading(false);
            })
            .catch(() => {
                setDetails('Could not load details. Try again!');
                setLoading(false);
            });
    }, [node, techName]);

    if (!node) return null;

    const parseSection = (text, header) => {
        if (!text) return '';
        const regex = new RegExp(`\\*\\*${header}:\\*\\*\\s*(.+?)(?=\\*\\*[A-Z]|$)`, 's');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 font-mono">
            <div className="w-[500px] max-h-[85vh] bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="px-5 py-4 border-b-4 border-black flex items-center justify-between shrink-0"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5" />
                        <h2 className="font-black text-lg uppercase tracking-tight">{techName}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
                            <p className="text-sm font-bold text-gray-500 uppercase">WireStack Agent analyzing...</p>
                        </div>
                    ) : (
                        <>
                            {/* WHY */}
                            <div className="p-4 border-3 border-black bg-[#FFD700]/20">
                                <h3 className="font-black text-xs uppercase mb-2 flex items-center gap-2">
                                    <Target size={14} /> Why Use It?
                                </h3>
                                <p className="text-xs font-bold leading-relaxed">
                                    {parseSection(details, 'WHY') || 'Essential for your app architecture.'}
                                </p>
                            </div>

                            {/* WHEN */}
                            <div className="p-4 border-3 border-black bg-[#00F0FF]/20">
                                <h3 className="font-black text-xs uppercase mb-2 flex items-center gap-2">
                                    <Clock size={14} /> When To Use?
                                </h3>
                                <p className="text-xs font-bold leading-relaxed">
                                    {parseSection(details, 'WHEN') || 'When building modern web applications.'}
                                </p>
                            </div>

                            {/* HOW IT WORKS */}
                            <div className="p-4 border-3 border-black bg-[#33FF66]/20">
                                <h3 className="font-black text-xs uppercase mb-2 flex items-center gap-2">
                                    <Zap size={14} /> How It Works
                                </h3>
                                <p className="text-xs font-bold leading-relaxed">
                                    {parseSection(details, 'HOW IT WORKS') || 'Works seamlessly with other components.'}
                                </p>
                            </div>

                            {/* TYPES & ALTERNATIVES */}
                            <div className="p-4 border-3 border-black bg-[#A020F0]/10">
                                <h3 className="font-black text-xs uppercase mb-3 flex items-center gap-2">
                                    <Layers size={14} /> Types & Alternatives
                                </h3>
                                <div className="space-y-2">
                                    {(parseSection(details, 'TYPES & ALTERNATIVES') || '- Option 1\n- Option 2\n- Option 3')
                                        .split('\n')
                                        .filter(line => line.trim().startsWith('-'))
                                        .map((line, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 bg-white border-2 border-black hover:bg-[#FFD700]/30 transition-colors">
                                                <ArrowRight size={10} className="shrink-0" />
                                                <span className="text-[11px] font-bold">{line.replace(/^-\s*/, '')}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Difficulty & Setup */}
                            <div className="flex gap-3">
                                <div className="flex-1 p-3 border-3 border-black bg-[#FF3366]/10 text-center">
                                    <h4 className="text-[9px] font-black uppercase text-gray-500 mb-1">Difficulty</h4>
                                    <p className="text-sm font-black uppercase">
                                        {parseSection(details, 'DIFFICULTY') || 'Medium'}
                                    </p>
                                </div>
                                <div className="flex-1 p-3 border-3 border-black bg-[#FFA500]/10 text-center">
                                    <h4 className="text-[9px] font-black uppercase text-gray-500 mb-1">Setup Time</h4>
                                    <p className="text-sm font-black uppercase">
                                        {parseSection(details, 'SETUP TIME') || '~30 min'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t-4 border-black bg-gray-50 shrink-0">
                    <p className="text-[9px] font-bold text-gray-400 uppercase text-center">
                        🤖 Generated by WireStack Agent • Click other nodes to explore
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NodeDetailPanel;
