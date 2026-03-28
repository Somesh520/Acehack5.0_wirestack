import { 
  Globe, Server, Layers, Terminal, Layout, Cpu, ShieldCheck, Database, 
  Code, LayoutTemplate, Coffee, TerminalSquare, FastForward, Gem, 
  FileCode2, Smartphone, Apple, Cloud, Package, Network, Brain 
} from 'lucide-react';

export const STACKS = [
    // --- FRONTEND ---
    { id: 'react', title: 'REACT', desc: 'Build dynamic UIs with components, hooks, and state', icon: <Globe />, color: 'bg-[#58C4DC]' },
    { id: 'vue', title: 'VUE.JS', desc: 'Progressive framework with reactivity and composition', icon: <Layout />, color: 'bg-[#42B883]' },
    { id: 'angular', title: 'ANGULAR', desc: 'TypeScript-first framework with dependency injection', icon: <ShieldCheck />, color: 'bg-[#DD0031]' },
    { id: 'svelte', title: 'SVELTE', desc: 'Cybernetically enhanced web apps with no virtual DOM', icon: <Code />, color: 'bg-[#FF3E00]' },
    { id: 'next', title: 'NEXT.JS', desc: 'React framework with SSR, routing, and API routes', icon: <Cpu />, color: 'bg-black text-white' },
    { id: 'htmlcss', title: 'HTML & CSS', desc: 'The foundational building blocks of the web', icon: <LayoutTemplate />, color: 'bg-[#E34F26]' },

    // --- BACKEND ---
    { id: 'node', title: 'NODE.JS', desc: 'Server-side JavaScript with Express, APIs, and async', icon: <Server />, color: 'bg-[#339933]' },
    { id: 'express', title: 'EXPRESS', desc: 'Minimalist Node.js web framework for APIs', icon: <Database />, color: 'bg-[#3EFFB2]' },
    { id: 'python', title: 'PYTHON', desc: 'Backend logic, APIs, ML, and scripting fundamentals', icon: <Terminal />, color: 'bg-[#3776AB]' },
    { id: 'java', title: 'JAVA / SPRING', desc: 'Enterprise-grade backend systems and APIs', icon: <Coffee />, color: 'bg-[#5382A1]' },
    { id: 'csharp', title: 'C# / .NET', desc: 'Microsoft ecosystem for robust web and desktop apps', icon: <TerminalSquare />, color: 'bg-[#512BD4]' },
    { id: 'go', title: 'GO (GOLANG)', desc: 'High-performance concurrent backend services', icon: <FastForward />, color: 'bg-[#00ADD8]' },
    { id: 'ruby', title: 'RUBY ON RAILS', desc: 'Convention over configuration web framework', icon: <Gem />, color: 'bg-[#CC342D]' },
    { id: 'cpp', title: 'C++', desc: 'High-performance systems, game engines, and core logic', icon: <FileCode2 />, color: 'bg-[#00599C]' },

    // --- FULL STACK ---
    { id: 'mern', title: 'MERN STACK', desc: 'MongoDB + Express + React + Node — full-stack', icon: <Layers />, color: 'bg-[#FF3EA5]' },
    { id: 'mean', title: 'MEAN STACK', desc: 'MongoDB + Express + Angular + Node', icon: <Layers />, color: 'bg-[#4285F4]' },
    { id: 'jamstack', title: 'JAMSTACK', desc: 'JavaScript, APIs, and Markup for fast web delivery', icon: <Layers />, color: 'bg-[#F0047F]' },

    // --- MOBILE DEVELOPMENT ---
    { id: 'reactnative', title: 'REACT NATIVE', desc: 'Cross-platform mobile apps using React', icon: <Smartphone />, color: 'bg-[#61DAFB]' },
    { id: 'flutter', title: 'FLUTTER', desc: 'UI toolkit for natively compiled multi-platform apps', icon: <Smartphone />, color: 'bg-[#02569B]' },
    { id: 'swift', title: 'SWIFT / iOS', desc: 'Native iOS, macOS, and Apple ecosystem development', icon: <Apple />, color: 'bg-[#F05138]' },
    { id: 'android', title: 'KOTLIN / ANDROID', desc: 'Native Android application development', icon: <Smartphone />, color: 'bg-[#7F52FF]' },

    // --- DATABASES ---
    { id: 'mongodb', title: 'MONGODB', desc: 'NoSQL document database for flexible schemas', icon: <Database />, color: 'bg-[#47A248]' },
    { id: 'postgres', title: 'POSTGRESQL', desc: 'Advanced open-source relational database', icon: <Database />, color: 'bg-[#336791]' },
    { id: 'mysql', title: 'MYSQL', desc: 'Popular open-source relational database management', icon: <Database />, color: 'bg-[#4479A1]' },
    { id: 'redis', title: 'REDIS', desc: 'In-memory data structure store and caching', icon: <Database />, color: 'bg-[#DC382D]' },

    // --- DEVOPS & CLOUD ---
    { id: 'aws', title: 'AWS', desc: 'Amazon Web Services cloud computing and hosting', icon: <Cloud />, color: 'bg-[#FF9900]' },
    { id: 'docker', title: 'DOCKER', desc: 'Containerization for consistent environment deployment', icon: <Package />, color: 'bg-[#2496ED]' },
    { id: 'kubernetes', title: 'KUBERNETES', desc: 'Container orchestration and scaling', icon: <Network />, color: 'bg-[#326CE5]' },

    // --- AI & MACHINE LEARNING ---
    { id: 'ai-ml', title: 'AI / ML', desc: 'TensorFlow, PyTorch, and data science integration', icon: <Brain />, color: 'bg-[#FF6F00]' },
];
