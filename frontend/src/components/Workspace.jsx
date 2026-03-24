import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ProjectView from './ProjectView';
import NodeOptionsPanel from './NodeOptionsPanel';
import AnalysisModal from './AnalysisModal';
import { workflowNodeTypes } from './WorkflowNode';
import DeveloperNode from './DeveloperNode';
import GamifiedNode from './GamifiedNode';
import { PIPELINE_NODES, PIPELINE_EDGES, PIPELINE_STEPS } from './pipelineConfig';
import { Save, ChevronLeft, ChevronRight, Settings, Code2, Box, Sparkles, Loader2, Play, Plus, FolderOpen, LogOut, BarChart3, FolderUp, Github, Trash } from 'lucide-react';

const initialNodes = JSON.parse(localStorage.getItem('ws_nodes')) || [];
const initialEdges = JSON.parse(localStorage.getItem('ws_edges')) || [];
const initialChat = JSON.parse(localStorage.getItem('ws_chat')) || [
    {
        role: 'assistant',
        content: "Hey! 👋 I'm **WireStack AI**! Tell me what app you want to build and I'll help you pick the perfect tech stack! 🚀\n\nFor example: *\"I want to build an e-commerce website\"*"
    }
];

const Workspace = () => {
    const navigate = useNavigate();
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [panelWidth, setPanelWidth] = useState(500); // Default width for Editor
    const [isDragging, setIsDragging] = useState(false);
    const [lastJobId, setLastJobId] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [activeEditorJobId, setActiveEditorJobId] = useState(null);
    // Handle resizing
    const handleMouseDown = (e) => {
        setIsDragging(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < 800) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);
    // Listen for close-editor and open-code-editor events
    useEffect(() => {
        const handleCloseEditor = () => {
            setGeneratedFiles(null);
            setIsGenerating(false);
        };
        const handleOpenCode = () => {
            if (nodes.length > 0 && nodes.every(n => n.data.status === 'completed')) {
                if (lastJobId) {
                    console.log(`[NAV] Navigating to existing job: ${lastJobId}`);
                    setActiveEditorJobId(lastJobId);
                    setIsEditorOpen(true);
                } else {
                    handleGenerateProject();
                }
            } else {
                alert('Mission not finished yet! Complete all nodes to view the code. 🚀');
            }
        };

        window.addEventListener('close-editor', handleCloseEditor);
        window.addEventListener('open-code-editor', handleOpenCode);
        return () => {
            window.removeEventListener('close-editor', handleCloseEditor);
            window.removeEventListener('open-code-editor', handleOpenCode);
        };
    }, [nodes, lastJobId]);

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
    const [selectedModel, setSelectedModel] = useState('nvidia'); // Use Nvidia Minimax as default
    const [systemDesign, setSystemDesign] = useState(null); // Dynamic steps from AI

    // Create a structural fingerprint of the current architecture
    // We only care about node types, tech choices, and edges - NOT positions.
    const architectureFingerprint = useMemo(() => {
        const nds = nodes.map(n => `${n.id}:${n.data.selectedOption || ''}:${n.type}`).sort().join('|');
        const eds = edges.map(e => `${e.source}-${e.target}`).sort().join('|');
        return `${nds}#${eds}`;
    }, [nodes, edges]);

    // Track architectural data changes to clear lastJobId
    const lastFingerprint = useRef(architectureFingerprint);

    useEffect(() => {
        if (lastFingerprint.current !== architectureFingerprint) {
            console.log('[SYNC] Architecture structure changed, clearing lastJobId');
            setLastJobId(null);
            lastFingerprint.current = architectureFingerprint;
        }
    }, [architectureFingerprint]);

    // Lifted chat state
    const [chatHistory, setChatHistory] = useState(initialChat);

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem('ws_nodes', JSON.stringify(nodes));
        localStorage.setItem('ws_edges', JSON.stringify(edges));
        localStorage.setItem('ws_chat', JSON.stringify(chatHistory));
    }, [nodes, edges, chatHistory]);

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

            // Force a completely clean slate for the UI
            setNodes([]);
            setEdges([]);
            setChatHistory([{ role: 'assistant', content: "Hi! I am WireStack's AI architect. Need a system design? Describe your idea." }]);
            setSystemDesign(null);
            setLastJobId(null);
            lastFingerprint.current = '#';
            setIsEditorOpen(false);

            return ws; // Return the newly created workspace
        } catch (err) {
            console.error('Error creating workspace:', err);
            return null;
        }
    };

    const handleDeleteWorkspace = async (e, workspaceId) => {
        e.stopPropagation();
        const idStr = String(workspaceId); // Ensure it's a string, not an object
        console.log('🗑️ [FRONTEND] Attempting to delete workspace:', idStr);
        if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

        try {
            const response = await fetch(`/api/workspace/${idStr}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                console.log('✅ [FRONTEND] Workspace deleted successfully');
                setWorkspaces(prev => prev.filter(ws => ws._id !== workspaceId));
                if (activeWorkspace?._id === workspaceId) {
                    setActiveWorkspace(null);
                    setNodes([]);
                    setEdges([]);
                    setChatHistory([{ role: 'assistant', content: "Project deleted. Start a new mission! 🚀" }]);
                }
            } else {
                console.error('❌ [FRONTEND] Error deleting workspace. Status:', response.status);
                alert(`Failed to delete workspace (Status: ${response.status})`);
            }
        } catch (err) {
            console.error('Error deleting workspace:', err);
        }
    };

    const handleSelectWorkspace = (ws) => {
        setActiveWorkspace(ws);
        const wsNodes = ws.nodes || [];
        const wsEdges = ws.edges || [];
        setNodes(wsNodes);
        setEdges(wsEdges);
        setLastJobId(ws.last_job_id || null);
        setSystemDesign(null); // Clear previous system design suggestions
        setIsEditorOpen(false); // Close editor panel when switching workspaces

        // Sync fingerprint to prevent clearing lastJobId on initial load of this workspace
        const ndsFinger = wsNodes.map(n => `${n.id}:${n.data.selectedOption || ''}:${n.type}`).sort().join('|');
        const edsFinger = wsEdges.map(e => `${e.source}-${e.target}`).sort().join('|');
        lastFingerprint.current = `${ndsFinger}#${edsFinger}`;

        if (ws.chat_history?.length > 0) {
            setChatHistory(ws.chat_history);
        } else {
            setChatHistory([{ role: 'assistant', content: "Hi! I am WireStack's AI architect. Need a system design? Describe your idea." }]);
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
                    last_job_id: lastJobId
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

    const handleToggleUserType = async () => {
        const nextType = user?.user_type === 'developer' ? 'non-developer' : 'developer';
        if (!window.confirm(`Are you sure you want to change role from ${user?.user_type} to ${nextType}?`)) {
            return;
        }

        try {
            const res = await fetch('/api/auth/update-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userType: nextType }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to update role');

            const data = await res.json();
            setUser(data.user);
        } catch (err) {
            console.error('Role update error:', err);
            alert('Failed to update role. Please try again.');
        }
    };

    const handleSuggestSystemDesign = (design) => {
        setSystemDesign(design);

        const newNodes = design.map((level, i) => ({
            id: `step-${level.id}`,
            type: 'gamifiedNode',
            position: { x: 50 + i * 220, y: 250 },
            data: {
                stepId: level.id,
                title: level.title,
                status: i === 0 ? 'active' : 'locked',
                selectedOption: null,
                bestPractice: level.best_practice,
                alternatives: level.alternatives
            },
        }));

        const newEdges = design.slice(0, -1).map((level, i) => ({
            id: `e-${level.id}-${design[i + 1].id}`,
            source: `step-${level.id}`,
            target: `step-${design[i + 1].id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#000', strokeWidth: 3, strokeDasharray: '5,5' },
        }));

        setNodes(newNodes);
        setEdges(newEdges);
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

    const pollJobStatus = async (jobId, onUpdate) => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/ai/job-status/${jobId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch job status');
                const data = await res.json();

                if (onUpdate) onUpdate(data);

                if (data.state === 'completed') {
                    return data.result;
                } else if (data.state === 'failed') {
                    throw new Error(data.failedReason || 'Job failed on server');
                } else {
                    // Poll again after 2 seconds
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return poll();
                }
            } catch (err) {
                console.error('Polling error:', err);
                throw err;
            }
        };
        return poll();
    };

    const handleGenerateProject = async () => {
        setIsGenerating(true);
        setGeneratedFiles(null);
        setGenerationStatus('🧠 Enqueuing project generation...');

        const stackDescription = nodes.map(n => {
            const stepId = n.data.stepId;
            const selectedId = n.data.selectedOption;
            let opt = PIPELINE_STEPS.find(s => s.id === stepId)?.options.find(o => o.id === selectedId);
            if (!opt && n.data.bestPractice?.id === selectedId) opt = n.data.bestPractice;
            if (!opt && n.data.alternatives) opt = n.data.alternatives.find(a => a.id === selectedId);
            return `${n.data.title}: ${opt?.name || selectedId || 'None'}`;
        }).join(', ');

        const userIdea = chatHistory.find(msg => msg.role === 'user')?.content || 'a full-stack web application';

        try {
            const res = await fetch('/api/ai/enqueue-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: userIdea, stack: stackDescription }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to enqueue project');
            const { jobId } = await res.json();

            setLastJobId(jobId);

            // Auto-save before redirecting
            await handleSaveWorkspace();

            // Redirect to embedded full page editor
            setActiveEditorJobId(jobId);
            setIsEditorOpen(true);
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
        setGenerationStatus('🧠 Enqueuing boilerplate generation...');

        const stackItems = nodes.map(n => n.type || n.data?.label || 'Unknown Node');
        const cleanStackItems = stackItems.map(item => item.split('-')[0].trim());
        const uniqueStack = [...new Set(cleanStackItems)].join(', ');

        const boilerplateIdea = `Production-ready full-stack Boilerplate with SEPARATE frontend/ and backend/ directories. Include docker-compose.yml and README.md. Generate 12-18 files.`;

        try {
            const res = await fetch('/api/ai/enqueue-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: boilerplateIdea, stack: uniqueStack }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to enqueue boilerplate');
            const { jobId } = await res.json();

            setLastJobId(jobId);

            // Auto-save before redirecting
            await handleSaveWorkspace();

            // Redirect to embedded full page editor
            setActiveEditorJobId(jobId);
            setIsEditorOpen(true);
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
            <div className="flex h-screen w-full bg-[#fafafa] font-mono overflow-hidden relative">
                {/* Left Panel: AI Chat */}
                <div className={`${isSidebarOpen ? 'w-[320px]' : 'w-0'} transition-all duration-300 shrink-0 border-r-4 border-black bg-[#FFD700] flex flex-col overflow-hidden`}>
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
                                <div
                                    onClick={handleToggleUserType}
                                    className="flex items-center gap-1 mt-1 cursor-pointer group select-none"
                                >
                                    <span className="text-[8px] font-black uppercase text-black bg-[#FFD700] px-1.5 py-0.5 border-2 border-black group-hover:bg-[#00F0FF] transition-all">
                                        {user?.user_type}
                                    </span>
                                    <Settings size={10} className="text-gray-400 group-hover:text-black group-hover:rotate-90 transition-all" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => window.location.href = '/api/auth/logout'}
                                    className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={12} />
                                </button>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-1 border-2 border-black hover:bg-[#FF3366] hover:text-white transition-colors"
                                    title="Close Sidebar"
                                >
                                    <ChevronLeft size={12} />
                                </button>
                            </div>
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
                            onSuggestSystemDesign={handleSuggestSystemDesign}
                            messages={chatHistory}
                            setMessages={setChatHistory}
                        />
                    </div>
                </div>

                {/* Center Panel: Canvas */}
                <div className="flex-1 flex flex-col relative bg-[#fafafa]" ref={reactFlowWrapper}>
                    {/* Top Navbar */}
                    <header className="h-16 border-b-4 border-black bg-white flex items-center justify-between px-6 z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            {!isSidebarOpen && (
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-1 border-2 border-black hover:bg-[#FFD700] transition-colors"
                                    title="Open Sidebar"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            )}
                            <div className="relative">
                                <button
                                    onClick={() => setShowProjectMenu(!showProjectMenu)}
                                    className="flex items-center gap-2 font-black text-xl uppercase tracking-tighter hover:text-[#FF3366] transition-colors"
                                >
                                    <span className="text-gray-400">WORKFLOW /</span>
                                    <span className="text-[#FF3366]">{activeWorkspace?.name || 'Project-7'}</span>
                                    <ChevronRight size={16} className={`transition-transform ${showProjectMenu ? 'rotate-90' : ''}`} />
                                </button>

                                {showProjectMenu && (
                                    <div className="absolute top-full left-0 mt-2 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-w-[280px] z-[100]">
                                        <button
                                            onClick={async () => {
                                                await handleCreateWorkspace();
                                                setShowProjectMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-4 font-black text-sm uppercase bg-[#33FF66] hover:bg-black hover:text-white border-b-4 border-black transition-all"
                                        >
                                            <Plus size={18} /> NEW MISSION
                                        </button>
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {workspaces.map((ws) => (
                                                <div
                                                    key={ws._id}
                                                    className={`group w-full flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 hover:bg-gray-50 transition-colors ${activeWorkspace?._id === ws._id ? 'bg-[#FFD700]/20' : ''}`}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            handleSelectWorkspace(ws);
                                                            setShowProjectMenu(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-3 font-bold text-sm text-left truncate"
                                                    >
                                                        <FolderOpen size={16} className={activeWorkspace?._id === ws._id ? 'text-[#FF3366]' : 'text-gray-400'} />
                                                        <span className="truncate">{ws.name}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteWorkspace(e, ws._id)}
                                                        className="p-1.5 text-gray-400 hover:text-[#FF3366] hover:bg-[#FF3366]/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete Project"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCreateWorkspace}
                                className="flex items-center gap-1 px-3 py-1.5 border-3 border-black bg-[#33FF66] font-black text-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                            >
                                + NEW
                            </button>
                            {allCompleted && (
                                <button
                                    onClick={() => lastJobId ? window.dispatchEvent(new CustomEvent('open-code-editor')) : handleGenerateProject()}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-6 py-1.5 border-3 border-black bg-[#FFD700] font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-75 animate-bounce"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : (lastJobId ? <Code2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />)}
                                    {lastJobId ? "View Code" : "Generate Final Code"}
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

                {/* Right Panel: Embedded Editor */}
                {isEditorOpen && activeEditorJobId && (
                    <div
                        className="relative z-40 flex shrink-0 border-l-4 border-black bg-white shadow-[-10px_0px_50px_rgba(0,0,0,0.1)]"
                        style={{ width: `${Math.max(400, panelWidth)}px` }}
                    >
                        {/* Resizer Handle */}
                        <div
                            onMouseDown={handleMouseDown}
                            className={`absolute left-[-4px] top-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-[#00F0FF]/50 transition-colors ${isDragging ? 'bg-[#00F0FF]' : ''}`}
                        />
                        <div className="flex-1 w-full h-full relative">
                            <ProjectView embeddedJobId={activeEditorJobId} onClose={() => setIsEditorOpen(false)} />
                        </div>
                    </div>
                )}
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
                    {!isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-1.5 border-2 border-black bg-[#FFD700] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            title="Open Sidebar"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
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
                                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                    {workspaces.map((ws) => (
                                        <div
                                            key={ws._id}
                                            className={`group w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${activeWorkspace?._id === ws._id ? 'bg-[#FFD700]/20' : ''}`}
                                        >
                                            <button
                                                onClick={() => {
                                                    handleSelectWorkspace(ws);
                                                    setShowProjectMenu(false);
                                                }}
                                                className="flex-1 flex items-center gap-2 font-bold text-sm text-left truncate"
                                            >
                                                <FolderOpen size={14} className={activeWorkspace?._id === ws._id ? 'text-[#FF3366]' : 'text-gray-400'} />
                                                <span className="truncate">{ws.name}</span>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteWorkspace(e, ws._id)}
                                                className="p-1 text-gray-400 hover:text-[#FF3366] hover:bg-[#FF3366]/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Project"
                                            >
                                                <Trash size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {workspaces.length === 0 && (
                                        <p className="px-4 py-3 text-xs text-gray-400 font-bold">No projects yet. Create one!</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        onClick={handleToggleUserType}
                        className="group flex items-center gap-1 cursor-pointer select-none"
                    >
                        <span className="text-[10px] font-black uppercase text-gray-400 ml-2 group-hover:text-black transition-colors">
                            Role:
                        </span>
                        <span className="text-[10px] font-black uppercase text-black bg-[#FFD700] px-2 py-0.5 border-2 border-black ml-1 group-hover:bg-[#00F0FF] group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                            {user?.user_type}
                        </span>
                        <Settings size={12} className="text-gray-400 group-hover:text-black group-hover:rotate-90 transition-all ml-1" />
                    </div>
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

                    {/* GAMIFIED MODE BUTTON: Only show if gamified and all nodes completed */}
                    {user?.user_type === 'learner' && nodes.length > 0 && nodes.every(n => n.data.status === 'completed') ? (
                        <button
                            onClick={handleGenerateProject}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-1.5 border-3 border-black bg-[#FFD700] text-black font-black text-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all animate-pulse disabled:animate-none disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
                            GENERATE CODE DEMO 🚀
                        </button>
                    ) : (
                        // STANDARD MODE BUTTONS
                        <>
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
                        </>
                    )}
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

                            <p className="text-[10px] text-gray-400 font-bold mt-1">Public repos only. e.g. https://github.com/facebook/react</p>
                        </div>
                    )}

                    {/* User Avatar + Logout */}
                    {user && (
                        <div className="flex items-center gap-2 ml-2 border-l-2 border-gray-700 pl-3">
                            <div className="w-8 h-8 border-2 border-[#0f0f1a] bg-[#00F0FF] overflow-hidden shrink-0">
                                {user.profile_picture ? (
                                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-black text-sm text-black">
                                        {user.first_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => window.location.href = '/api/auth/logout'}
                                className="p-1 border-2 border-[#0f0f1a] hover:bg-[#0f0f1a] hover:text-white transition-colors text-gray-300"
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
                <div className={`${isSidebarOpen ? 'w-[280px]' : 'w-0'} transition-all duration-300 border-r-4 border-black bg-[#FFD700] relative overflow-hidden flex flex-col shrink-0 z-20`}>
                    <div className="p-4 border-b-4 border-black bg-black/5">
                        <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-black">
                            <Box size={16} /> BUILDER TOOLS
                        </h2>
                        <p className="text-[10px] font-black text-black/60 mt-0.5">DRAG & DROP TO CANVAS</p>
                    </div>
                    <Sidebar
                        user={user}
                        workspaces={workspaces}
                        activeWorkspace={activeWorkspace}
                        onCreateWorkspace={handleCreateWorkspace}
                        onSelectWorkspace={handleSelectWorkspace}
                        onSuggestSystemDesign={handleSuggestSystemDesign}
                        messages={chatHistory}
                        setMessages={setChatHistory}
                        compact={true}
                    />
                </div>


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

                {/* RIGHT: Editor Panel (Resizable) */}
                {isEditorOpen && activeEditorJobId && (
                    <div
                        className="relative z-40 flex shrink-0"
                        style={{ width: `${Math.max(400, panelWidth)}px` }}
                    >
                        {/* Resizer Handle */}
                        <div
                            onMouseDown={handleMouseDown}
                            className={`absolute left-[-4px] top-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-[#00F0FF]/50 transition-colors ${isDragging ? 'bg-[#00F0FF]' : ''}`}
                        />

                        <div className="flex-1 border-l-4 border-black bg-white flex flex-col shadow-[-10px_0px_50px_rgba(0,0,0,0.1)] relative">
                            <ProjectView embeddedJobId={activeEditorJobId} onClose={() => setIsEditorOpen(false)} />
                        </div>
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
