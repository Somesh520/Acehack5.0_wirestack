import { useState, useEffect } from 'react';
import { FolderOpen, File, ChevronRight, ChevronDown, Code2, FileJson, FileText, Sparkles, Download, Loader2 } from 'lucide-react';

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
        <div>
            <button
                onClick={() => {
                    if (isFolder) setIsOpen(!isOpen);
                    else if (onSelect) onSelect(item);
                }}
                className={`w-full flex items-center gap-1.5 py-1.5 px-2 text-[11px] font-bold hover:bg-gray-100/10 transition-colors ${isSelected ? 'bg-[#FFD700]/30 border-l-4 border-[#FFD700]' : ''}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {isFolder ? (
                    <>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <FolderOpen size={14} className="text-[#FFA500]" />
                    </>
                ) : (
                    <>
                        <span className="w-3" />
                        {item.icon || <File size={14} className="text-gray-400" />}
                    </>
                )}
                <span className="truncate">{item.name}</span>
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


const EditorPanel = ({ files, generationStatus }) => {
    // First build a nested tree from flat paths, then normalize with icons
    const nestedTree = (files && files.children) ? buildNestedTree(files.children) : null;
    const normalized = nestedTree ? normalizeTree({ ...nestedTree, name: files.name || 'project' }) : null;
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadZip = async () => {
        if (!files || !files.children || files.children.length === 0) return;
        setIsDownloading(true);

        // Send the ORIGINAL flat files array (with paths like "frontend/src/App.jsx") to the backend
        // The backend ZIP handler will create proper folders from these paths
        const safeFiles = files.children.map(({ name, content }) => ({ name, content }));

        try {
            const response = await fetch('/api/ai/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: safeFiles }),
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

    // Auto-select the latest file when a new one arrives
    useEffect(() => {
        if (normalized?.children?.length > 0) {
            const lastChild = normalized.children[normalized.children.length - 1];
            if (lastChild && lastChild.type !== 'folder') {
                setSelectedFile(lastChild);
            }
        }
    }, [files]);

    const formatContent = (file) => {
        if (!file || !file.content) return '';
        let content = file.content;

        // If it's a JSON file, try to pretty-print it
        if (file.name?.endsWith('.json')) {
            try {
                // Determine if it tells us it's parsed or a string
                const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                content = JSON.stringify(parsed, null, 2);
            } catch {
                // If it fails, just show the string
                content = String(content);
            }
        }

        // Ensure newlines are properly respected (LLM sometimes escapes them as \\n instead of \n)
        return String(content).replace(/\\n/g, '\n');
    };

    const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'

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
        <div className="h-full flex flex-col border-l-4 border-black bg-[#1a1a2e] text-white font-mono overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b-4 border-black bg-[#16213e] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#00F0FF]" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-[#00F0FF]">Editor</h3>
                    {fileCount > 0 && (
                        <span className="text-[9px] bg-[#33FF66] text-black px-1.5 py-0.5 font-black">{fileCount} files</span>
                    )}
                </div>

                {normalized && (
                    <div className="flex items-center gap-3">
                        <div className="flex bg-black p-1 rounded-sm border border-gray-600">
                            <button
                                onClick={() => setViewMode('code')}
                                className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${viewMode === 'code' ? 'bg-[#FFD700] text-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
                            >
                                Code
                            </button>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${viewMode === 'preview' ? 'bg-[#FF3366] text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
                            >
                                Preview
                            </button>
                        </div>
                        <button
                            onClick={handleDownloadZip}
                            disabled={isDownloading}
                            title="Download project as ZIP"
                            className="bg-[#33FF66] text-black p-1.5 border border-black hover:bg-[#FFD700] transition-colors disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                    </div>
                )}
            </div>

            {normalized ? (
                viewMode === 'code' ? (
                    <>
                        {/* File Tree */}
                        <div className="border-b-2 border-gray-700 bg-[#0f0f23] max-h-[200px] overflow-y-auto shrink-0">
                            <div className="py-1">
                                <FileTreeItem
                                    item={normalized}
                                    onSelect={setSelectedFile}
                                    selectedFile={selectedFile}
                                />
                            </div>
                        </div>

                        {/* Code Viewer */}
                        <div className="flex-1 overflow-auto">
                            {selectedFile ? (
                                <div className="p-0">
                                    {/* File Tab */}
                                    <div className="sticky top-0 bg-[#16213e] border-b border-gray-700 px-4 py-2 flex items-center gap-2">
                                        {selectedFile.icon || <File size={12} />}
                                        <span className="text-[11px] font-bold text-gray-300">{selectedFile.name}</span>
                                    </div>
                                    {/* Code Lines */}
                                    <div className="text-[11px] leading-relaxed">
                                        {lineNumbers(formatContent(selectedFile)).map((line, i) => (
                                            <div key={i} className="flex hover:bg-white/5 transition-colors">
                                                <span className="w-10 text-right px-2 text-gray-600 select-none shrink-0 border-r border-gray-800">
                                                    {i + 1}
                                                </span>
                                                <pre className="px-4 whitespace-pre-wrap break-all flex-1">
                                                    <code>{line || ' '}</code>
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 p-6">
                                    <Code2 size={40} className="opacity-30" />
                                    <p className="text-xs font-bold text-center uppercase">Select a file to preview</p>
                                    <p className="text-[10px] text-gray-600 text-center">
                                        Click any file in the tree above
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Preview Mode */
                    <div className="flex-1 bg-white relative group">
                        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => {
                                    const html = getPreviewHtml();
                                    const blob = new Blob([html], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                    // Cleanup url after a short delay
                                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                                }}
                                className="px-4 py-2 bg-black text-white font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(255,215,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all border-2 border-[#FFD700]"
                            >
                                ↗ Open in New Tab
                            </button>
                        </div>
                        <iframe
                            title="Preview"
                            srcDoc={getPreviewHtml()}
                            className="w-full h-full border-none bg-white"
                            sandbox="allow-scripts allow-modals"
                        />
                    </div>
                )

            ) : (
                /* Waiting for code generation */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                    <Sparkles size={40} className="text-gray-700" />
                    <p className="text-xs font-bold text-gray-500 uppercase text-center">
                        Waiting for Code
                    </p>
                    {generationStatus && (
                        <p className="text-[11px] font-bold text-[#FFD700] text-center bg-black/50 px-4 py-2 border border-gray-600 animate-pulse">
                            {generationStatus}
                        </p>
                    )}
                    <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                        Select your stack in the wizard and click &quot;Generate Code&quot; — your project files will appear here!
                    </p>
                </div>
            )}
        </div>
    );
};

export default EditorPanel;
