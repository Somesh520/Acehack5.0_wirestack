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
import AnalysisModal from './AnalysisModal';
import { workflowNodeTypes } from './WorkflowNode';
import DeveloperNode from './DeveloperNode';
import GamifiedNode from './GamifiedNode';
import { PIPELINE_NODES, PIPELINE_EDGES, PIPELINE_STEPS } from './pipelineConfig';
import { Save, ChevronLeft, ChevronRight, Settings, Code2, Box, Sparkles, Loader2, Play, Plus, FolderOpen, LogOut, BarChart3, FolderUp, Github } from 'lucide-react';

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
    const [showProjectMenu, setShowProjectMenu] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
    const [analysisData, setAnalysisData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [uploadedFolderName, setUploadedFolderName] = useState(null);
    const folderInputRef = useRef(null);
    const [showRepoInput, setShowRepoInput] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedModel, setSelectedModel] = useState('gemini'); // 'gemini' | 'groq'

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

    // Fetch workspaces and auto-select the most recent one
    useEffect(() => {
        if (user) {
            fetch('/api/workspace', { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setWorkspaces(data);
                        // Auto-select the first (most recent) workspace and restore its canvas
                        if (data.length > 0 && !activeWorkspace) {
                            setActiveWorkspace(data[0]);
                            setNodes(data[0].nodes || []);
                            setEdges(data[0].edges || []);
                            if (data[0].chat_history?.length > 0) {
                                setChatHistory(data[0].chat_history);
                            }
                        }
                    }
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
            return ws; // Return the newly created workspace
        } catch (err) {
            console.error('Error creating workspace:', err);
            return null;
        }
    };

    const handleSelectWorkspace = (ws) => {
        setActiveWorkspace(ws);
        setNodes(ws.nodes || []);
        setEdges(ws.edges || []);
        if (ws.chat_history?.length > 0) {
            setChatHistory(ws.chat_history);
        }
    };

    const handleSaveWorkspace = async () => {
        let workspaceId = activeWorkspace?._id;

        // Auto-create a workspace if none exists, then save into it
        if (!workspaceId) {
            const newWs = await handleCreateWorkspace();
            if (!newWs?._id) return;
            workspaceId = newWs._id;
        }

        setSaveStatus('saving');
        try {
            const res = await fetch(`/api/workspace/${workspaceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodes,
                    edges,
                    chat_history: chatHistory,
                }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Save failed');
            const updated = await res.json();
            setActiveWorkspace(updated);
            // Also update the workspace in the list
            setWorkspaces(prev => prev.map(ws => ws._id === updated._id ? updated : ws));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Error saving workspace:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const handleAnalyzeStack = async () => {
        if (nodes.length === 0) return;

        // Extract unique tech names from canvas nodes
        const stackNames = [...new Set(nodes.map(n => {
            // Base type: 'react-1' → 'react'
            const baseType = n.type?.split('-')[0] || n.data?.label?.toLowerCase() || 'unknown';
            return baseType;
        }))].filter(s => s !== 'default' && s !== 'unknown');

        if (stackNames.length === 0) return;

        setIsAnalyzing(true);
        setShowAnalysis(true);
        setAnalysisData(null);

        try {
            const res = await fetch('/api/ai/analyze-stack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stack: stackNames, model: selectedModel }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();
            setAnalysisData(data);
        } catch (err) {
            console.error('Analysis error:', err);
            setAnalysisData({ summary: 'Analysis failed. Please try again.', cost: null, security: null, scalability: null, architecture: null });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFolderUpload = async (event) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;

        // Get folder name from the first file's path
        const firstPath = fileList[0].webkitRelativePath || fileList[0].name;
        const folderName = firstPath.split('/')[0] || 'Uploaded Project';
        setUploadedFolderName(folderName);

        setIsAnalyzing(true);
        setShowAnalysis(true);
        setAnalysisData(null);

        // Exclude binary/large/irrelevant files
        const skipPatterns = [
            /node_modules/i, /\.git\//i, /dist\//i, /build\//i, /\.next\//i,
            /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|mp3|zip|tar|gz|lock)$/i,
            /package-lock\.json$/i, /yarn\.lock$/i
        ];

        const readableFiles = [];
        const readPromises = [];

        for (let i = 0; i < fileList.length && readableFiles.length < 100; i++) {
            const file = fileList[i];
            const path = file.webkitRelativePath || file.name;

            if (skipPatterns.some(p => p.test(path))) continue;
            if (file.size > 100 * 1024) {
                readableFiles.push({ name: path, content: `[File too large: ${(file.size / 1024).toFixed(0)}KB]` });
                continue;
            }

            readPromises.push(
                new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        readableFiles.push({ name: path, content: e.target.result });
                        resolve();
                    };
                    reader.onerror = () => {
                        readableFiles.push({ name: path, content: '[Could not read file]' });
                        resolve();
                    };
                    reader.readAsText(file);
                })
            );
        }

        await Promise.all(readPromises);

        try {
            const res = await fetch('/api/ai/analyze-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: readableFiles, folderName, model: selectedModel }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Folder analysis failed');
            const data = await res.json();
            setAnalysisData(data);
        } catch (err) {
            console.error('Folder analysis error:', err);
            setAnalysisData({ summary: 'Folder analysis failed. Please try again.', cost: null, security: null, scalability: null, architecture: null });
        } finally {
            setIsAnalyzing(false);
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    const handleAnalyzeRepo = async () => {
        if (!repoUrl.trim()) return;

        const repoName = repoUrl.trim().replace(/\/$/, '').split('/').pop() || 'GitHub Repo';
        setUploadedFolderName(repoName);

        setIsAnalyzing(true);
        setShowAnalysis(true);
        setShowRepoInput(false);
        setAnalysisData(null);

        try {
            const res = await fetch('/api/ai/analyze-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: repoUrl.trim(), model: selectedModel }),
                credentials: 'include'
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.details || 'Repo analysis failed');
            }
            const data = await res.json();
            setAnalysisData(data);
        } catch (err) {
            console.error('Repo analysis error:', err);
            setAnalysisData({ summary: `Repo analysis failed: ${err.message}`, cost: null, security: null, scalability: null, architecture: null });
        } finally {
            setIsAnalyzing(false);
        }
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

        const boilerplateIdea = `Production-ready full-stack Boilerplate with SEPARATE frontend/ and backend/ directories. The frontend/ must have its own package.json and src/ folder with components. The backend/ must have its own package.json, src/ folder with routes/, controllers/, models/, config/, and middleware/ sub-directories. Include a root docker-compose.yml and README.md. Generate 12-18 files minimum.`;

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

            // STEP 2: Generate each file one by one (with delay to avoid rate limits)
            const generatedSoFar = [];
            for (let i = 0; i < plan.length; i++) {
                const file = plan[i];
                setGenerationStatus(`⚡ Generating ${file.name} (${i + 1}/${plan.length})...`);

                // Add small delay between API calls to avoid rate limiting
                if (i > 0) {
                    await new Promise(r => setTimeout(r, 1500));
                }

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
        angular: DeveloperNode,
        tailwindcss: DeveloperNode,
        typescript: DeveloperNode,
        express: DeveloperNode,
        django: DeveloperNode,
        flask: DeveloperNode,
        fastapi: DeveloperNode,
        springboot: DeveloperNode,
        postgres: DeveloperNode,
        mongodb: DeveloperNode,
        mysql: DeveloperNode,
        redis: DeveloperNode,
        firebase: DeveloperNode,
        supabase: DeveloperNode,
        graphql: DeveloperNode,
        prisma: DeveloperNode,
        stripe: DeveloperNode,
        jwt: DeveloperNode,
        auth: DeveloperNode,
        docker: DeveloperNode,
        nginx: DeveloperNode,
        socketio: DeveloperNode,
        default: DeveloperNode,
    };

    return (
        <div className="flex flex-col h-screen w-full bg-white font-mono overflow-hidden">
            {/* ===== TOP NAVBAR (full width) ===== */}
            <header className="h-14 border-b-4 border-black bg-white flex items-center justify-between px-4 z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white p-1 font-black text-lg px-2 border-2 border-black">WS</div>

                    {/* Project Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProjectMenu(!showProjectMenu)}
                            className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter hover:text-[#FF3366] transition-colors"
                        >
                            <FolderOpen size={16} className="text-[#FF3366]" />
                            <span className="text-gray-500">Project /</span>
                            <span className="text-[#FF3366]">{activeWorkspace?.name || 'MyProject-1'}</span>
                            <ChevronRight size={14} className={`transition-transform ${showProjectMenu ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {showProjectMenu && (
                            <div className="absolute top-full left-0 mt-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[220px] z-50">
                                {/* New Project Button */}
                                <button
                                    onClick={async () => {
                                        await handleCreateWorkspace();
                                        setNodes([]);
                                        setEdges([]);
                                        setGeneratedFiles(null);
                                        setShowProjectMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 font-black text-sm uppercase bg-[#33FF66] hover:bg-[#2be05a] border-b-3 border-black transition-colors"
                                >
                                    <Plus size={16} /> NEW PROJECT
                                </button>

                                {/* Existing Projects */}
                                <div className="max-h-[200px] overflow-y-auto">
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws._id}
                                            onClick={() => {
                                                handleSelectWorkspace(ws);
                                                setGeneratedFiles(null);
                                                setShowProjectMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-4 py-2.5 font-bold text-sm text-left hover:bg-gray-100 border-b border-gray-200 transition-colors ${activeWorkspace?._id === ws._id ? 'bg-[#FFD700]/30 text-black' : 'text-gray-700'
                                                }`}
                                        >
                                            <FolderOpen size={14} />
                                            {ws.name}
                                        </button>
                                    ))}
                                    {workspaces.length === 0 && (
                                        <p className="px-4 py-3 text-xs text-gray-400 font-bold">No projects yet. Create one!</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <span className="text-xs font-black uppercase text-gray-400 ml-2">
                        Role: <span className="text-black bg-[#FFD700] px-2 py-0.5 border-2 border-black ml-1">{user?.user_type}</span>
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSaveWorkspace}
                        disabled={saveStatus === 'saving'}
                        className={`flex items-center gap-2 px-3 py-1.5 border-3 border-black font-black text-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${saveStatus === 'saved' ? 'bg-[#33FF66]' : saveStatus === 'error' ? 'bg-[#FF3366] text-white' : 'bg-[#00F0FF]'
                            }`}
                    >
                        {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saveStatus === 'saved' ? 'SAVED ✓' : saveStatus === 'error' ? 'ERROR ✗' : saveStatus === 'saving' ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button
                        onClick={handleGenerateBoilerplate}
                        disabled={isGenerating || nodes.length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 border-3 border-black bg-[#33FF66] font-black text-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
                        GENERATE BOILERPLATE
                    </button>
                    <button
                        onClick={handleAnalyzeStack}
                        disabled={isAnalyzing || nodes.length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 border-3 border-black bg-[#FF3366] text-white font-black text-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 size={16} />}
                        ANALYZE
                    </button>
                    <button
                        onClick={() => setShowRepoInput(!showRepoInput)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-1.5 border-3 border-black bg-[#FF8C00] text-white font-black text-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                        <Github size={16} />
                        GITHUB REPO
                    </button>

                    {/* GitHub Repo URL Input Dropdown */}
                    {showRepoInput && (
                        <div className="absolute right-[200px] top-[52px] z-50 bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 w-[400px]">
                            <p className="font-black text-xs uppercase mb-2 text-gray-400">🔗 Enter GitHub Repo URL</p>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeRepo()}
                                    placeholder="https://github.com/owner/repo"
                                    className="flex-1 px-3 py-1.5 border-2 border-black font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C00]"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAnalyzeRepo}
                                    disabled={!repoUrl.trim()}
                                    className="px-3 py-1.5 bg-[#FF8C00] text-white border-2 border-black font-black text-sm hover:bg-[#e67e00] transition-colors disabled:opacity-50"
                                >
                                    ANALYZE
                                </button>
                            </div>

                            <p className="font-black text-xs uppercase mb-2 text-gray-400">🤖 Select AI Model</p>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={() => setSelectedModel('gemini')}
                                    className={`px-3 py-2 border-2 border-black font-black text-xs transition-all ${selectedModel === 'gemini' ? 'bg-[#00F0FF] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-100'}`}
                                >
                                    GEMINI (DETAILED)
                                </button>
                                <button
                                    onClick={() => setSelectedModel('groq')}
                                    className={`px-3 py-2 border-2 border-black font-black text-xs transition-all ${selectedModel === 'groq' ? 'bg-[#33FF66] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-100'}`}
                                >
                                    GROQ (FAST)
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-400 font-bold">Public repos only. e.g. https://github.com/facebook/react</p>
                        </div>
                    )}

                    {/* User Avatar + Logout */}
                    {user && (
                        <div className="flex items-center gap-2 ml-2 border-l-2 border-gray-300 pl-3">
                            <div className="w-8 h-8 border-2 border-black bg-[#00F0FF] overflow-hidden shrink-0">
                                {user.profile_picture ? (
                                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-black text-sm">
                                        {user.first_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => window.location.href = '/api/auth/logout'}
                                className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
                                title="Logout"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ===== MAIN CONTENT AREA (sidebar + canvas + editor) ===== */}
            <div className="flex-1 flex overflow-hidden" ref={reactFlowWrapper}>

                {/* LEFT: Tech Sidebar */}
                <div className={`${isSidebarOpen ? 'w-52' : 'w-0'} transition-all duration-300 border-r-4 border-black bg-[#FFD700] relative overflow-hidden flex flex-col shrink-0 z-20`}>
                    <div className="p-3 border-b-3 border-black bg-black/10">
                        <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                            <Box size={14} /> TECH STACK
                        </h2>
                        <p className="text-[10px] font-bold text-gray-700 mt-0.5">Drag to canvas →</p>
                    </div>
                    <Sidebar
                        user={user}
                        workspaces={workspaces}
                        activeWorkspace={activeWorkspace}
                        onCreateWorkspace={handleCreateWorkspace}
                        onSelectWorkspace={handleSelectWorkspace}
                        onSuggestComponents={handleSuggestComponents}
                        compact={true}
                    />
                </div>

                {/* Toggle Sidebar Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute top-1/2 -translate-y-1/2 z-50 bg-white border-3 border-black p-0.5 hover:bg-black hover:text-white transition-all duration-300"
                    style={{ left: isSidebarOpen ? '206px' : '0px', top: '50%' }}
                >
                    {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>

                {/* CENTER: ReactFlow Canvas */}
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
                        <Controls className="!bg-white !border-3 !border-black !shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
                        <MiniMap
                            className="!bg-white !border-3 !border-black !shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                            nodeColor={() => '#FF3366'}
                            maskColor="rgba(0, 0, 0, 0.1)"
                        />
                    </ReactFlow>

                    {/* Loading Overlay */}
                    {isGenerating && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <div className="bg-white border-4 border-black p-6 flex flex-col items-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm">
                                <Loader2 className="w-12 h-12 animate-spin text-[#FFD700] mb-3" />
                                <h2 className="font-black text-xl uppercase tracking-widest text-[#FF3366]">Scaffolding...</h2>
                                {generationStatus && (
                                    <p className="font-bold text-xs text-gray-700 mt-2 text-center bg-gray-100 border-2 border-black px-3 py-1.5">
                                        {generationStatus}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Editor Panel (slides in when files generated) */}
                {(generatedFiles || isGenerating) && (
                    <div className="w-[380px] shrink-0 border-l-4 border-black bg-[#1a1a2e] relative z-40 flex flex-col">
                        <EditorPanel files={generatedFiles} generationStatus={generationStatus} />
                    </div>
                )}
            </div>

            {/* Analysis Modal */}
            {showAnalysis && (
                <AnalysisModal
                    analysis={analysisData}
                    isLoading={isAnalyzing}
                    onClose={() => { setShowAnalysis(false); setAnalysisData(null); setUploadedFolderName(null); }}
                    folderName={uploadedFolderName}
                />
            )}
        </div>
    );
};

export default Workspace;
