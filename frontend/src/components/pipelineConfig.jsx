import React from 'react';
import { Globe, Server, Database, ShieldCheck, CreditCard } from 'lucide-react';

export const PIPELINE_STEPS = [
    {
        id: 'frontend',
        title: 'Frontend',
        subtitle: 'Choose UI Framework',
        icon: <Globe size={24} />,
        color: '#A020F0',
        options: [
            { id: 'react', name: 'React', logo: '⚛️', desc: 'Most popular UI library' },
            { id: 'vue', name: 'Vue.js', logo: '💚', desc: 'Progressive & easy' },
            { id: 'svelte', name: 'Svelte', logo: '🧡', desc: 'Compile-time, super fast' },
            { id: 'nextjs', name: 'Next.js', logo: '▲', desc: 'Full-stack React' },
        ]
    },
    {
        id: 'backend',
        title: 'Backend',
        subtitle: 'Choose Server Base',
        icon: <Server size={24} />,
        color: '#00F0FF',
        options: [
            { id: 'express', name: 'Express.js', logo: '⚡', desc: 'Minimalist Node.js' },
            { id: 'fastify', name: 'Fastify', logo: '🚀', desc: 'High-performance' },
            { id: 'nestjs', name: 'NestJS', logo: '🐱', desc: 'Enterprise TypeScript' },
            { id: 'django', name: 'Django', logo: '🐍', desc: 'Python full-stack' },
        ]
    },
    {
        id: 'database',
        title: 'Database',
        subtitle: 'Choose Storage',
        icon: <Database size={24} />,
        color: '#33FF66',
        options: [
            { id: 'mongodb', name: 'MongoDB', logo: '🍃', desc: 'Flexible NoSQL' },
            { id: 'postgres', name: 'PostgreSQL', logo: '🐘', desc: 'Powerful SQL' },
            { id: 'mysql', name: 'MySQL', logo: '🐬', desc: 'Popular SQL' },
            { id: 'firebase', name: 'Firebase', logo: '🔥', desc: 'Real-time cloud DB' },
        ]
    },
    {
        id: 'auth',
        title: 'Authentication',
        subtitle: 'Choose Identity',
        icon: <ShieldCheck size={24} />,
        color: '#FF3366',
        options: [
            { id: 'google', name: 'Google OAuth', logo: '🔐', desc: 'Sign in with Google' },
            { id: 'jwt', name: 'JWT Auth', logo: '🎟️', desc: 'Token-based login' },
            { id: 'auth0', name: 'Auth0', logo: '🛡️', desc: 'Universal platform' },
            { id: 'none', name: 'Skip Auth', logo: '⏭️', desc: 'Not needed' },
        ]
    },
    {
        id: 'payments',
        title: 'Payments',
        subtitle: 'Choose Gateway',
        icon: <CreditCard size={24} />,
        color: '#FFA500',
        options: [
            { id: 'stripe', name: 'Stripe', logo: '💳', desc: 'Global payments' },
            { id: 'razorpay', name: 'Razorpay', logo: '💰', desc: 'India-focused' },
            { id: 'paypal', name: 'PayPal', logo: '🅿️', desc: 'Worldwide platform' },
            { id: 'none', name: 'Skip Payments', logo: '⏭️', desc: 'Not needed' },
        ]
    },
];

export const PIPELINE_NODES = PIPELINE_STEPS.map((step, i) => ({
    id: `step-${step.id}`,
    type: 'gamifiedNode',
    position: { x: 50 + i * 220, y: 250 },
    data: {
        stepId: step.id,
        title: step.title,
        status: i === 0 ? 'active' : 'locked', // first is active
        selectedOption: null
    },
}));

export const PIPELINE_EDGES = PIPELINE_STEPS.slice(0, -1).map((step, i) => ({
    id: `e-${step.id}-${PIPELINE_STEPS[i + 1].id}`,
    source: `step-${step.id}`,
    target: `step-${PIPELINE_STEPS[i + 1].id}`,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#000', strokeWidth: 3, strokeDasharray: '5,5' },
}));
