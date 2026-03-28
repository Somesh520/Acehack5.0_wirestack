import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, Brain, Terminal, ShieldCheck, Zap,
    Lock, MessageSquare, Target, Layers, Activity,
    Radio, Plus, Minus, CheckCircle2, XCircle, Code2, Sparkles, Map
} from 'lucide-react';

/* ─── NEO-BRUTALISM TOKENS ───────────────────────────────
   BG:      #FFFFF0  (ivory white)
   Black:   #0D0D0D
   Yellow:  #FFE145  (primary punch)
   Pink:    #FF3EA5  (secondary punch)
   Green:   #3EFFB2  (success / live)
   Blue:    #2979FF  (code highlight)
   Shadow:  solid black, no blur
   ──────────────────────────────────────────────────────── */

const NEO = {
    bg: '#FFFFF0',
    black: '#0D0D0D',
    yellow: '#FFE145',
    pink: '#FF3EA5',
    green: '#3EFFB2',
    blue: '#2979FF',
    shadow: '6px 6px 0px #0D0D0D',
    shadowLg: '10px 10px 0px #0D0D0D',
    shadowXl: '16px 16px 0px #0D0D0D',
    border: '3px solid #0D0D0D',
};

/* ─── PRIMITIVE COMPONENTS ─────────────────────────────── */

const NeoBtn = ({ href, children, bg = NEO.yellow, style = {}, className = '' }) => (
    <a
        href={href}
        className={`inline-flex items-center gap-3 px-8 py-4 font-black text-sm uppercase tracking-wider no-underline transition-all active:translate-x-[6px] active:translate-y-[6px] group ${className}`}
        style={{
            background: bg,
            border: NEO.border,
            boxShadow: NEO.shadow,
            color: NEO.black,
            ...style,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = '3px 3px 0px #0D0D0D'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = NEO.shadow; }}
    >
        {children}
    </a>
);

const Tag = ({ children, bg = NEO.yellow }) => (
    <span
        className="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest"
        style={{ background: bg, border: '2px solid #0D0D0D', color: NEO.black }}
    >
        {children}
    </span>
);

const Card = ({ children, bg = 'white', className = '', style = {} }) => (
    <div
        className={`${className}`}
        style={{
            background: bg,
            border: NEO.border,
            boxShadow: NEO.shadowLg,
            ...style,
        }}
    >
        {children}
    </div>
);

/* ─── FEATURE CARD ─────────────────────────────────────── */
const FeatureCard = ({ icon, title, desc, bg, accent, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.4 }}
        whileHover={{ x: -4, y: -4, transition: { duration: 0.15 } }}
        className="p-8 flex flex-col gap-5 cursor-default"
        style={{ background: bg, border: NEO.border, boxShadow: NEO.shadowLg }}
    >
        <div
            className="w-14 h-14 flex items-center justify-center"
            style={{ background: accent, border: `3px solid ${NEO.black}`, boxShadow: `4px 4px 0 ${NEO.black}` }}
        >
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-black uppercase mb-2" style={{ color: NEO.black }}>{title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#444' }}>{desc}</p>
        </div>
    </motion.div>
);

/* ─── STEP ─────────────────────────────────────────────── */
const Step = ({ num, title, desc, accent, delay = 0, dark = false }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay }}
        className="flex gap-6"
    >
        <div
            className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-3xl font-black"
            style={{ background: accent, border: NEO.border, boxShadow: NEO.shadow, color: NEO.black }}
        >
            {num}
        </div>
        <div>
            <h3 className="text-lg font-black uppercase mb-1" style={{ color: dark ? 'white' : NEO.black }}>{title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: dark ? '#BBB' : '#555' }}>{desc}</p>
        </div>
    </motion.div>
);

/* ─── FAQ ITEM ─────────────────────────────────────────── */
const FAQItem = ({ q, a, accent, delay = 0 }) => {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            style={{ border: NEO.border, boxShadow: open ? NEO.shadowLg : NEO.shadow }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex justify-between items-center text-left px-8 py-6 gap-4"
                style={{ background: open ? accent : 'white' }}
            >
                <span className="font-black text-base uppercase tracking-tight" style={{ color: NEO.black }}>{q}</span>
                <span style={{ color: NEO.black, flexShrink: 0 }}>
                    {open ? <Minus size={22} strokeWidth={3} /> : <Plus size={22} strokeWidth={3} />}
                </span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <p
                            className="px-8 py-6 text-sm leading-relaxed"
                            style={{ background: '#FAFAF5', borderTop: '2px solid #0D0D0D', color: '#444' }}
                        >
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ─── MARQUEE STACKS ───────────────────────────────────── */
const stacks = ['React', 'Node.js', 'MongoDB', 'Express', 'Next.js', 'Python', 'PostgreSQL', 'Docker', 'TypeScript', 'FastAPI', 'Redis', 'GraphQL'];

/* ─── COMPARISON ───────────────────────────────────────── */
const CmpRow = ({ label, vibe, eng }) => (
    <div className="grid grid-cols-3 text-sm" style={{ borderBottom: '2px solid #0D0D0D' }}>
        <div className="px-6 py-4 font-bold bg-white" style={{ borderRight: '2px solid #0D0D0D', color: NEO.black }}>{label}</div>
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: '#FFF0F5', borderRight: '2px solid #0D0D0D', color: '#CC1C5B' }}>
            <XCircle size={14} /> {vibe}
        </div>
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: '#F0FFF8', color: '#127047' }}>
            <CheckCircle2 size={14} /> {eng}
        </div>
    </div>
);

/* ─── MAIN PAGE ────────────────────────────────────────── */
const LandingPage = () => (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: NEO.bg }}>

        {/* ══ NAVBAR ══════════════════════════════════════════════ */}
        <nav className="sticky top-0 z-50 px-6 py-4" style={{ background: NEO.bg, borderBottom: NEO.border }}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 flex items-center justify-center font-black text-lg"
                        style={{ background: NEO.yellow, border: NEO.border, boxShadow: NEO.shadow }}
                    >
                        W
                    </div>
                    <span className="font-black text-2xl uppercase tracking-tighter" style={{ color: NEO.black }}>Wirestack</span>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    {['Philosophy', 'Protocol', 'FAQ'].map(item => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="px-5 py-2 font-black text-xs uppercase tracking-widest no-underline hover:bg-black hover:text-white transition-colors"
                            style={{ color: NEO.black }}
                        >
                            {item}
                        </a>
                    ))}
                </div>

                <NeoBtn href="/login" bg={NEO.yellow}>
                    Start Mission <ArrowRight size={16} strokeWidth={3} />
                </NeoBtn>
            </div>
        </nav>

        {/* ══ HERO ════════════════════════════════════════════════ */}
        <section className="relative px-6 pt-24 pb-32 overflow-hidden">
            {/* Background hatching decoration */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
            />

            <div className="max-w-7xl mx-auto">
                {/* Announcement bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-10"
                >
                    <Tag bg={NEO.green}><Radio size={10} className="inline mr-1 animate-pulse" />v5.0 Online</Tag>
                    <Tag bg="white">Anti-Vibe Engine Active</Tag>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Copy */}
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter uppercase"
                            style={{ color: NEO.black }}
                        >
                            Stop<br />
                            <span
                                className="italic"
                                style={{ WebkitTextStroke: `4px ${NEO.black}`, color: NEO.yellow }}
                            >Vibing.</span><br />
                            Start<br />
                            Build<span style={{ color: NEO.pink }}>ing.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="mt-10 text-lg leading-relaxed max-w-sm font-medium"
                            style={{ color: '#333' }}
                        >
                            The platform that forces you to <strong>manually type, deeply understand,</strong> and{' '}
                            <strong>defend every line of code</strong> before you're allowed to advance.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-10 flex flex-wrap gap-4"
                        >
                            <NeoBtn href="/login" bg={NEO.yellow} style={{ boxShadow: NEO.shadowLg, fontSize: '1rem', padding: '18px 36px' }}>
                                Begin Mission <ArrowRight size={20} strokeWidth={3} />
                            </NeoBtn>
                            <NeoBtn href="#philosophy" bg="white">
                                Learn More
                            </NeoBtn>
                        </motion.div>

                        {/* Trust badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="mt-12 flex flex-wrap gap-4"
                        >
                            {[
                                ['Zero Auto-Complete', NEO.yellow],
                                ['AI-Verified Mastery', NEO.green],
                                ['Groq-Powered INTEL', NEO.pink],
                            ].map(([label, bg]) => (
                                <Tag key={label} bg={bg}>{label}</Tag>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: Terminal Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <Card style={{ boxShadow: NEO.shadowXl }}>
                            {/* Terminal bar */}
                            <div
                                className="flex items-center justify-between px-6 py-4"
                                style={{ background: NEO.black, borderBottom: NEO.border }}
                            >
                                <div className="flex gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ background: NEO.pink, border: '2px solid white' }} />
                                    <div className="w-4 h-4 rounded-full" style={{ background: NEO.yellow, border: '2px solid white' }} />
                                    <div className="w-4 h-4 rounded-full" style={{ background: NEO.green, border: '2px solid white' }} />
                                </div>
                                <span className="font-mono text-xs font-bold" style={{ color: NEO.green }}>
                                    Vibe_Check — Analysis_Running
                                </span>
                                <Tag bg={NEO.green}>
                                    <Activity size={10} className="inline mr-1 animate-pulse" />Live
                                </Tag>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: '3px solid #0D0D0D' }}>
                                {/* Code panel */}
                                <div
                                    className="p-8 font-mono text-sm"
                                    style={{ background: '#1C1C1C', borderRight: '2px solid #0D0D0D' }}
                                >
                                    <p className="text-xs mb-4 font-bold uppercase" style={{ color: NEO.yellow }}>
                                        // Mission: useEffect Hook
                                    </p>
                                    <div className="leading-8" style={{ color: '#CCC' }}>
                                        <p><span style={{ color: '#FF79C6' }}>const</span> useFetch = (url) =&gt; {'{'}</p>
                                        <p className="pl-4"><span style={{ color: '#FF79C6' }}>const</span> [data, setData] = useState(null);</p>
                                        <p className="pl-4">useEffect(() =&gt; {'{'}</p>
                                        <p className="pl-8">fetch(url).then(r =&gt; r.json())</p>
                                        <p className="pl-12">.then(setData);</p>
                                        <p className="pl-4 font-black" style={{ color: NEO.pink }}>{'}, [url]);'}
                                            <span
                                                className="ml-2 px-2 py-0.5 text-[10px] font-black"
                                                style={{ background: NEO.pink, color: 'white', border: '1px solid white' }}
                                            >← THIS</span>
                                        </p>
                                        <p>{'}'}</p>
                                    </div>
                                </div>

                                {/* AI Probe panel */}
                                <div className="p-8 flex flex-col gap-6" style={{ background: 'white' }}>
                                    <Tag bg={NEO.pink}>AI Probe</Tag>
                                    <p className="font-black text-base leading-relaxed" style={{ color: NEO.black }}>
                                        "Why does <code
                                            className="px-2 py-0.5 font-mono"
                                            style={{ background: NEO.yellow, border: '2px solid #0D0D0D' }}
                                        >url</code> belong in the dependency array? What breaks if you leave it empty?"
                                    </p>
                                    <div
                                        className="p-4 flex items-center gap-2"
                                        style={{ border: '2px dashed #BBB' }}
                                    >
                                        <div
                                            className="w-2 h-2 rounded-full animate-pulse"
                                            style={{ background: NEO.pink }}
                                        />
                                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#888' }}>
                                            Awaiting your explanation...
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status bar */}
                            <div
                                className="flex items-center gap-4 px-6 py-3"
                                style={{ background: NEO.green }}
                            >
                                <Activity size={14} style={{ color: NEO.black }} />
                                <span className="text-xs font-black uppercase tracking-widest" style={{ color: NEO.black }}>
                                    Groq_Inference_Engine: ACTIVE · Vibe_Check: PENDING
                                </span>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </section>

        {/* ══ STACK MARQUEE ═══════════════════════════════════════ */}
        <div
            className="overflow-hidden py-8"
            style={{ background: NEO.black, borderTop: NEO.border, borderBottom: NEO.border }}
        >
            <div className="flex gap-12 animate-marquee-slower whitespace-nowrap">
                {[...stacks, ...stacks].map((s, i) => (
                    <div
                        key={i}
                        className="px-6 py-3 font-black text-lg uppercase tracking-wider flex-shrink-0"
                        style={{ background: i % 3 === 0 ? NEO.yellow : i % 3 === 1 ? NEO.pink : NEO.green, color: NEO.black, border: '2px solid rgba(255,255,255,0.3)' }}
                    >
                        {s}
                    </div>
                ))}
            </div>
        </div>

        {/* ══ PHILOSOPHY (FEATURES) ═══════════════════════════════ */}
        <section id="philosophy" className="py-40 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-20">
                    <Tag bg={NEO.pink} className="mb-4">Core Philosophy</Tag>
                    <h2
                        className="text-5xl md:text-7xl font-black uppercase tracking-tighter mt-4"
                        style={{ color: NEO.black }}
                    >
                        Built to break<br />
                        <span style={{ color: NEO.pink }}>bad habits.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        delay={0}
                        bg="white"
                        accent={NEO.yellow}
                        icon={<Terminal size={28} color={NEO.black} />}
                        title="Type Every Character"
                        desc="Auto-complete is deleted. Snippets are gone. If you cannot write it from memory, you do not know it yet. That's the rule."
                    />
                    <FeatureCard
                        delay={0.1}
                        bg={NEO.yellow}
                        accent={NEO.black}
                        icon={<Brain size={28} color="white" />}
                        title="Explain Your Why"
                        desc="After each module, our local AI asks you to defend specific decisions. Vague answers fail. Conceptual depth is the only currency."
                    />
                    <FeatureCard
                        delay={0.2}
                        bg="white"
                        accent={NEO.pink}
                        icon={<ShieldCheck size={28} color={NEO.black} />}
                        title="Locked Until Mastered"
                        desc="You don't move forward until you pass the Vibe Check. No skipping. No workarounds. This is the bottleneck that builds engineers."
                    />
                    <FeatureCard
                        delay={0.15}
                        bg={NEO.green}
                        accent={NEO.black}
                        icon={<Zap size={28} color={NEO.black} />}
                        title="Personalized Baseline"
                        desc="An AI diagnostic test finds your precise level. You start exactly where you need to, not from zero and not from too advanced."
                    />
                    <FeatureCard
                        delay={0.25}
                        bg="white"
                        accent={NEO.blue}
                        icon={<Target size={28} color={NEO.black} />}
                        title="XP for Depth"
                        desc="Your score is based on how deeply you understand, not how quickly you finish. Thorough explanations beat fast ones every time."
                    />
                    <FeatureCard
                        delay={0.3}
                        bg={NEO.pink}
                        accent={NEO.yellow}
                        icon={<Sparkles size={28} color={NEO.black} />}
                        title="Neural Architect"
                        desc="Powered by Groq's ultra-fast Llama-3 reasoning. Sub-second code critiques and architectural verification at the speed of thought."
                    />
                </div>
            </div>
        </section>

        {/* ══ PROTOCOL ════════════════════════════════════════════ */}
        <section id="protocol" className="py-40 px-6" style={{ background: NEO.black }}>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div>
                    <Tag bg={NEO.yellow}>The Training Protocol</Tag>
                    <h2
                        className="text-5xl md:text-6xl font-black uppercase tracking-tighter mt-4 mb-6"
                        style={{ color: 'white' }}
                    >
                        Three phases.<br />
                        <span style={{ color: NEO.yellow }}>No shortcuts.</span>
                    </h2>
                    <p className="text-base leading-relaxed mb-16" style={{ color: '#888' }}>
                        Every great engineer builds on deliberate, focused practice. Wirestack takes you through a battle-tested process that leaves zero room for copy-paste shortcuts.
                    </p>
                    <div className="flex flex-col gap-10">
                        <Step num="01" delay={0} accent={NEO.yellow} dark={true} title="Diagnostic Baseline"
                            desc="AI probes your conceptual depth across your chosen stack. Raw logic questions — no code yet. You're placed on a personalized roadmap."
                        />
                        <Step num="02" delay={0.1} accent={NEO.pink} dark={true} title="Manual Execution"
                            desc="Build the assigned challenge in our deliberate editor. No suggestions. No hints. Every keystroke is yours."
                        />
                        <Step num="03" delay={0.2} accent={NEO.green} dark={true} title="Intel Extraction"
                            desc="Explain your code decisions to the AI in plain English. Depth, accuracy, and specificity are scored. Pass the gate to advance."
                        />
                    </div>
                </div>

                {/* Roadmap Visual */}
                <div style={{ border: `3px solid #333`, boxShadow: `10px 10px 0 ${NEO.yellow}` }}>
                    <div
                        className="px-6 py-4 font-mono text-xs font-black uppercase tracking-widest"
                        style={{ background: NEO.yellow, color: NEO.black, borderBottom: '2px solid #0D0D0D' }}
                    >
                        Mission_Roadmap — JavaScript Track
                    </div>
                    {[
                        { label: 'JS Fundamentals', xp: '+200 XP', done: true, color: NEO.green },
                        { label: 'Closures & Scope', xp: '+300 XP', done: true, color: NEO.green },
                        { label: 'Async / Await', xp: '+400 XP', active: true, color: NEO.yellow },
                        { label: 'Event Loop', xp: '+500 XP', done: false, color: '#444' },
                        { label: 'Prototype Chain', xp: '+600 XP', done: false, color: '#444' },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-6 py-5"
                            style={{
                                borderBottom: i < 4 ? '2px solid #333' : 'none',
                                background: item.active ? '#1A1A0A' : 'transparent',
                                opacity: !item.done && !item.active ? 0.4 : 1,
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-8 h-8 flex items-center justify-center text-base font-black"
                                    style={{
                                        background: item.color,
                                        border: `2px solid ${item.done || item.active ? item.color : '#444'}`,
                                        color: item.done ? NEO.black : item.active ? NEO.black : '#777',
                                    }}
                                >
                                    {item.done ? '✓' : item.active ? '→' : <Lock size={12} className="text-gray-500" />}
                                </div>
                                <span className="font-black text-sm" style={{ color: item.active ? NEO.yellow : item.done ? 'white' : '#555' }}>
                                    {item.label}
                                </span>
                                {item.active && <Tag bg={NEO.yellow}>Active</Tag>}
                            </div>
                            <span className="text-xs font-black" style={{ color: item.color }}>{item.xp}</span>
                        </div>
                    ))}
                    {/* Bottom Bar */}
                    <div
                        className="px-6 py-4 flex items-center gap-3"
                        style={{ background: '#111', borderTop: '2px solid #333' }}
                    >
                        <Activity size={12} style={{ color: NEO.green }} />
                        <span className="text-xs font-black" style={{ color: NEO.green }}>Level 3 · 700 XP · Vibe_Check: PENDING</span>
                    </div>
                </div>
            </div>
        </section>

        {/* ══ COMPARISON ══════════════════════════════════════════ */}
        <section className="py-40 px-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-20">
                    <Tag bg={NEO.green}>The Reality Check</Tag>
                    <h2
                        className="text-5xl md:text-7xl font-black uppercase tracking-tight mt-4"
                        style={{ color: NEO.black }}
                    >
                        Vibe Coder<br />
                        <span style={{ color: NEO.pink }}>vs.</span> Engineer.
                    </h2>
                </div>

                <Card style={{ overflow: 'hidden' }}>
                    <div className="grid grid-cols-3" style={{ background: NEO.black, borderBottom: '2px solid #0D0D0D' }}>
                        <div className="px-6 py-4 text-xs font-black uppercase tracking-widest" style={{ color: '#888' }}>Skill</div>
                        <div className="px-6 py-4 text-xs font-black uppercase tracking-widest text-center" style={{ color: NEO.pink, borderLeft: '2px solid #333' }}>Vibe Coder</div>
                        <div className="px-6 py-4 text-xs font-black uppercase tracking-widest text-center" style={{ color: NEO.green, borderLeft: '2px solid #333' }}>Engineer</div>
                    </div>
                    <CmpRow label="Writes Code" vibe="Copies & pastes" eng="Types from memory" />
                    <CmpRow label="Debugging" vibe="Panics, asks LLM" eng="Reads error, traces logic" />
                    <CmpRow label="Without IDE" vibe="Completely lost" eng="Works comfortably" />
                    <CmpRow label="LLM Reliance" vibe="Daily crutch" eng="Design tool only" />
                    <CmpRow label="In Interviews" vibe="Can't explain code" eng="Walks through it cold" />
                </Card>
            </div>
        </section>

        {/* ══ FAQ ═════════════════════════════════════════════════ */}
        <section id="faq" className="py-40 px-6" style={{ background: '#F5F5E8' }}>
            <div className="max-w-3xl mx-auto">
                <div className="mb-20">
                    <Tag bg={NEO.blue} style={{ color: 'white' }}>FAQs</Tag>
                    <h2
                        className="text-5xl md:text-6xl font-black uppercase tracking-tight mt-4"
                        style={{ color: NEO.black }}
                    >
                        Got Questions?<br />
                        <span style={{ color: NEO.blue }}>We Have Intel.</span>
                    </h2>
                </div>

                <div className="flex flex-col gap-5">
                    <FAQItem delay={0} accent={NEO.yellow} q="Why is auto-complete disabled?" a="Because if your IDE can finish your sentences, you haven't internalized the syntax yet. We're building engineers who can write correct code in a bare text editor — no hand-holding required." />
                    <FAQItem delay={0.1} accent={NEO.pink} q="What if I fail the Vibe Check?" a="You review the concept and try again. The AI tells you exactly which part of your explanation was shallow, vague, or incorrect. Failure is feedback — not punishment." />
                    <FAQItem delay={0.2} accent={NEO.green} q="Is this for absolute beginners?" a="Yes. The diagnostic test calibrates your entry point. Beginners start from fundamentals; experienced developers advance through harder missions faster." />
                    <FAQItem delay={0.3} accent={NEO.yellow} q="Why Groq-powered AI instead of others?" a="Sub-second inference speed at zero latency. Our Groq-powered backend provides high-performance code analysis that feels instant, with the deep reasoning power of a world-class LLM." />
                    <FAQItem delay={0.4} accent={NEO.pink} q="How is XP calculated?" a="XP is awarded based on the depth, specificity, and accuracy of your Vibe Check responses — not your speed. A precise, conceptually rich explanation earns max XP." />
                </div>
            </div>
        </section>

        {/* ══ FINAL CTA ═══════════════════════════════════════════ */}
        <section className="py-40 px-6" style={{ background: NEO.yellow, borderTop: NEO.border }}>
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16">
                <div>
                    <h2
                        className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]"
                        style={{ color: NEO.black }}
                    >
                        Stop<br />Vibing.<br />
                        <span style={{ color: NEO.pink, WebkitTextStroke: `3px ${NEO.black}` }}>Engineer_</span>
                    </h2>
                </div>
                <div className="flex flex-col gap-6">
                    <p className="text-base font-bold max-w-sm" style={{ color: '#333' }}>
                        The engineers who win in the AI era are the ones who understand deeply — not the ones who prompt best.
                    </p>
                        <NeoBtn
                            href="/login"
                            bg="black"
                            style={{ color: 'white', boxShadow: '8px 8px 0 rgba(0,0,0,0.3)', fontSize: '1.1rem', padding: '20px 48px' }}
                        >
                            Join the Mission — Free <ArrowRight size={20} strokeWidth={3} />
                        </NeoBtn>
                    <div className="flex gap-4">
                        <Tag bg={NEO.pink}>Zero Crutches</Tag>
                        <Tag bg={NEO.green}>AI-Verified</Tag>
                    </div>
                </div>
            </div>
        </section>

        {/* ══ FOOTER ══════════════════════════════════════════════ */}
        <footer className="px-6 py-16" style={{ background: NEO.black, borderTop: NEO.border }}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-10 h-10 flex items-center justify-center font-black text-lg"
                            style={{ background: NEO.yellow, border: '3px solid white' }}
                        >
                            W
                        </div>
                        <span className="font-black text-2xl uppercase text-white">Wirestack</span>
                    </div>
                    <p className="max-w-xs text-sm leading-relaxed" style={{ color: '#555' }}>
                        The anti-vibe-coding platform. Built for engineers who refuse to stay shallow.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-16 text-sm">
                    <div>
                        <p className="font-black text-white mb-4 uppercase text-xs tracking-widest">Platform</p>
                        <div className="flex flex-col gap-3" style={{ color: '#555' }}>
                            {['Diagnostic', 'Learning Room', 'Vibe Check'].map(l => (
                                <a key={l} href="#" className="hover:text-white transition-colors no-underline font-semibold">{l}</a>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="font-black text-white mb-4 uppercase text-xs tracking-widest">Company</p>
                        <div className="flex flex-col gap-3" style={{ color: '#555' }}>
                            {['Philosophy', 'GitHub', 'Privacy'].map(l => (
                                <a key={l} href="#" className="hover:text-white transition-colors no-underline font-semibold">{l}</a>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-gray-600 mb-2">© 2026 Wirestack Systems</p>
                    <div className="flex items-center justify-end gap-2 text-xs" style={{ color: NEO.green }}>
                        <Activity size={12} className="animate-pulse" />
                        <span className="font-black uppercase tracking-widest">All Systems Nominal</span>
                    </div>
                </div>
            </div>
        </footer>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-marquee-slower {
                animation: marquee 30s linear infinite;
            }
            .animate-marquee-slower:hover {
                animation-play-state: paused;
            }
        ` }} />
    </div>
);

export default LandingPage;
