import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    addEdge,
    Background,
    Controls,
    MiniMap,
    applyEdgeChanges,
    applyNodeChanges,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Sidebar from './Sidebar';
import { Layout, Play, Save, ChevronLeft, ChevronRight, Settings, User as UserIcon, Code2, Box } from 'lucide-react';

const initialNodes = [];
const initialEdges = [];

const Workspace = () => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    setUser(data.user);
                }
            })
            .catch(err => console.error('Error fetching user:', err));
    }, []);

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        []
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = { x: event.clientX - 300, y: event.clientY - 50 };
            const newNode = {
                id: `${type}-${nodes.length + 1}`,
                type,
                position,
                data: { label: `${type} node` },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [nodes]
    );

    const handleUserTypeSelection = async (type) => {
        try {
            const response = await fetch('/api/auth/update-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userType: type }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.user) {
                setUser(data.user);
            }
        } catch (err) {
            console.error('Error updating user type:', err);
        }
    };

    if (!user) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#FF3366] flex flex-col items-center justify-center p-6 font-mono border-[12px] border-black">
                <div className="max-w-2xl w-full text-center bg-white border-8 border-black p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-6xl font-black uppercase mb-8">STOP!</h1>
                    <p className="text-2xl font-bold mb-8 uppercase">YOU NEED TO LOGIN TO ACCESS THE WORKSPACE</p>
                    <a href="/" className="inline-block bg-[#ffd800] border-4 border-black px-8 py-4 text-2xl font-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                        BACK TO LANDING PAGE
                    </a>
                </div>
            </div>
        );
    }

    if (user && !user.user_type) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#FFD700] flex flex-col items-center justify-center p-6 font-mono border-[12px] border-black">
                <div className="max-w-4xl w-full text-center">
                    <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 drop-shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                        WELCOME TO <span className="text-[#FF3366]">WIRESTACK</span>
                    </h1>
                    <p className="text-2xl font-bold border-4 border-black bg-white inline-block px-8 py-3 mb-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        TELL US WHO YOU ARE TO CUSTOMIZE YOUR EXPERIENCE
                    </p>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Developer Option */}
                        <button
                            onClick={() => handleUserTypeSelection('developer')}
                            className="bg-[#00F0FF] border-8 border-black p-8 text-left transition-all hover:-translate-y-2 hover:translate-x-2 hover:shadow-[-12px_12px_0px_0px_rgba(0,0,0,1)] shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] group"
                        >
                            <div className="bg-white border-4 border-black p-4 w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                                <Code2 size={40} />
                            </div>
                            <h2 className="text-4xl font-black uppercase mb-4">DEVELOPER</h2>
                            <p className="font-bold text-lg leading-tight">
                                I code. I want full control over schemas, routes, and custom logic.
                            </p>
                        </button>

                        {/* Non-Developer Option */}
                        <button
                            onClick={() => handleUserTypeSelection('non-developer')}
                            className="bg-[#33FF66] border-8 border-black p-8 text-left transition-all hover:-translate-y-2 hover:translate-x-2 hover:shadow-[-12px_12px_0px_0px_rgba(0,0,0,1)] shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] group"
                        >
                            <div className="bg-white border-4 border-black p-4 w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                                <Box size={40} />
                            </div>
                            <h2 className="text-4xl font-black uppercase mb-4">NO-CODE</h2>
                            <p className="font-bold text-lg leading-tight">
                                I build. Just give me the tools to deploy without touching the terminal.
                            </p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-white font-mono overflow-hidden">
            {/* Sidebar */}
            <div
                className={`${isSidebarOpen ? 'w-80' : 'w-0'
                    } transition-all duration-300 border-r-4 border-black bg-[#FFD700] relative overflow-hidden flex flex-col`}
            >
                <Sidebar user={user} />
            </div>

            {/* Toggle Sidebar Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute left-[314px] top-1/2 -translate-y-1/2 z-50 bg-white border-4 border-black p-1 hover:bg-black hover:text-white transition-colors"
                style={{ left: isSidebarOpen ? '316px' : '0px' }}
            >
                {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
            </button>

            {/* Main Workspace Area */}
            <div className="flex-1 flex flex-col relative" ref={reactFlowWrapper}>
                {/* Top Navbar */}
                <header className="h-16 border-b-4 border-black bg-white flex items-center justify-between px-6 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-black text-white p-1 font-black text-xl px-3 border-2 border-black">WS</div>
                        <h1 className="font-black text-xl uppercase tracking-tighter">Workspace / <span className="text-[#FF3366]">MyProject-1</span></h1>
                        {user && (
                            <span className="ml-4 font-bold text-sm bg-black text-white px-2 py-1">
                                HELLO, {user.first_name?.toUpperCase()}!
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-black uppercase text-gray-500 mr-4">
                        Role: <span className="text-black bg-gray-200 px-2 border-2 border-black ml-1">{user?.user_type}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 border-4 border-black bg-[#00F0FF] font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <Save size={20} /> SAVE
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2 border-4 border-black bg-[#33FF66] font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <Play size={20} /> DEPLOY
                        </button>
                        <button className="p-2 border-4 border-black bg-white hover:bg-gray-100">
                            <Settings size={24} />
                        </button>
                    </div>
                </header>

                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        fitView
                    >
                        <Background color="#000" variant="dots" gap={20} size={1} />
                        <Controls className="!bg-white !border-4 !border-black !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                        <MiniMap
                            className="!bg-white !border-4 !border-black !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            nodeColor={() => '#FF3366'}
                            maskColor="rgba(0, 0, 0, 0.1)"
                        />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
};

export default Workspace;
