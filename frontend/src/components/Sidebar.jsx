import React, { useState, useEffect } from 'react';
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
    LogOut,
    Plus,
    FolderOpen,
    Clock,
    MessageSquare,
    Layout,
    FileCode2,
    PaintBucket,
    HardDrive,
    Network,
    Container
} from 'lucide-react';
import AIChatPanel from './AIChatPanel';

const nodeTypes = [
    // Frontend
    { id: 'nextjs', label: 'Next.js', icon: <Layout className="w-6 h-6" />, color: 'bg-[#ffffff]', textColor: 'text-black', description: 'React framework for production' },
    { id: 'react', label: 'React', icon: <Globe className="w-6 h-6" />, color: 'bg-[#00d8ff]', textColor: 'text-black', description: 'UI/UX interface library' },
    { id: 'vue', label: 'Vue.js', icon: <FileCode2 className="w-6 h-6" />, color: 'bg-[#42b883]', textColor: 'text-white', description: 'Progressive JS framework' },

    // Styling
    { id: 'tailwindcss', label: 'Tailwind CSS', icon: <PaintBucket className="w-6 h-6" />, color: 'bg-[#38bdf8]', textColor: 'text-white', description: 'Utility-first CSS framework' },

    // Backend
    { id: 'express', label: 'Express.js', icon: <Server className="w-6 h-6" />, color: 'bg-[#eeeeee]', textColor: 'text-black', description: 'Node.js backend framework' },
    { id: 'django', label: 'Django', icon: <Code2 className="w-6 h-6" />, color: 'bg-[#092e20]', textColor: 'text-white', description: 'Python web framework' },

    // Database
    { id: 'postgres', label: 'PostgreSQL', icon: <HardDrive className="w-6 h-6" />, color: 'bg-[#336791]', textColor: 'text-white', description: 'Relational database' },
    { id: 'mongodb', label: 'MongoDB', icon: <Database className="w-6 h-6" />, color: 'bg-[#47a248]', textColor: 'text-white', description: 'NoSQL document database' },
    { id: 'redis', label: 'Redis', icon: <Network className="w-6 h-6" />, color: 'bg-[#d82c20]', textColor: 'text-white', description: 'In-memory data store' },

    // Infrastructure / Tools
    { id: 'docker', label: 'Docker', icon: <Container className="w-6 h-6" />, color: 'bg-[#2496ed]', textColor: 'text-white', description: 'Containerization platform' },
    { id: 'auth', label: 'Google Auth', icon: <ShieldCheck className="w-6 h-6" />, color: 'bg-[#ea4335]', textColor: 'text-white', description: 'Google OAuth integration' },
];

const Sidebar = ({ user, workspaces = [], activeWorkspace, onCreateWorkspace, onSelectWorkspace, onSuggestComponents, compact = false }) => {
    const isNoCode = user?.user_type === 'non-developer';
    const [activeTab, setActiveTab] = useState('workspaces'); // 'workspaces' | 'chat'

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
                                {user.first_name?.[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm uppercase truncate">{user.first_name} {user.last_name}</p>
                        <p className="text-[10px] text-gray-600 font-bold truncate">{user.email}</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/api/auth/logout'}
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

    // ===== DEVELOPER SIDEBAR =====
    if (!isNoCode) {
        // Compact mode: just the tech tiles, no profile/header
        if (compact) {
            return (
                <aside className="h-full flex flex-col overflow-y-auto p-2">
                    <div className="space-y-2">
                        {nodeTypes.map((node) => (
                            <div
                                key={node.id}
                                className={`cursor-grab p-2 border-3 border-black ${node.color} ${node.textColor || 'text-black'} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all`}
                                onDragStart={(event) => onDragStart(event, node.id)}
                                draggable
                            >
                                <div className="flex items-center gap-2">
                                    <div className="bg-white p-1 border-2 border-black text-black shrink-0">
                                        {React.cloneElement(node.icon, { className: 'w-4 h-4' })}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-xs uppercase truncate">{node.label}</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            );
        }

        return (
            <aside className="p-6 h-full flex flex-col overflow-y-auto">
                <div className="mb-8">
                    <UserSection />
                </div>

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
                            className={`cursor-grab p-3 border-4 border-black ${node.color} ${node.textColor || 'text-black'} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all`}
                            onDragStart={(event) => onDragStart(event, node.id)}
                            draggable
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 border-2 border-black text-black">
                                    {node.icon}
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase">{node.label}</h3>
                                    <p className="text-[10px] font-bold opacity-90">{node.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-8 flex flex-col gap-8">
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
    }

    // ===== NON-DEVELOPER SIDEBAR =====
    return (
        <aside className="h-full flex flex-col overflow-hidden">
            {/* User Section */}
            <div className="p-4 shrink-0">
                <UserSection />
            </div>

            {/* Tab Buttons */}
            <div className="flex border-y-4 border-black shrink-0">
                <button
                    onClick={() => setActiveTab('workspaces')}
                    className={`flex-1 py-3 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-r-2 border-black ${activeTab === 'workspaces' ? 'bg-[#00F0FF] text-black' : 'bg-white hover:bg-gray-100'}`}
                >
                    <FolderOpen size={14} /> Workspaces
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-3 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-[#FFD700] text-black' : 'bg-white hover:bg-gray-100'}`}
                >
                    <MessageSquare size={14} /> AI Chat
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'workspaces' ? (
                    <div className="h-full overflow-y-auto p-4 space-y-4">
                        {/* New Workspace Button */}
                        <button
                            onClick={onCreateWorkspace}
                            className="w-full p-4 border-4 border-black bg-[#33FF66] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-3 font-black text-sm uppercase"
                        >
                            <Plus className="w-5 h-5" /> New Workspace
                        </button>

                        {/* Recent Workspaces */}
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
                                <Clock size={12} /> Recent
                            </h3>
                            {workspaces.length === 0 ? (
                                <p className="text-xs font-bold text-gray-400 text-center py-4 border-2 border-dashed border-gray-300">
                                    No workspaces yet. Create one!
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws._id || ws.name}
                                            onClick={() => onSelectWorkspace(ws)}
                                            className={`w-full p-3 border-3 border-black text-left transition-all ${activeWorkspace?._id === ws._id
                                                ? 'bg-[#FFD700] shadow-none translate-x-1 translate-y-1'
                                                : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
                                                }`}
                                        >
                                            <h4 className="font-black text-xs uppercase truncate">{ws.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-500 mt-1">
                                                {new Date(ws.updated_at).toLocaleDateString()}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <AIChatPanel onSuggestComponents={onSuggestComponents} />
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
