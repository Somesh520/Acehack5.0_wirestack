import React, { useState } from 'react';
import { Menu, User, ArrowRight, Play, Server, Database, Shield, Zap, Workflow, CheckSquare, Star, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LandingPage = () => {
    return (
        <div className="min-h-screen text-black overflow-hidden relative font-sans selection:bg-[#ffd800] selection:text-black flex flex-col items-center">

            {/* Navigation */}
            <nav className="w-full px-6 py-6 pb-0 flex justify-between items-center z-10 relative max-w-7xl mx-auto">
                <button className="w-12 h-12 border-[4px] border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
                    <Menu className="w-6 h-6 stroke-[4]" />
                </button>
                <div className="hidden md:flex gap-8 font-black uppercase tracking-widest border-[4px] border-black bg-white px-8 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <a href="#features" className="hover:underline decoration-4 underline-offset-4">Features</a>
                    <a href="#use-cases" className="hover:underline decoration-4 underline-offset-4">Use Cases</a>
                    <a href="#integrations" className="hover:underline decoration-4 underline-offset-4">Integrations</a>
                    <a href="#faq" className="hover:underline decoration-4 underline-offset-4">FAQs</a>
                </div>
                <button className="w-12 h-12 border-[4px] border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
                    <User className="w-6 h-6 stroke-[4]" />
                </button>
            </nav>

            {/* Hero Content (Exact Layout Preserved) */}
            <main className="w-full flex-1 flex flex-col items-center justify-center px-4 max-w-7xl relative z-10 mt-16 md:mt-24 mb-32">

                {/* Version Tag */}
                <div className="bg-black text-white px-4 py-2 text-sm tracking-widest font-mono transform rotate-[-3deg] mb-8 uppercase" style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700 }}>
                    V4.0 ONLINE
                </div>

                {/* Just Ask Title */}
                <h1 className="text-6xl sm:text-8xl md:text-[8rem] lg:text-[10rem] leading-none tracking-[0.05em] font-black mb-6 z-10 relative uppercase text-center" style={{ fontFamily: "monospace" }}>
                    WIRE<span className="text-[#418df4] stroke-black">STACK</span>
                </h1>

                {/* Yellow Subtitle Box */}
                <div className="bg-[#ffd800] border-[4px] border-black font-black text-xl md:text-3xl px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-1 mb-20 uppercase tracking-tight text-center">
                    Drag. Connect. Deploy.
                </div>

                {/* Big Blue CTA - Replacing Goal Input & Old CTA */}
                <a href="http://localhost:3000/api/auth/google" className="w-full xl:w-[800px] bg-[#418df4] hover:bg-[#347be0] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none transition-all flex flex-col sm:flex-row items-center justify-center py-6 gap-3 lg:gap-5 group px-8 z-20 mx-auto transform -rotate-1 no-underline">
                    <span className="font-black text-2xl md:text-4xl text-white tracking-widest flex items-center gap-4 drop-shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] whitespace-nowrap uppercase">
                        OPEN BUILDER IDE <ArrowRight className="w-8 h-8 md:w-10 md:h-10 stroke-[4]" />
                    </span>
                </a>
            </main>

            {/* Social Proof (Brutalist Marquee Style) */}
            <section className="w-full border-y-[4px] border-black bg-white overflow-hidden py-4 flex items-center max-w-[100vw] text-xl md:text-3xl font-black uppercase tracking-widest relative">
                <div className="flex gap-12 whitespace-nowrap animate-[marquee_20s_linear_infinite] px-4">
                    <span>TRUSTED BY ACME CORP</span> <span>•</span>
                    <span>POWERING GLOBEX INC</span> <span>•</span>
                    <span>SOYUZ SYSTEMS</span> <span>•</span>
                    <span>WAYNE ENTERPRISES</span> <span>•</span>
                    <span>STARK INDUSTRIES</span> <span>•</span>
                    <span>TRUSTED BY ACME CORP</span> <span>•</span>
                    <span>POWERING GLOBEX INC</span>
                </div>
                {/* Add CSS for marquee animation manually because standard tailwind doesn't have it by default */}
                <style dangerouslySetInnerHTML={{
                    __html: `
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          `}} />
            </section>

            {/* Features Bento Grid (Brutalist Edition) */}
            <section id="features" className="w-full py-24 px-6 max-w-7xl mx-auto">
                <div className="mb-16 border-[4px] border-black bg-[#ffd800] inline-block px-8 py-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Everything to ship faster.</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-auto">

                    <BrutalistCard color="bg-white" className="md:col-span-2">
                        <div className="w-16 h-16 border-[4px] border-black bg-[#418df4] mb-6 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Workflow className="w-8 h-8 text-white stroke-[3]" />
                        </div>
                        <h3 className="text-3xl font-black uppercase mb-4 tracking-tight">Visual Architecture</h3>
                        <p className="text-xl font-bold font-mono leading-relaxed opacity-80 uppercase">
                            Drag, drop, and connect full-stack components. Map out your data flow and API routes before writing a single line of code.
                        </p>
                    </BrutalistCard>

                    <BrutalistCard color="bg-[#f472b6]">
                        <div className="w-16 h-16 border-[4px] border-black bg-[#ffd800] mb-6 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Zap className="w-8 h-8 text-black stroke-[3]" />
                        </div>
                        <h3 className="text-2xl font-black uppercase mb-4 tracking-tight">Instant Scaffolding</h3>
                        <p className="font-bold font-mono uppercase opacity-90">Generate production-ready code in milliseconds.</p>
                    </BrutalistCard>

                    <BrutalistCard color="bg-[#4ade80]">
                        <div className="w-16 h-16 border-[4px] border-black bg-white mb-6 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Database className="w-8 h-8 text-black stroke-[3]" />
                        </div>
                        <h3 className="text-2xl font-black uppercase mb-4 tracking-tight">Smart Databases</h3>
                        <p className="font-bold font-mono uppercase opacity-90">ORMs and Migrations configured exactly to your schema.</p>
                    </BrutalistCard>

                    <BrutalistCard color="bg-[#fb923c]" className="md:col-span-2 flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                            <div className="w-16 h-16 border-[4px] border-black bg-white mb-6 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Shield className="w-8 h-8 text-black stroke-[3]" />
                            </div>
                            <h3 className="text-3xl font-black uppercase mb-4 tracking-tight">Enterprise Security</h3>
                            <p className="text-xl font-bold font-mono uppercase opacity-90">
                                Auth0, JWTs, and CSRF protection baked right into your generated boilerplate by default.
                            </p>
                        </div>
                        <div className="w-full md:w-64 h-32 border-[4px] border-black bg-black text-[#4ade80] flex items-center justify-center font-black font-mono shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                            [ SECURE: TRUE ]
                        </div>
                    </BrutalistCard>

                </div>
            </section>

            {/* How it Works / Use Cases */}
            <section id="use-cases" className="w-full py-24 border-y-[4px] border-black bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-16 border-[4px] border-black bg-[#4ade80] inline-block px-8 py-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Go from idea to URL.</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative mt-12">
                        {/* Thick zigzag connector behind cards on desktop */}
                        <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[8px] bg-black z-0 border-y-[2px] border-dashed border-white" />

                        <StepCard num="01" title="Map it out" desc="Connect UI nodes to Server nodes visually on the infinite canvas." color="bg-[#ffd800]" />
                        <StepCard num="02" title="Configure Logic" desc="Define variables, secrets, and strict CORS policies inside the nodes." color="bg-[#f472b6]" />
                        <StepCard num="03" title="Generate Code" desc="Download a zipped repo ready for deployment in one click." color="bg-[#418df4]" />
                    </div>
                </div>
            </section>

            {/* Developer Experience (Replaced Wall of Love) */}
            <section className="w-full py-24 px-6 max-w-7xl mx-auto">
                <h2 className="text-5xl font-black uppercase tracking-tighter mb-16 text-center underline decoration-[#f472b6] decoration-8 underline-offset-8">Developer First</h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <DevFeatureCard
                        title="FULL CONTROL"
                        text="You are never locked in. Download your complete codebase, modify the Express routing, or tweak the React components exactly how you want."
                        color="bg-white"
                    />
                    <DevFeatureCard
                        title="NO MAGIC, JUST AST"
                        text="WireStack uses rigorous Abstract Syntax Tree (AST) parsing under the hood to write precise, predictable boilerplate code that compiles perfectly."
                        color="bg-[#ffd800]"
                        rotation="rotate-1"
                    />
                    <DevFeatureCard
                        title="ENVIRONMENT READY"
                        text="Every generated project includes perfectly configured .env files, standard start scripts, and optional Dockerfiles for immediate deployment."
                        color="bg-[#4ade80]"
                        rotation="-rotate-1"
                    />
                </div>
            </section>


            {/* Integrations */}
            <section id="integrations" className="w-full py-24 border-y-[4px] border-black bg-[#4ade80]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="border-[4px] border-black bg-white inline-block px-8 py-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Plug & Play</h2>
                        </div>
                        <p className="font-bold font-mono text-xl mt-6 uppercase">Connect with your favorite tools instantly.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 items-stretch pt-8">
                        <IntegrationCard
                            title="PAYMENTS"
                            desc="Monetize your app in seconds with secure payment gateways."
                            features={["Stripe Checkout", "Webhook Listeners", "Subscription Logic"]}
                            color="bg-[#ffd800]"
                        />
                        <IntegrationCard
                            title="DATABASES"
                            desc="Store and query data without writing complex ORM logic."
                            features={["MongoDB Nodes", "PostgreSQL (Prisma)", "Redis Caching"]}
                            color="bg-white"
                            isPro={true}
                        />
                        <IntegrationCard
                            title="AUTHENTICATION"
                            desc="Enterprise-grade security and user management out of the box."
                            features={["Google OAuth", "JWT Sessions", "Role-Based Access"]}
                            color="bg-[#f472b6]"
                        />
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="w-full py-24 px-6 max-w-4xl mx-auto">
                <h2 className="text-5xl font-black uppercase tracking-tighter mb-16 text-center">FAQs</h2>

                <div className="space-y-6">
                    <FAQItem
                        q="What gets included in the generated zip file?"
                        a="You receive a fully structured monolithic or monorepo workspace. It includes all package.json files, fully configured dev scripts, Dockerfiles (if requested), and boilerplates for your selected frontend and backend nodes."
                    />
                    <FAQItem
                        q="Can I eject from WireStack?"
                        a="You don't need to eject! Unlike no-code builders, WireStack simply generates standard source code (React, Express, PostGres, etc.). Once you download the repository, you own the code 100% and can modify it however you like."
                    />
                    <FAQItem
                        q="Does it support TypeScript?"
                        a="Yes, TypeScript is supported out of the box. You can toggle between JavaScript and TypeScript for any generated node in your canvas settings."
                    />
                </div>
            </section>

            {/* Final Massive CTA */}
            <section className="w-full py-32 border-t-[4px] border-black bg-[#ffd800] text-center px-4">
                <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-12">Stop Configuring.</h2>
                <button className="px-12 py-6 bg-black text-white text-2xl md:text-4xl font-black uppercase border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] active:translate-x-[12px] active:translate-y-[12px] active:shadow-none transition-all flex items-center justify-center gap-4 mx-auto">
                    CREATE WORKSPACE <ArrowRight className="w-8 h-8 md:w-12 md:h-12 stroke-[4]" />
                </button>
            </section>

            {/* Footer */}
            <footer className="w-full border-t-[4px] border-black bg-white pt-16 pb-8 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 font-bold uppercase font-mono">
                    <div className="max-w-sm">
                        <h3 className="text-3xl font-black mb-4">WIRESTACK</h3>
                        <p className="border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#f4f4f0]">
                            Visual logic translated directly to production-ready scalable code. Action always.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                        <div>
                            <h4 className="text-xl font-black mb-4 underline decoration-4 underline-offset-4">PRODUCT</h4>
                            <ul className="space-y-4">
                                <li><a href="#" className="hover:bg-black hover:text-white px-2 -mx-2 transition-colors">Features</a></li>
                                <li><a href="#integrations" className="hover:bg-black hover:text-white px-2 -mx-2 transition-colors">Integrations</a></li>
                                <li><a href="#" className="hover:bg-black hover:text-white px-2 -mx-2 transition-colors">Changelog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xl font-black mb-4 underline decoration-4 underline-offset-4">LEGAL</h4>
                            <ul className="space-y-4">
                                <li><a href="#" className="hover:bg-black hover:text-white px-2 -mx-2 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:bg-black hover:text-white px-2 -mx-2 transition-colors">Terms</a></li>
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1 border-[4px] border-black bg-[#4ade80] p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <h4 className="text-xl font-black mb-2">SYSTEM STATUS</h4>
                            <span className="bg-black text-[#4ade80] px-3 py-1 text-lg font-black tracking-widest">[ ONLINE ]</span>
                        </div>
                    </div>
                </div>
                <div className="w-full border-t-[4px] border-black mt-16 pt-8 text-center font-bold font-mono uppercase">
                    © 2026 Wirestack Inc. V4.0.0.
                </div>
            </footer>
        </div>
    );
};

/* --- Internal Components --- */

const BrutalistCard = ({ children, className, color }) => (
    <div className={`border-[4px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${color} ${className}`}>
        {children}
    </div>
);

const StepCard = ({ num, title, desc, color }) => (
    <div className={`border-[4px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-10 relative ${color} flex flex-col items-center text-center hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all`}>
        <div className="w-16 h-16 border-[4px] border-black bg-white flex items-center justify-center font-black text-2xl mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -mt-12 rounded-full">
            {num}
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{title}</h3>
        <p className="font-bold font-mono uppercase opacity-90">{desc}</p>
    </div>
);

const DevFeatureCard = ({ title, text, color, rotation = "" }) => (
    <div className={`border-[4px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between ${color} transition-transform ${rotation} hover:rotate-0 hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
        <div>
            <div className="flex gap-2 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-4 h-4 rounded-full bg-black border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"></div>
                ))}
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">{title}</h3>
            <p className="font-bold font-mono text-lg leading-snug">{text}</p>
        </div>
    </div>
);

const IntegrationCard = ({ title, desc, features, color, isPro }) => (
    <div className={`border-[4px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative bg-white ${isPro ? '-mt-4 -mb-4 z-10 scale-105' : 'scale-100 z-0'} transition-transform`}>
        {isPro && (
            <div className="absolute top-0 right-0 border-l-[4px] border-b-[4px] border-black bg-black text-[#ffd800] px-4 py-2 font-black uppercase text-sm">
                COMING SOON
            </div>
        )}
        <div className={`border-[4px] border-black p-4 text-center mb-8 ${color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <h3 className="text-2xl font-black uppercase tracking-widest leading-none">{title}</h3>
        </div>

        <p className="font-bold font-mono text-lg mb-6 leading-tight">{desc}</p>

        <ul className="space-y-4 mb-12 flex-1">
            {features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 font-bold uppercase font-mono tracking-tight">
                    <CheckSquare className="w-6 h-6 stroke-[3] shrink-0 fill-[#4ade80]" />
                    <span>{feat}</span>
                </li>
            ))}
        </ul>
    </div>
);

const FAQItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6">
            <button
                onClick={() => setOpen(!open)}
                className={`w-full p-6 text-left flex justify-between items-center font-black text-2xl uppercase tracking-tight transition-colors ${open ? 'bg-[#ffd800] border-b-[4px] border-black' : 'hover:bg-gray-100'}`}
            >
                {q}
                {open ? <Minus className="w-8 h-8 stroke-[4]" /> : <Plus className="w-8 h-8 stroke-[4]" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="p-6 font-bold font-mono text-lg uppercase leading-relaxed bg-white">
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
