import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Server,
    Database,
    ShieldCheck,
    Code2,
    Globe,
    Layout,
    FileCode2,
    PaintBucket,
    HardDrive,
    Network,
    Container,
    Box,
    Zap,
    FileJson,
    Flame,
    CreditCard,
    Lock,
    Radio,
    Cloud,
    Workflow,
    Triangle,
    Braces,
    Cpu
} from 'lucide-react';

const iconMap = {
    nextjs: <Layout className="w-6 h-6" />,
    react: <Globe className="w-6 h-6" />,
    vue: <FileCode2 className="w-6 h-6" />,
    angular: <Triangle className="w-6 h-6" />,
    tailwindcss: <PaintBucket className="w-6 h-6" />,
    typescript: <Braces className="w-6 h-6" />,
    express: <Server className="w-6 h-6" />,
    django: <Code2 className="w-6 h-6" />,
    flask: <Flame className="w-6 h-6" />,
    fastapi: <Zap className="w-6 h-6" />,
    springboot: <Cpu className="w-6 h-6" />,
    postgres: <HardDrive className="w-6 h-6" />,
    mongodb: <Database className="w-6 h-6" />,
    mysql: <Database className="w-6 h-6" />,
    redis: <Network className="w-6 h-6" />,
    firebase: <Flame className="w-6 h-6" />,
    supabase: <Cloud className="w-6 h-6" />,
    graphql: <Workflow className="w-6 h-6" />,
    prisma: <FileJson className="w-6 h-6" />,
    stripe: <CreditCard className="w-6 h-6" />,
    jwt: <Lock className="w-6 h-6" />,
    auth: <ShieldCheck className="w-6 h-6" />,
    docker: <Container className="w-6 h-6" />,
    nginx: <Server className="w-6 h-6" />,
    socketio: <Radio className="w-6 h-6" />,
    default: <Box className="w-6 h-6" />
};

const colorMap = {
    nextjs: { bg: 'bg-[#ffffff]', text: 'text-black' },
    react: { bg: 'bg-[#00d8ff]', text: 'text-black' },
    vue: { bg: 'bg-[#42b883]', text: 'text-white' },
    angular: { bg: 'bg-[#dd0031]', text: 'text-white' },
    tailwindcss: { bg: 'bg-[#38bdf8]', text: 'text-white' },
    typescript: { bg: 'bg-[#3178c6]', text: 'text-white' },
    express: { bg: 'bg-[#eeeeee]', text: 'text-black' },
    django: { bg: 'bg-[#092e20]', text: 'text-white' },
    flask: { bg: 'bg-[#000000]', text: 'text-white' },
    fastapi: { bg: 'bg-[#009688]', text: 'text-white' },
    springboot: { bg: 'bg-[#6db33f]', text: 'text-white' },
    postgres: { bg: 'bg-[#336791]', text: 'text-white' },
    mongodb: { bg: 'bg-[#47a248]', text: 'text-white' },
    mysql: { bg: 'bg-[#00758f]', text: 'text-white' },
    redis: { bg: 'bg-[#d82c20]', text: 'text-white' },
    firebase: { bg: 'bg-[#ffca28]', text: 'text-black' },
    supabase: { bg: 'bg-[#3ecf8e]', text: 'text-white' },
    graphql: { bg: 'bg-[#e535ab]', text: 'text-white' },
    prisma: { bg: 'bg-[#2d3748]', text: 'text-white' },
    stripe: { bg: 'bg-[#635bff]', text: 'text-white' },
    jwt: { bg: 'bg-[#000000]', text: 'text-[#d63aff]' },
    auth: { bg: 'bg-[#ea4335]', text: 'text-white' },
    docker: { bg: 'bg-[#2496ed]', text: 'text-white' },
    nginx: { bg: 'bg-[#009639]', text: 'text-white' },
    socketio: { bg: 'bg-[#010101]', text: 'text-white' },
    default: { bg: 'bg-[#cccccc]', text: 'text-black' }
};

const DeveloperNode = ({ data, type }) => {
    // Extract the base type (e.g., 'react' from 'react-1')
    const baseType = type ? type.split('-')[0].trim() : 'default';

    // Safely get icon and color, fallback to default
    const icon = iconMap[baseType] || iconMap.default;
    const colors = colorMap[baseType] || colorMap.default;

    const label = data?.label || baseType.toUpperCase();

    return (
        <div className={`px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-4 border-black ${colors.bg} ${colors.text} flex items-center gap-3 min-w-[150px]`}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 border-2 border-black bg-white"
            />

            <div className="bg-white p-1.5 border-2 border-black text-black">
                {icon}
            </div>
            <div className="font-black text-sm uppercase tracking-tight">
                {label}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 border-2 border-black bg-white"
            />
        </div>
    );
};

export default DeveloperNode;
