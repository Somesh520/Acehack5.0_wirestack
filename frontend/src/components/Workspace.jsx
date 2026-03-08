import { useState, useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    addEdge,
    Background,
    Controls,
    MiniMap,
    applyEdgeChanges,
    applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Sidebar from './Sidebar';
import AIChatPanel from './AIChatPanel';
import EditorPanel from './EditorPanel';
import NodeOptionsPanel from './NodeOptionsPanel';
import { workflowNodeTypes } from './WorkflowNode';
import DeveloperNode from './DeveloperNode';
import { PIPELINE_NODES, PIPELINE_EDGES, PIPELINE_STEPS } from './pipelineConfig';
import { Save, ChevronLeft, ChevronRight, Settings, Code2, Box, Sparkles, Loader2, Play } from 'lucide-react';

const initialNodes = [];
const initialEdges = [];

const Workspace = () => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [generatedFiles, setGeneratedFiles] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Lifted chat state
    const [chatHistory, setChatHistory] = useState([
        {
            role: 'assistant',
            content: "Hey! 👋 I'm **WireStack AI**! Tell me what app you want to build and I'll help you pick the perfect tech stack! 🚀\n\nFor example: *\"I want to build an e-commerce website\"*"
        }
    ]);

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

    // Fetch workspaces
    useEffect(() => {
        if (user) {
            fetch('/api/workspace', { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setWorkspaces(data);
                })
                .catch(err => console.error('Error fetching workspaces:', err));
        }
    }, [user]);

    const handleCreateWorkspace = async () => {
        try {
            const name = `Project-${workspaces.length + 1}`;
            const res = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
                credentials: 'include'
            });
            const ws = await res.json();
            setWorkspaces(prev => [ws, ...prev]);
            setActiveWorkspace(ws);
            setNodes([]);
            setEdges([]);
        } catch (err) {
            console.error('Error creating workspace:', err);
        }
    };

    const handleSelectWorkspace = (ws) => {
        setActiveWorkspace(ws);
        setNodes(ws.nodes || []);
        setEdges(ws.edges || []);
    };

    const handleSuggestComponents = () => {
        // Kick off gamified pipeline
        setNodes(PIPELINE_NODES);
        setEdges(PIPELINE_EDGES);
    };

    const handleSelectOption = (stepId, selectedOptionId) => {
        setNodes(nds => {
            const newNodes = [...nds];
            const currentIndex = newNodes.findIndex(n => n.data.stepId === stepId);

            if (currentIndex !== -1) {
                // Mark current as completed
                newNodes[currentIndex] = {
                    ...newNodes[currentIndex],
                    data: {
                        ...newNodes[currentIndex].data,
                        status: 'completed',
                        selectedOption: selectedOptionId
                    }
                };

                // Unlock next node
                if (currentIndex + 1 < newNodes.length) {
                    newNodes[currentIndex + 1] = {
                        ...newNodes[currentIndex + 1],
                        data: {
                            ...newNodes[currentIndex + 1].data,
                            status: 'active'
                        }
                    };
                }
            }
            return newNodes;
        });
        setSelectedNode(null);
    };

    const [generationStatus, setGenerationStatus] = useState(null);

    const handleGenerateProject = async () => {
        setIsGenerating(true);
        setGeneratedFiles(null);
        setGenerationStatus('🧠 Planning your project architecture...');

        const stackDescription = nodes.map(n => {
            const stepOpt = PIPELINE_STEPS.find(s => s.id === n.data.stepId)?.options.find(o => o.id === n.data.selectedOption);
            return `${n.data.title}: ${stepOpt?.name || 'None'}`;
        }).join(', ');

        const userIdea = chatHistory.find(msg => msg.role === 'user')?.content || 'a full-stack web application';

        try {
            // ═══════════════════════════════════════════
            // STEP 1: Get the file plan from AI
            // ═══════════════════════════════════════════
            const planRes = await fetch('/api/ai/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: userIdea, stack: stackDescription }),
                credentials: 'include'
            });

            if (!planRes.ok) {
                const err = await planRes.json();
                throw new Error(err.details || err.error || 'Plan generation failed');
            }

            const { plan } = await planRes.json();

            if (!Array.isArray(plan) || plan.length === 0) {
                throw new Error('AI returned an empty file plan');
            }

            setGenerationStatus(`📋 Plan ready! Generating ${plan.length} files...`);

            // Initialize the file tree structure
            const projectTree = {
                name: 'wirestack-generated-project',
                children: []
            };
            setGeneratedFiles({ ...projectTree });

            // ═══════════════════════════════════════════
            // STEP 2: Generate each file one-by-one
            // ═══════════════════════════════════════════
            const generatedSoFar = [];

            for (let i = 0; i < plan.length; i++) {
                const file = plan[i];
                setGenerationStatus(`⚡ Generating ${file.name} (${i + 1}/${plan.length})...`);

                const fileRes = await fetch('/api/ai/generate-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idea: userIdea,
                        stack: stackDescription,
                        fileName: file.name,
                        filePurpose: file.purpose,
                        existingFiles: generatedSoFar
                    }),
                    credentials: 'include'
                });

                if (!fileRes.ok) {
                    const err = await fileRes.json();
                    console.error(`Failed to generate ${file.name}:`, err);
                    // Add a placeholder so the pipeline doesn't break
                    generatedSoFar.push({ name: file.name, content: `// Error generating this file: ${err.details || err.error}` });
                } else {
                    const fileData = await fileRes.json();
                    generatedSoFar.push(fileData);
                }

                // Live update the editor panel!
                setGeneratedFiles({
                    name: 'wirestack-generated-project',
                    children: [...generatedSoFar]
                });
            }

            setGenerationStatus(`✅ Done! ${generatedSoFar.length} files generated successfully.`);

            // Notify chat
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: `🚀 Your project has been generated with ${generatedSoFar.length} files! Check the Editor panel to browse the code and preview your app.`
            }]);

        } catch (err) {
            console.error('Code gen error:', err);
            setGenerationStatus(`❌ Error: ${err.message}`);
            alert('Failed to generate code: ' + err.message);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setGenerationStatus(null), 5000);
        }
    };

    const handleGenerateBoilerplate = async () => {
        if (nodes.length === 0) {
            alert('Please drag at least one technology onto the canvas first!');
            return;
        }

        setIsGenerating(true);
        setGeneratedFiles(null);
        setGenerationStatus('🧠 Planning boilerplate architecture...');

        // Extract labels from all dropped nodes
        const stackItems = nodes.map(n => n.type || n.data?.label || 'Unknown Node');

        // Remove the default "-{number}" we append in onDrop, to get pure names
        const cleanStackItems = stackItems.map(item => item.split('-')[0].trim());
        const uniqueStack = [...new Set(cleanStackItems)].join(', ');

        const boilerplateIdea = 'Production-ready Boilerplate setup with basic routing, configuration, and database connection.';

        try {
            // STEP 1: Plan
            const planRes = await fetch('/api/ai/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: boilerplateIdea, stack: uniqueStack }),
                credentials: 'include'
            });

            if (!planRes.ok) throw new Error('Plan generation failed');
            const { plan } = await planRes.json();

            setGenerationStatus(`📋 Boilerplate Plan ready! Generating ${plan.length} initial files...`);

            const projectTree = { name: 'developer-boilerplate', children: [] };
            setGeneratedFiles({ ...projectTree });

            // STEP 2: Generate
            const generatedSoFar = [];
            for (let i = 0; i < plan.length; i++) {
                const file = plan[i];
                setGenerationStatus(`⚡ Generating ${file.name} (${i + 1}/${plan.length})...`);

                const fileRes = await fetch('/api/ai/generate-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idea: boilerplateIdea,
                        stack: uniqueStack,
                        fileName: file.name,
                        filePurpose: file.purpose,
                        existingFiles: generatedSoFar
                    }),
                    credentials: 'include'
                });

                if (fileRes.ok) {
                    const fileData = await fileRes.json();
                    generatedSoFar.push(fileData);
                } else {
                    generatedSoFar.push({ name: file.name, content: `// Error generating file` });
                }

                setGeneratedFiles({
                    name: 'developer-boilerplate',
                    children: [...generatedSoFar]
                });
            }

            setGenerationStatus(`✅ Boilerplate ready! Download the ZIP to start coding.`);

        } catch (err) {
            console.error('Boilerplate gen error:', err);
            setGenerationStatus(`❌ Error: ${err.message}`);
            alert('Failed to generate boilerplate: ' + err.message);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setGenerationStatus(null), 5000);
        }
    };

    const allCompleted = nodes.length > 0 && nodes.every(n => n.data.status === 'completed');

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

            // For developer flow, type is something like 'nextjs', 'react', etc.
            // We append the unqiue ID logic to 'id', but keep type as-is so ReactFlow maps it to developerNodeTypes
            const newNode = {
                id: `${type}-${nodes.length + 1}`,
                type: type,
                position,
                data: { label: type.toUpperCase() },
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

    const isNoCode = user?.user_type === 'non-developer';

    // ===== NON-DEVELOPER: 3-Panel Layout =====
    if (isNoCode) {
        return (
            <div className="flex h-screen w-full bg-white font-mono overflow-hidden">
                {/* Left Panel: AI Chat */}
                <div className="w-[320px] shrink-0 border-r-4 border-black bg-[#FFD700] flex flex-col overflow-hidden">
                    {/* Mini navbar */}
                    <div className="px-4 py-3 border-b-4 border-black bg-black text-white flex items-center gap-2 shrink-0">
                        <div className="bg-[#FF3366] text-white font-black text-xs px-2 py-0.5">WS</div>
                        <span className="text-xs font-bold truncate flex-1">{activeWorkspace?.name || 'New Project'}</span>
                        <span className="text-[9px] bg-[#33FF66] text-black px-2 py-0.5 font-black">NO-CODE</span>
                    </div>
                    {/* User Info */}
                    <div className="px-4 py-3 border-b-2 border-black bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border-3 border-black bg-[#00F0FF] flex items-center justify-center font-black text-sm overflow-hidden shrink-0">
                                {user.profile_picture ? (
                                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : user.first_name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-black uppercase truncate leading-none">
                                    {user.first_name} {user.last_name}
                                </h3>
                                <p className="text-[9px] font-bold text-gray-400 truncate mt-0.5">{user.email}</p>
                            </div>
                            <button
                                onClick={() => window.location.href = '/api/auth/logout'}
                                className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors"
                            >
                                <ChevronLeft size={12} />
                            </button>
                        </div>
                        {/* Workspace Count */}
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                            <span className="bg-[#FFD700] text-black px-2 py-0.5 border border-black">{workspaces.length}</span>
                            <span>Workspace{workspaces.length !== 1 ? 's' : ''}</span>
                            <span className="ml-auto text-[9px] text-gray-400">●  Active</span>
                        </div>
                    </div>
                    {/* AI Chat */}
                    <div className="flex-1 overflow-hidden">
                        <AIChatPanel
                            onSuggestComponents={handleSuggestComponents}
                            messages={chatHistory}
                            setMessages={setChatHistory}
                        />
                    </div>
                </div>

                {/* Center Panel: Canvas */}
                <div className="flex-1 flex flex-col relative" ref={reactFlowWrapper}>
                    {/* Top Navbar */}
                    <header className="h-14 border-b-4 border-black bg-white flex items-center justify-between px-4 z-10 shrink-0">
                        <h1 className="font-black text-lg uppercase tracking-tighter">Workflow / <span className="text-[#FF3366]">{activeWorkspace?.name || 'MyProject'}</span></h1>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCreateWorkspace}
                                className="flex items-center gap-1 px-3 py-1.5 border-3 border-black bg-[#33FF66] font-black text-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                + NEW
                            </button>
                            {allCompleted && (
                                <button
                                    onClick={handleGenerateProject}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-6 py-1.5 border-3 border-black bg-[#FFD700] font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-75 animate-bounce"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Generate Final Code
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Canvas */}
                    <div className="flex-1 relative">
                        {nodes.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50 z-10">
                                <Sparkles size={64} className="mb-4" />
                                <h2 className="text-2xl font-black uppercase">Start a Mission</h2>
                                <p className="font-bold text-gray-500">Ask the AI Agent on the left to build an app!</p>
                            </div>
                        ) : null}

                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={(_, node) => setSelectedNode(node)}
                            nodeTypes={{ gamifiedNode: GamifiedNode }}
                            fitView
                        >
                            <Background color="#000" variant="dots" gap={20} size={1} />
                            <Controls className="!bg-white !border-4 !border-black !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                        </ReactFlow>

                        {/* Node Tool Modal */}
                        {selectedNode && (
                            <NodeOptionsPanel
                                node={selectedNode}
                                onClose={() => setSelectedNode(null)}
                                onSelectOption={handleSelectOption}
                            />
                        )}

                        {/* Loading Overlay for Generation */}
                        {isGenerating && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="bg-white border-4 border-black p-8 flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
                                    <Loader2 className="w-16 h-16 animate-spin text-[#FFD700] mb-4" />
                                    <h2 className="font-black text-2xl uppercase tracking-widest text-[#FF3366]">Agent Coding...</h2>
                                    {generationStatus && (
                                        <p className="font-bold text-sm text-gray-700 mt-3 text-center bg-gray-100 border-2 border-black px-4 py-2">
                                            {generationStatus}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Code Editor */}
                <div className="w-[350px] shrink-0">
                    <EditorPanel files={generatedFiles} generationStatus={generationStatus} />
                </div>
            </div>
        );
    }

    // ===== DEVELOPER: Original Layout =====

    const developerNodeTypes = {
        nextjs: DeveloperNode,
        react: DeveloperNode,
        vue: DeveloperNode,
        tailwindcss: DeveloperNode,
        express: DeveloperNode,
        django: DeveloperNode,
        postgres: DeveloperNode,
        mongodb: DeveloperNode,
        redis: DeveloperNode,
        docker: DeveloperNode,
        auth: DeveloperNode,
        default: DeveloperNode,
    };

    return (
        <div className="flex h-screen w-full bg-white font-mono overflow-hidden">
            {/* Sidebar */}
            <div
                className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 border-r-4 border-black bg-[#FFD700] relative overflow-hidden flex flex-col shrink-0 z-20`}
            >
                <Sidebar
                    user={user}
                    workspaces={workspaces}
                    activeWorkspace={activeWorkspace}
                    onCreateWorkspace={handleCreateWorkspace}
                    onSelectWorkspace={handleSelectWorkspace}
                    onSuggestComponents={handleSuggestComponents}
                />
            </div>

            {/* Toggle Sidebar Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`absolute top-1/2 -translate-y-1/2 z-50 bg-white border-4 border-black p-1 hover:bg-black hover:text-white transition-all duration-300`}
                style={{ left: isSidebarOpen ? '318px' : '0px' }}
            >
                {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
            </button>

            {/* Main Workspace Area */}
            <div className="flex-1 flex flex-col relative" ref={reactFlowWrapper}>
                {/* Top Navbar */}
                <header className="h-16 border-b-4 border-black bg-white flex items-center justify-between px-6 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-black text-white p-1 font-black text-xl px-3 border-2 border-black">WS</div>
                        <h1 className="font-black text-xl uppercase tracking-tighter">Workspace / <span className="text-[#FF3366]">{activeWorkspace?.name || 'MyProject-1'}</span></h1>
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
                        <button
                            onClick={handleGenerateBoilerplate}
                            disabled={isGenerating || nodes.length === 0}
                            className="flex items-center gap-2 px-6 py-2 border-4 border-black bg-[#33FF66] font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play size={20} />}
                            GENERATE BOILERPLATE
                        </button>
                        <button className="p-2 border-4 border-black bg-white hover:bg-gray-100">
                            <Settings size={24} />
                        </button>
                    </div>
                </header>

                {/* Canvas */}
                <div className="flex-1 relative flex">
                    <div className="flex-1 relative">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            nodeTypes={developerNodeTypes}
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

                        {/* Loading Overlay for Generation */}
                        {isGenerating && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="bg-white border-4 border-black p-8 flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
                                    <Loader2 className="w-16 h-16 animate-spin text-[#FFD700] mb-4" />
                                    <h2 className="font-black text-2xl uppercase tracking-widest text-[#FF3366]">Scaffolding Code...</h2>
                                    {generationStatus && (
                                        <p className="font-bold text-sm text-gray-700 mt-3 text-center bg-gray-100 border-2 border-black px-4 py-2">
                                            {generationStatus}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Developer Editor Overlay/Split Panel */}
                    {(generatedFiles || isGenerating) && (
                        <div className="w-[400px] shrink-0 border-l-4 border-black bg-[#1a1a2e] relative z-40 flex flex-col">
                            <EditorPanel files={generatedFiles} generationStatus={generationStatus} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Workspace;
