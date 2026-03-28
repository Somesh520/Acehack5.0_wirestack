import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Sparkles, Download, Code2, ExternalLink } from 'lucide-react';
import EditorPanel from './EditorPanel';

const ProjectView = ({ embeddedJobId, onClose }) => {
    const { jobId: routeJobId } = useParams();
    const jobId = embeddedJobId || routeJobId;
    const navigate = useNavigate();
    const [files, setFiles] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, generating, completed, error
    const [progress, setProgress] = useState(0);
    const [currentFile, setCurrentFile] = useState(null);
    const [error, setError] = useState(null);
    const [agentStep, setAgentStep] = useState('Agent booting');
    const initializedRef = useRef(false);
    const requestInFlightRef = useRef(false);

    useEffect(() => {
        let pollTimer = null;

        // React StrictMode mounts twice in dev. Ensure a single poll loop.
        if (initializedRef.current) {
            return undefined;
        }
        initializedRef.current = true;

        const checkStatus = async () => {
            if (requestInFlightRef.current) return;
            requestInFlightRef.current = true;

            try {
                const res = await fetch(`/api/ai/job-status/${jobId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch project status');

                const data = await res.json();
                if (data.currentStep) setAgentStep(data.currentStep);

                if (data.files && data.files.length > 0) {
                    // Wrap flat files into the tree format EditorPanel expects
                    setFiles({
                        name: 'wirestack-generated-project',
                        children: data.files
                    });

                    // Set current file as the last one in the array
                    const lastFile = data.files[data.files.length - 1];
                    if (lastFile) setCurrentFile(lastFile.name);
                }

                setProgress(data.progress || 0);

                if (data.state === 'completed') {
                    setStatus('completed');
                    const finalFiles = data.result?.files || data.files;
                    setFiles({
                        name: 'wirestack-generated-project',
                        children: finalFiles
                    });
                    clearInterval(pollTimer);
                } else if (data.state === 'failed') {
                    setStatus('error');
                    setError(data.failedReason || 'Generation failed');
                    clearInterval(pollTimer);
                } else {
                    setStatus('generating');
                }
            } catch (err) {
                console.error('Polling error:', err);
                setError(err.message);
                setStatus('error');
                clearInterval(pollTimer);
            } finally {
                requestInFlightRef.current = false;
            }
        };

        checkStatus();
        pollTimer = setInterval(checkStatus, 4000);

        return () => {
            if (pollTimer) clearInterval(pollTimer);
            initializedRef.current = false;
            requestInFlightRef.current = false;
        };
    }, [jobId]);

    const handleDownloadZip = async () => {
        if (!files) return;
        try {
            const res = await fetch('/api/ai/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files }),
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wirestack-project-${jobId.substring(0, 6)}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    useEffect(() => {
        const handleBack = () => {
            if (onClose) onClose();
            else navigate('/canvas');
        };
        window.addEventListener('back-to-canvas', handleBack);
        return () => window.removeEventListener('back-to-canvas', handleBack);
    }, [navigate, onClose]);

    return (
        <div className="flex flex-col h-screen w-full bg-[#fafafa] font-mono overflow-hidden">
            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col relative">
                {status === 'loading' && !files ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-50">
                        <Loader2 className="w-12 h-12 animate-spin text-[#FF3366] mb-4" />
                        <h2 className="font-black text-2xl uppercase">Initializing Editor...</h2>
                    </div>
                ) : null}

                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50 p-8 text-center">
                        <div className="w-20 h-20 bg-[#FF3366] border-4 border-black flex items-center justify-center text-white mb-6 rotate-3">
                            <span className="text-4xl font-black">!</span>
                        </div>
                        <h2 className="font-black text-3xl uppercase mb-2">Generation Failed</h2>
                        <p className="font-bold text-gray-500 mb-8 max-w-md">{error}</p>
                        <button
                            onClick={() => {
                                if (onClose) onClose();
                                else navigate('/canvas');
                            }}
                            className="px-8 py-3 border-4 border-black bg-[#FFD700] font-black text-lg uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            Back to Workspace
                        </button>
                    </div>
                )}

                {/* The Editor Panel */}
                <div className="flex-1 flex overflow-hidden">
                    <EditorPanel files={files || []} generationStatus={status === 'generating' ? `Agent: ${agentStep} • ${progress}%` : null} jobId={jobId} />
                </div>
            </main>

            {/* Progress Bar (at bottom) */}
            {status === 'generating' && (
                <div className="h-2 bg-black w-full overflow-hidden shrink-0">
                    <div
                        className="h-full bg-[#00F0FF] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default ProjectView;
