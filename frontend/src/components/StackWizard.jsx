import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Sparkles, Loader2, Code2, Layers, Server, Database, ShieldCheck, Globe, CreditCard } from 'lucide-react';

const STEPS = [
    {
        id: 'frontend',
        title: 'Frontend',
        subtitle: 'Choose your UI framework',
        icon: <Globe className="w-6 h-6" />,
        color: '#A020F0',
        options: [
            { id: 'react', name: 'React', logo: '⚛️', desc: 'Most popular UI library by Meta', tags: ['Popular', 'Industry Standard'] },
            { id: 'vue', name: 'Vue.js', logo: '💚', desc: 'Progressive & easy to learn', tags: ['Easy', 'Lightweight'] },
            { id: 'svelte', name: 'Svelte', logo: '🧡', desc: 'Compile-time, super fast', tags: ['Fast', 'Modern'] },
            { id: 'nextjs', name: 'Next.js', logo: '▲', desc: 'Full-stack React with SSR', tags: ['Full-Stack', 'SEO'] },
        ]
    },
    {
        id: 'backend',
        title: 'Backend',
        subtitle: 'Choose your server framework',
        icon: <Server className="w-6 h-6" />,
        color: '#00F0FF',
        options: [
            { id: 'express', name: 'Express.js', logo: '⚡', desc: 'Fast, minimalist Node.js framework', tags: ['Popular', 'Lightweight'] },
            { id: 'fastify', name: 'Fastify', logo: '🚀', desc: 'High-performance alternative', tags: ['Fast', 'Modern'] },
            { id: 'nestjs', name: 'NestJS', logo: '🐱', desc: 'Enterprise TypeScript framework', tags: ['Enterprise', 'TypeScript'] },
            { id: 'django', name: 'Django', logo: '🐍', desc: 'Python full-stack framework', tags: ['Python', 'Batteries-included'] },
        ]
    },
    {
        id: 'database',
        title: 'Database',
        subtitle: 'Choose where your data lives',
        icon: <Database className="w-6 h-6" />,
        color: '#33FF66',
        options: [
            { id: 'mongodb', name: 'MongoDB', logo: '🍃', desc: 'Flexible NoSQL document database', tags: ['NoSQL', 'Flexible'] },
            { id: 'postgres', name: 'PostgreSQL', logo: '🐘', desc: 'Powerful relational database', tags: ['SQL', 'Robust'] },
            { id: 'mysql', name: 'MySQL', logo: '🐬', desc: 'Most popular SQL database', tags: ['SQL', 'Popular'] },
            { id: 'firebase', name: 'Firebase', logo: '🔥', desc: 'Real-time cloud database', tags: ['Cloud', 'Real-time'] },
        ]
    },
    {
        id: 'auth',
        title: 'Authentication',
        subtitle: 'Choose how users will log in',
        icon: <ShieldCheck className="w-6 h-6" />,
        color: '#FF3366',
        options: [
            { id: 'google', name: 'Google OAuth', logo: '🔐', desc: 'Sign in with Google accounts', tags: ['Easy', 'Trusted'] },
            { id: 'jwt', name: 'JWT Auth', logo: '🎟️', desc: 'Token-based email/password login', tags: ['Custom', 'Flexible'] },
            { id: 'auth0', name: 'Auth0', logo: '🛡️', desc: 'Universal identity platform', tags: ['Enterprise', 'Managed'] },
            { id: 'none', name: 'Skip Auth', logo: '⏭️', desc: 'No authentication needed', tags: ['Simple', 'Public'] },
        ]
    },
    {
        id: 'payments',
        title: 'Payments',
        subtitle: 'Choose your payment gateway',
        icon: <CreditCard className="w-6 h-6" />,
        color: '#FFA500',
        options: [
            { id: 'stripe', name: 'Stripe', logo: '💳', desc: 'Global online payment processing', tags: ['Global', 'Developer-Friendly'] },
            { id: 'razorpay', name: 'Razorpay', logo: '💰', desc: 'India-focused payment gateway', tags: ['India', 'UPI'] },
            { id: 'paypal', name: 'PayPal', logo: '🅿️', desc: 'Worldwide payment platform', tags: ['Global', 'Trusted'] },
            { id: 'none', name: 'Skip Payments', logo: '⏭️', desc: 'No payments needed', tags: ['Free', 'Simple'] },
        ]
    },
];

const StackWizard = ({ onComplete, onGenerateCode }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const allSelected = STEPS.every(s => selections[s.id]);

    const handleSelect = (optionId) => {
        setSelections(prev => ({ ...prev, [step.id]: optionId }));
    };

    const handleNext = () => {
        if (isLastStep) return;
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep === 0) return;
        setCurrentStep(prev => prev - 1);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);

        const stackDescription = STEPS.map(s => {
            const opt = s.options.find(o => o.id === selections[s.id]);
            return `${s.title}: ${opt?.name || 'None'}`;
        }).join(', ');

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Generate a complete project file structure and code for this stack: ${stackDescription}.

Return the response in this EXACT format:

\`\`\`files
{
  "name": "my-app",
  "children": [
    {"name": "package.json", "content": "...actual package.json content..."},
    {"name": "server.js", "content": "...actual server code..."},
    {"name": "routes/", "children": [
      {"name": "api.js", "content": "...route code..."}
    ]},
    {"name": "models/", "children": [
      {"name": "User.js", "content": "...model code..."}
    ]},
    {"name": "frontend/", "children": [
      {"name": "App.jsx", "content": "...react component..."},
      {"name": "index.html", "content": "...html..."}
    ]}
  ]
}
\`\`\`

Generate REAL, working code. Include at least 8 files. Make package.json have correct dependencies for the chosen stack.`,
                    history: []
                }),
                credentials: 'include'
            });
            const data = await res.json();

            // Parse files from response
            const filesMatch = data.reply?.match(/```files\s*\n?([\s\S]*?)```/);
            if (filesMatch) {
                try {
                    const fileTree = JSON.parse(filesMatch[1]);
                    if (onGenerateCode) onGenerateCode(fileTree);
                } catch (e) {
                    console.error('Failed to parse file tree:', e);
                }
            }

            setGenerated(true);

            // Also trigger workflow nodes
            if (onComplete) {
                const components = Object.entries(selections)
                    .filter(([, val]) => val !== 'none')
                    .map(([key, val]) => ({ id: val, reason: key }));
                onComplete(components);
            }
        } catch (err) {
            console.error('Generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col font-mono overflow-hidden">
            {/* Progress Bar */}
            <div className="px-4 py-3 bg-white border-b-4 border-black shrink-0">
                <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <button
                                onClick={() => i <= currentStep && setCurrentStep(i)}
                                className={`flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase transition-all border-2 ${i === currentStep
                                        ? 'border-black bg-[#FFD700] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : selections[s.id]
                                            ? 'border-black bg-[#33FF66]'
                                            : 'border-gray-300 text-gray-400'
                                    }`}
                            >
                                {selections[s.id] ? <Check size={10} /> : <span>{i + 1}</span>}
                                <span className="hidden lg:inline">{s.title}</span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className={`w-4 h-0.5 ${selections[s.id] ? 'bg-black' : 'bg-gray-300'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[#1a1a2e] text-white">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin text-[#FFD700]" />
                        <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FFD700]" />
                    </div>
                    <div className="text-center">
                        <h2 className="font-black text-xl uppercase mb-2">🤖 Agent is Coding...</h2>
                        <p className="text-sm font-bold text-gray-400">Generating your project structure & code</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                        {Object.entries(selections).filter(([, v]) => v !== 'none').map(([key, val]) => (
                            <span key={key} className="px-2 py-1 border border-[#FFD700] text-[#FFD700] text-[9px] font-black uppercase">
                                {val}
                            </span>
                        ))}
                    </div>
                </div>
            ) : generated ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[#33FF66]/10">
                    <div className="text-6xl">🎉</div>
                    <h2 className="font-black text-2xl uppercase">Project Generated!</h2>
                    <p className="text-sm font-bold text-gray-600 text-center max-w-md">
                        Your code is ready! Check the <strong>Editor Panel</strong> on the right to explore your files.
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center">
                        {Object.entries(selections).filter(([, v]) => v !== 'none').map(([key, val]) => (
                            <span key={key} className="px-3 py-1.5 border-3 border-black bg-white font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {val}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={() => { setGenerated(false); setCurrentStep(0); setSelections({}); }}
                        className="mt-4 px-6 py-2 border-3 border-black bg-[#FFD700] font-black text-sm uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        Start Over
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div
                                className="p-2 border-3 border-black"
                                style={{ backgroundColor: step.color }}
                            >
                                {step.icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">
                                    Step {currentStep + 1} of {STEPS.length}
                                </p>
                                <h2 className="font-black text-xl uppercase tracking-tight">{step.title}</h2>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-600 ml-14">{step.subtitle}</p>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {step.options.map((opt) => {
                            const isSelected = selections[step.id] === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSelect(opt.id)}
                                    className={`p-4 border-3 text-left transition-all ${isSelected
                                            ? 'border-black bg-[#FFD700] shadow-none translate-x-1 translate-y-1'
                                            : 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{opt.logo}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-sm uppercase">{opt.name}</h3>
                                                {isSelected && <Check size={14} className="text-black" />}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-600 mt-1">{opt.desc}</p>
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {opt.tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-black/10 text-[8px] font-black uppercase">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            {!isGenerating && !generated && (
                <div className="px-6 py-4 border-t-4 border-black bg-white flex items-center justify-between shrink-0">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="flex items-center gap-1 px-3 py-2 border-2 border-black text-xs font-black uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back
                    </button>

                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {Object.keys(selections).length}/{STEPS.length} Selected
                    </span>

                    {isLastStep && allSelected ? (
                        <button
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-4 py-2 border-3 border-black bg-[#33FF66] font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            <Sparkles size={14} /> Generate Code
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={!selections[step.id]}
                            className="flex items-center gap-1 px-4 py-2 border-3 border-black bg-[#FFD700] font-black text-xs uppercase disabled:opacity-30 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            Next <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default StackWizard;
