import React from 'react';
import {
    Server,
    Database,
    ShieldCheck,
    Layers,
    Code2,
    Cpu,
    Globe,
    Box,
    User as UserIcon,
    LogOut
} from 'lucide-react';

const nodeTypes = [
    {
        id: 'express',
        label: 'Express Server',
        icon: <Server className="w-6 h-6" />,
        color: 'bg-[#00F0FF]',
        description: 'Node.js backend framework'
    },
    {
        id: 'mongodb',
        label: 'MongoDB',
        icon: <Database className="w-6 h-6" />,
        color: 'bg-[#33FF66]',
        description: 'NoSQL Database'
    },
    {
        id: 'auth',
        label: 'Google Auth',
        icon: <ShieldCheck className="w-6 h-6" />,
        color: 'bg-[#FF3366]',
        description: 'Google OAuth integration'
    },
    {
        id: 'react',
        label: 'React Frontend',
        icon: <Globe className="w-6 h-6" />,
        color: 'bg-[#A020F0]',
        description: 'UI/UX interface'
    },
    {
        id: 'stripe',
        label: 'Stripe Pay',
        icon: <Box className="w-6 h-6" />,
        color: 'bg-[#FFA500]',
        description: 'Payment gateway integration'
    },
];

const Sidebar = ({ user }) => {
    const isNoCode = user?.user_type === 'non-developer';

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const UserSection = () => (
        <div className="p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-sm font-black uppercase tracking-tighter border-b-2 border-black pb-2 mb-4 flex items-center gap-2 text-[#FF3366]">
                <UserIcon className="w-4 h-4" /> ME
            </h2>

            {user ? (
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border-4 border-black bg-[#00F0FF] shrink-0 overflow-hidden">
                        {user.profile_picture ? (
                            <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-xl">
                                {user.first_name?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-xs uppercase truncate leading-none">
                            {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-500 truncate mt-1">{user.email}</p>
                    </div>
                    <button
                        onClick={() => {
                            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                            window.location.href = `${apiUrl}/api/auth/logout`;
                        }}
                        className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 border-2 border-dashed border-gray-400"></div>
                    <div className="h-4 bg-gray-200 w-24"></div>
                </div>
            )}
        </div>
    );

    return (
        <aside className="p-6 h-full flex flex-col overflow-y-auto">
            {/* Top Section for Developers */}
            {!isNoCode && (
                <div className="mb-8">
                    <UserSection />
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter border-b-4 border-black pb-2 flex items-center gap-2">
                    <Layers className="w-6 h-6" /> WORKSPACE
                </h2>
                <p className="text-sm font-bold mt-2 text-gray-700">Drag components to build.</p>
            </div>

            <div className="space-y-4">
                {nodeTypes.map((node) => (
                    <div
                        key={node.id}
                        className={`cursor-grab p-4 border-4 border-black ${node.color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all`}
                        onDragStart={(event) => onDragStart(event, node.id)}
                        draggable
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 border-2 border-black">
                                {node.icon}
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase">{node.label}</h3>
                                <p className="text-[10px] font-bold opacity-80">{node.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-8 flex flex-col gap-8">
                {/* Bottom Section for No-Code */}
                {isNoCode && <UserSection />}

                <div className="p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-1">
                        <Cpu className="w-4 h-4" /> System Status
                    </h4>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-green-600 uppercase">Ready to Deploy</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
