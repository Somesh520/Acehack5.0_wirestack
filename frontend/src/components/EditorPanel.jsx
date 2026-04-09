import { useState, useEffect, useRef } from 'react';
import { FolderOpen, File, ChevronRight, ChevronDown, Code2, FileJson, FileText, Sparkles, Download, Loader2, Save, X, Search, Settings, ChevronLeft, Rocket, ExternalLink, Square, Globe, Zap } from 'lucide-react';
import Editor from '@monaco-editor/react';

// Convert flat file paths like "frontend/src/App.jsx" into a nested tree structure
const buildNestedTree = (flatFiles) => {
    const root = { name: 'project', children: [] };

    flatFiles.forEach(file => {
        const parts = file.name.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = i === parts.length - 1;

            if (isLastPart) {
                // This is a file
                current.children.push({ name: part, content: file.content });
            } else {
                // This is a folder, find or create it
                let folder = current.children.find(c => c.name === part && c.children);
                if (!folder) {
                    folder = { name: part, children: [] };
                    current.children.push(folder);
                }
                current = folder;
            }
        }
    });

    return root;
};

// Auto-detect type and add icons from AI-generated structure
const normalizeTree = (node) => {
    if (!node) return null;
    const isFolder = !!node.children;
    const ext = node.name?.split('.').pop()?.toLowerCase();

    const iconMap = {
        json: <FileJson size={14} className="text-[#FFA500]" />,
        js: <Code2 size={14} className="text-[#00F0FF]" />,
        jsx: <Code2 size={14} className="text-[#A020F0]" />,
        ts: <Code2 size={14} className="text-[#3178C6]" />,
        md: <FileText size={14} className="text-gray-400" />,
        html: <Code2 size={14} className="text-[#FF3366]" />,
        css: <Code2 size={14} className="text-[#33FF66]" />,
        py: <Code2 size={14} className="text-[#FFD700]" />,
        yml: <FileText size={14} className="text-[#FF6B6B]" />,
        yaml: <FileText size={14} className="text-[#FF6B6B]" />,
        env: <FileText size={14} className="text-[#888]" />,
    };

    return {
        ...node,
        type: isFolder ? 'folder' : 'file',
        icon: isFolder ? null : (iconMap[ext] || <File size={14} className="text-gray-400" />),
        children: isFolder ? node.children.map(normalizeTree) : undefined,
    };
};

const FileTreeItem = ({ item, depth = 0, onSelect, selectedFile }) => {
    const [isOpen, setIsOpen] = useState(depth === 0);
    const isFolder = item.type === 'folder';
    const isSelected = selectedFile?.name === item.name && item.type === 'file';

    return (
        <div className="select-none">
            <button
                onClick={() => {
                    if (isFolder) setIsOpen(!isOpen);
                    else if (onSelect) onSelect(item);
                }}
                className={`w-full flex items-center gap-1.5 py-2 px-3 text-[12px] font-black transition-all group ${isSelected ? 'bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10' : 'text-black hover:bg-gray-100'}`}
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
            >
                <span className="flex items-center gap-2 truncate">
                    {isFolder ? (
                        <>
                            <span className="shrink-0 text-black">
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <FolderOpen size={16} className="text-black shrink-0 fill-[#FFA500]" />
                        </>
                    ) : (
                        <>
                            <span className="w-3.5" />
                            <span className="shrink-0">{item.icon || <File size={16} className="text-black" />}</span>
                        </>
                    )}
                    <span className="truncate">{item.name}</span>
                </span>
            </button>
            {isFolder && isOpen && item.children?.map((child, i) => (
                <FileTreeItem
                    key={child.name + i}
                    item={child}
                    depth={depth + 1}
                    onSelect={onSelect}
                    selectedFile={selectedFile}
                />
            ))}
        </div>
    );
};


const EditorPanel = ({ files, generationStatus, jobId }) => {
    // We will keep a local copy of flat files so we can edit them
    const [localFiles, setLocalFiles] = useState([]);
    
    useEffect(() => {
        if (files && files.children) {
            setLocalFiles(files.children);
        }
    }, [files]);

    const nestedTree = localFiles.length > 0 ? buildNestedTree(localFiles) : null;
    const normalized = nestedTree ? normalizeTree({ ...nestedTree, name: files?.name || 'project' }) : null;
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false);
    const [activeTab, setActiveTab] = useState('explorer'); // 'explorer', 'search', 'settings'
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    // Sandbox deployment state
    const [deployState, setDeployState] = useState('idle'); // idle, deploying, running, stopping, error
    const [sandboxUrl, setSandboxUrl] = useState(null);
    const [deployError, setDeployError] = useState(null);
    const pollRef = useRef(null);

    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX - 60; // Offset for Activity Bar
            if (newWidth > 150 && newWidth < 500) {
                setSidebarWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleEditorChange = (value) => {
        if (!selectedFile) return;
        setLocalFiles(prev => prev.map(f => f.name === selectedFile.name ? { ...f, content: value } : f));
        setSelectedFile(prev => ({ ...prev, content: value }));
    };

    const handleSaveToCloud = async () => {
        if (!jobId || localFiles.length === 0) return;
        setIsSaving(true);
        try {
            const safeFiles = localFiles.map(({ name, content }) => ({ name, content }));
            const res = await fetch(`/api/ai/save-project/${jobId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: safeFiles }),
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to save to cloud');
            alert('Saved successfully to S3!');
        } catch (err) {
            console.error('Save error:', err);
            alert('Error saving to cloud: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadZip = async () => {
        if (!localFiles || localFiles.length === 0) return;
        setIsDownloading(true);

        const safeFiles = localFiles.map(({ name, content }) => ({ name, content }));

        try {
            const response = await fetch('/api/ai/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: safeFiles, jobId }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to download project');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wirestack-project.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading zip:', error);
            alert('Failed to download project zip');
        } finally {
            setIsDownloading(false);
        }
    };

    // ============================================================
    // Sandbox Deployment
    // ============================================================
    const handleDeploySandbox = async () => {
        if (!jobId) return;
        setDeployState('deploying');
        setDeployError(null);
        setSandboxUrl(null);

        try {
            const res = await fetch('/api/ai/deploy-sandbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId }),
                credentials: 'include'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.details || err.error || 'Deploy failed');
            }

            const data = await res.json();

            if (data.status === 'already-running' && data.url) {
                setDeployState('running');
                setSandboxUrl(data.url);
                return;
            }

            // Start polling for status
            startStatusPolling();
        } catch (err) {
            console.error('Deploy error:', err);
            setDeployState('error');
            setDeployError(err.message);
        }
    };

    const startStatusPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/ai/sandbox-status/${jobId}`, { credentials: 'include' });
                if (!res.ok) return;
                const data = await res.json();

                if (data.state === 'RUNNING' && data.url) {
                    setDeployState('running');
                    setSandboxUrl(data.url);
                    clearInterval(pollRef.current);
                } else if (data.state === 'STOPPED' || data.state === 'NOT_FOUND') {
                    setDeployState('idle');
                    setSandboxUrl(null);
                    clearInterval(pollRef.current);
                } else if (data.state === 'ERROR') {
                    setDeployState('error');
                    setDeployError(data.error);
                    clearInterval(pollRef.current);
                }
                // else keep polling (PROVISIONING, PENDING)
            } catch (err) {
                console.error('Status poll error:', err);
            }
        }, 5000);
    };

    const handleStopSandbox = async () => {
        setDeployState('stopping');
        try {
            await fetch(`/api/ai/sandbox/${jobId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            setDeployState('idle');
            setSandboxUrl(null);
        } catch (err) {
            console.error('Stop error:', err);
            setDeployState('error');
        }
    };

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // Auto-select the latest file when a new one arrives
    useEffect(() => {
        if (normalized?.children?.length > 0) {
            const lastChild = normalized.children[normalized.children.length - 1];
            if (lastChild && lastChild.type !== 'folder') {
                setSelectedFile(lastChild);
            }
        }
    }, [files]);

    // Helper to get monaco language from file extension
    const getLanguage = (fileName) => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        const map = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            html: 'html',
            css: 'css',
            json: 'json',
            py: 'python',
            md: 'markdown',
            yml: 'yaml',
            yaml: 'yaml',
            sh: 'shell',
            sql: 'sql'
        };
        return map[ext] || 'plaintext';
    };

    const formatContent = (file) => {
        if (!file || !file.content) return '';
        let content = file.content;
        return String(content).replace(/\\n/g, '\n');
    };

    // Find a file to use for preview (index.html or any html file)
    const getPreviewHtml = () => {
        if (!normalized) return '';
        let htmlContent = '';

        const searchHtml = (node) => {
            if (node.type === 'file' && node.name?.endsWith('.html')) {
                htmlContent = node.content;
                return true;
            }
            if (node.children) {
                for (let child of node.children) {
                    if (searchHtml(child)) return true;
                }
            }
            return false;
        };

        searchHtml(normalized);

        // If no HTML found, create a fallback
        if (!htmlContent) {
            htmlContent = `
                <html>
                    <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f0f0; margin: 0; text-align: center;">
                        <h2 style="color: #333;">Preview Not Available</h2>
                        <p style="color: #666; max-width: 400px;">The AI did not generate an HTML file for a visual preview. Try generating a Frontend-heavy stack!</p>
                    </body>
                </html>
            `;
        }
        return htmlContent;
    };
    const lineNumbers = (content) => {
        if (!content) return [];
        return content.split('\n');
    };

    const countFiles = (node) => {
        if (!node) return 0;
        if (node.type === 'file') return 1;
        return (node.children || []).reduce((acc, child) => acc + countFiles(child), 0);
    };

    const fileCount = normalized ? countFiles(normalized) : 0;

    return (
        <div className="h-full w-full flex flex-col bg-white text-black font-mono overflow-hidden">
            {/* Header / Toolbar - Slimmer & cleaner */}
            <div className="h-10 px-4 border-b-4 border-black bg-white flex items-center justify-between shrink-0 z-40">
                <div className="flex items-center gap-2">
                    <Code2 size={16} className="text-[#FF3366]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Code Engine <span className="text-gray-300 mx-2">|</span> {selectedFile?.name || 'No file selected'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-black p-0.5 border-2 border-black">
                        <button
                            onClick={() => setViewMode('code')}
                            className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${viewMode === 'code' ? 'bg-[#FFD700] text-black' : 'text-white hover:text-[#00F0FF]'}`}
                        >
                            Code
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${viewMode === 'preview' ? 'bg-[#FF3366] text-white' : 'text-white hover:text-[#00F0FF]'}`}
                        >
                            Preview
                        </button>
                    </div>
                    <button
                        onClick={handleDownloadZip}
                        className="p-1 border-2 border-black bg-[#33FF66] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        title="Download ZIP"
                    >
                        <Download size={14} />
                    </button>

                    {/* Run Live / Sandbox Deploy Button */}
                    <button
                        onClick={handleSaveToCloud}
                        disabled={isSaving || localFiles.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-[#FFD700] text-black text-[9px] font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                        title="Save changes to cloud"
                    >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} strokeWidth={3} />} Save to Cloud
                    </button>
                    {(window.forceS3Pull && deployState === 'idle') && (
                        <button
                            onClick={() => window.forceS3Pull()}
                            className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-white text-black text-[9px] font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            title="Pull latest from S3"
                        >
                            <Download size={12} strokeWidth={3} /> Pull from S3
                        </button>
                    )}
                    {deployState === 'idle' && (
                        <button
                            onClick={handleDeploySandbox}
                            disabled={!jobId || generationStatus}
                            className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-[#FF3366] text-white text-[9px] font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Deploy to cloud sandbox"
                        >
                            <Zap size={12} strokeWidth={3} /> Run Live
                        </button>
                    )}
                    {deployState === 'deploying' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-[#FFD700] text-black text-[9px] font-black uppercase">
                            <Loader2 size={12} className="animate-spin" /> Deploying...
                        </div>
                    )}
                    {deployState === 'running' && sandboxUrl && (
                        <div className="flex items-center gap-1">
                            <a
                                href={sandboxUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-[#33FF66] text-black text-[9px] font-black uppercase hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all no-underline"
                                title="Open live sandbox"
                            >
                                <Globe size={12} strokeWidth={3} /> Live
                                <ExternalLink size={10} />
                            </a>
                            <button
                                onClick={handleStopSandbox}
                                className="p-1 border-2 border-black bg-[#FF3366] text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                title="Stop sandbox"
                            >
                                <Square size={12} fill="white" />
                            </button>
                        </div>
                    )}
                    {deployState === 'stopping' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-gray-200 text-black text-[9px] font-black uppercase">
                            <Loader2 size={12} className="animate-spin" /> Stopping...
                        </div>
                    )}
                    {deployState === 'error' && (
                        <button
                            onClick={handleDeploySandbox}
                            className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-red-100 text-red-600 text-[9px] font-black uppercase hover:bg-red-200 transition-all"
                            title={deployError || 'Retry deploy'}
                        >
                            <Zap size={12} strokeWidth={3} /> Retry
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full flex overflow-hidden">
                {/* 1. ACTIVITY BAR (VS Code Style) */}
                <div className="w-14 bg-gray-100 border-r-2 border-black flex flex-col items-center py-4 gap-4 shrink-0 z-30">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('back-to-canvas'))}
                        className="p-2 text-gray-400 hover:text-black hover:bg-white hover:border-2 hover:border-black transition-all mb-2"
                        title="Back to Workspace"
                    >
                        <ChevronLeft size={24} strokeWidth={3} />
                    </button>
                    <div className="w-8 h-[2px] bg-black/10 mb-2" />
                    <button
                        onClick={() => setActiveTab('explorer')}
                        className={`p-2 transition-all ${activeTab === 'explorer' ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : 'text-gray-400 hover:text-black'}`}
                    >
                        <FolderOpen size={20} />
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`p-2 transition-all ${activeTab === 'search' ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : 'text-gray-400 hover:text-black'}`}
                    >
                        <Search size={20} />
                    </button>
                    <div className="flex-1" />
                    <button className="p-2 text-gray-400 hover:text-black">
                        <Settings size={20} />
                    </button>
                </div>

                {/* 2. SIDEBAR (Resizable) */}
                <div
                    className="border-r-4 border-black bg-white flex flex-col shrink-0 overflow-hidden relative"
                    style={{ width: `${sidebarWidth}px` }}
                >
                    <div className="px-4 py-3 border-b-2 border-black bg-gray-50 flex items-center justify-between shrink-0">
                        <span className="text-[11px] font-black text-black uppercase tracking-tighter">
                            {activeTab}
                        </span>
                        <span className="p-1 bg-black text-white text-[9px] font-black px-1.5 border border-black">
                            {fileCount}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
                        {activeTab === 'explorer' && normalized && (
                            <FileTreeItem
                                item={normalized}
                                onSelect={setSelectedFile}
                                selectedFile={selectedFile}
                            />
                        )}
                        {activeTab === 'explorer' && !normalized && generationStatus && (
                            <div className="p-6 flex flex-col items-center justify-center text-gray-400">
                                <Loader2 size={24} className="animate-spin mb-2 text-[#FF3366]" />
                                <span className="text-[10px] font-black uppercase tracking-tighter text-[#FF3366]">Generating...</span>
                            </div>
                        )}
                        {activeTab === 'explorer' && !normalized && !generationStatus && (
                            <div className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                                No Files Yet!
                            </div>
                        )}
                        {activeTab === 'search' && (
                            <div className="p-4 text-[10px] font-bold text-gray-400 italic">Global search coming soon...</div>
                        )}
                    </div>

                    {/* Resize Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#00F0FF] transition-colors z-50"
                    />
                </div>

                {/* 3. MAIN EDITOR AREA */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
                    {/* Mode Logic */}
                    {viewMode === 'code' ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Tabs */}
                            <div className="h-10 bg-gray-100 border-b-2 border-black flex items-center px-0 overflow-x-auto scrollbar-hide shrink-0">
                                {selectedFile && (
                                    <div className="h-full px-4 border-r-2 border-black bg-white flex items-center gap-2 group relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-[#FF3366]" />
                                        <span className="shrink-0">{selectedFile.icon}</span>
                                        <span className="text-[11px] font-black uppercase truncate max-w-[150px]">{selectedFile.name}</span>
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="hover:bg-gray-200 p-0.5 rounded transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editor */}
                            <div className="flex-1 w-full relative overflow-hidden">
                                {selectedFile ? (
                                    <Editor
                                        height="100%"
                                        width="100%"
                                        language={getLanguage(selectedFile.name)}
                                        value={formatContent(selectedFile)}
                                        theme="vs"
                                        onChange={handleEditorChange}
                                        options={{
                                            fontSize: 14,
                                            minimap: { enabled: true },
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                                            fontWeight: '600',
                                            padding: { top: 20 },
                                            renderLineHighlight: 'all',
                                            cursorBlinking: 'smooth',
                                            cursorSmoothCaretAnimation: 'on',
                                            smoothScrolling: true,
                                        }}
                                    />
                                ) : generationStatus ? (
                                    <div className="h-full flex flex-col items-center justify-center bg-[#fafafa]">
                                        <Loader2 size={48} className="mb-4 text-[#FF3366] animate-spin" />
                                        <h2 className="font-black text-xl uppercase tracking-widest text-[#FF3366]">{generationStatus}</h2>
                                        <p className="font-bold text-xs text-gray-500 mt-2 uppercase tracking-tighter">Please wait while the AI writes your code...</p>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 bg-[#fafafa]">
                                        <Code2 size={64} className="mb-4 opacity-10" />
                                        <p className="font-black text-xs uppercase tracking-widest opacity-30 italic text-center">Select a file to start coding<br />or generate a new project!</p>
                                    </div>
                                )}
                            </div>

                            {/* 4. TERMINAL (Collapsible) */}
                            <div className={`border-t-4 border-black bg-white transition-all duration-300 flex flex-col shrink-0 ${isTerminalOpen ? 'h-64' : 'h-10'}`}>
                                <div
                                    className="h-10 px-4 flex items-center justify-between border-b-2 border-black bg-gray-50 cursor-pointer hover:bg-gray-100 shrink-0"
                                    onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isTerminalOpen ? 'text-black' : 'text-gray-400'}`}>Terminal</span>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Output</span>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Issues</span>
                                    </div>
                                    <button className="p-1 hover:bg-gray-200">
                                        {isTerminalOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                </div>
                                {isTerminalOpen && (
                                    <div className="flex-1 bg-black p-4 text-[#33FF66] text-xs font-mono overflow-y-auto overflow-x-hidden">
                                        <div className="flex gap-2 mb-1">
                                            <span className="text-[#00F0FF]">$</span>
                                            <span>npm install successful...</span>
                                        </div>
                                        <div className="flex gap-2 mb-1">
                                            <span className="text-[#00F0FF]">$</span>
                                            <span>Building project assets...</span>
                                        </div>
                                        <div className="flex gap-2 mb-1">
                                            <span className="text-[#00F0FF]">$</span>
                                            <span className="animate-pulse">_</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Preview Mode */
                        <div className="flex-1 bg-white relative group">
                            <iframe
                                title="Preview"
                                srcDoc={getPreviewHtml()}
                                className="w-full h-full border-none"
                                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="h-6 bg-black text-[#FFD700] flex items-center px-4 justify-between shrink-0 z-50">
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#33FF66]" /> Connected</span>
                    <span>Line 1, Col 1</span>
                    <span>UTF-8</span>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
                    {deployState === 'running' && sandboxUrl ? (
                        <span className="text-[#33FF66] flex items-center gap-1 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#33FF66]" /> Sandbox Live
                        </span>
                    ) : deployState === 'deploying' ? (
                        <span className="text-[#FFD700] flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" /> Deploying Sandbox...
                        </span>
                    ) : (
                        <span className="text-[#00F0FF]">Sandbox Ready</span>
                    )}
                    <span>Prettier: ✅</span>
                </div>
            </div>
        </div>
    );
};

export default EditorPanel;
