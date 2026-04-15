import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Activity, ShieldCheck, Cpu, PanelLeftOpen } from 'lucide-react';

import StackSelector from './StackSelector';
import DiagnosticTest from './DiagnosticTest';
import ModuleRoadmap from './ModuleRoadmap';
import LearningRoom from './LearningRoom';
import VibeCheck from './VibeCheck';
import LearningSidebar from './LearningSidebar';
import MissionHistory from './MissionHistory';
import DebugLab from './DebugLab';
import AnalyzerPanel from './AnalyzerPanel';
import ProfilePage from './ProfilePage';

import { STACKS } from '../constants/stacks.jsx';

const PROJECTS_STORAGE_KEY = 'wirestack_learning_projects_v1';

function createProject({ name, stack, diagnosticLevel }) {
    return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        stack,
        diagnosticLevel: diagnosticLevel || null,
        createdAt: Date.now(),
    };
}

/**
 * LearnPage — The master orchestrator for the Anti-Vibe-Coding learning flow.
 */
export default function LearnPage() {
    const [phase, setPhase] = useState('stack_select');
    const [selectedStack, setSelectedStack] = useState(null);
    const [diagnosticLevel, setDiagnosticLevel] = useState(null);
    const [activeModule, setActiveModule] = useState(null);
    const [submittedCode, setSubmittedCode] = useState(null);
    const [user, setUser] = useState(null);
    const [isResetting, setIsResetting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [stackSelectMode, setStackSelectMode] = useState('initial');
    const [projectModal, setProjectModal] = useState(null);

    const getRequestedPhaseFromUrl = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const requested = params.get('phase');
            if (requested === 'analyzer' || requested === 'debug_lab' || requested === 'history' || requested === 'profile') {
                return requested;
            }
            return null;
        } catch {
            return null;
        }
    };

    // Check auth on mount
    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => {
                if (res.status === 401) {
                    window.location.href = '/login';
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return;
                
                if (data.authenticated) {
                    setUser(data.user);

                    const savedProjectsRaw = localStorage.getItem(PROJECTS_STORAGE_KEY);
                    let savedProjects = [];
                    if (savedProjectsRaw) {
                        try {
                            const parsed = JSON.parse(savedProjectsRaw);
                            if (Array.isArray(parsed)) savedProjects = parsed;
                        } catch {
                            savedProjects = [];
                        }
                    }

                    const baseStack = data.user.selectedStack || 'react';
                    const baseLevel = data.user.diagnosticLevel || null;

                    if (savedProjects.length === 0) {
                        savedProjects = [
                            createProject({
                                name: 'Project 1',
                                stack: baseStack,
                                diagnosticLevel: baseLevel,
                            }),
                        ];
                    }

                    const activeProject = savedProjects[0];
                    setProjects(savedProjects);
                    setActiveProjectId(activeProject.id);
                    setSelectedStack(activeProject.stack);
                    setDiagnosticLevel(activeProject.diagnosticLevel || null);
                    setPhase(activeProject.diagnosticLevel ? 'roadmap' : 'diagnostic');

                    const requestedPhase = getRequestedPhaseFromUrl();
                    if (requestedPhase) {
                        setPhase(requestedPhase);
                        const params = new URLSearchParams(window.location.search);
                        params.delete('phase');
                        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
                        window.history.replaceState({}, '', next);
                    }
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!Array.isArray(projects) || projects.length === 0) return;
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    }, [projects]);

    const activeProject = projects.find((project) => project.id === activeProjectId) || null;

    const updateActiveProject = (updater) => {
        if (!activeProjectId) return;
        setProjects((prev) => prev.map((project) => {
            if (project.id !== activeProjectId) return project;
            return typeof updater === 'function' ? updater(project) : { ...project, ...updater };
        }));
    };

    // ─── Phase handlers ──────────────────────────────────────
    const handleStackSelect = (stack) => {
        if (stackSelectMode === 'new_project') {
            const nextProject = createProject({
                name: `Project ${projects.length + 1}`,
                stack,
                diagnosticLevel: null,
            });
            setProjects((prev) => [nextProject, ...prev]);
            setActiveProjectId(nextProject.id);
            setSelectedStack(stack);
            setDiagnosticLevel(null);
            setStackSelectMode('initial');
            setPhase('diagnostic');
            return;
        }

        setSelectedStack(stack);
        updateActiveProject({ stack, diagnosticLevel: null });
        setDiagnosticLevel(null);
        setPhase('diagnostic');
    };

    const handleDiagnosticComplete = ({ score, total, level }) => {
        setDiagnosticLevel(level);
        updateActiveProject({ diagnosticLevel: level });
        setPhase('roadmap');
    };

    const handleDiagnosticSkip = () => {
        setDiagnosticLevel('Beginner');
        updateActiveProject({ diagnosticLevel: 'Beginner' });
        setPhase('roadmap');
    };

    const handleSelectModule = (module) => {
        setActiveModule(module);
        setSubmittedCode(null);
        setPhase('learning_room');
    };

    const handleCodeSubmit = (code) => {
        setSubmittedCode(code);
        setPhase('vibe_check');
    };

    const handleVibeCheckPass = () => {
        setActiveModule(null);
        setSubmittedCode(null);
        setPhase('roadmap');
    };

    const handleVibeCheckFail = () => {
        setSubmittedCode(null);
        setPhase('learning_room');
    };

    const handleNavigate = (targetPhase) => {
        // High-level Orchestration for stack selection from sidebar
        const isStackId = STACKS.some(s => s.id === targetPhase);
        
        if (isStackId) {
             const stackName = STACKS.find(s => s.id === targetPhase)?.title || targetPhase;
             if (window.confirm(`Deploy to ${stackName} mission? Current Intel will be archived.`)) {
                setIsResetting(true);
                fetch('/api/v1/mission/reset', { method: 'POST', credentials: 'include' })
                    .then(res => res.json())
                    .then(() => {
                        updateActiveProject({ stack: targetPhase, diagnosticLevel: null });
                        setStackSelectMode('initial');
                        handleStackSelect(targetPhase);
                    })
                    .catch(console.error)
                    .finally(() => setIsResetting(false));
             }
             return;
        }

        if (targetPhase === 'roadmap') {
            setActiveModule(null);
            setPhase('roadmap');
        } else if (targetPhase === 'diagnostic') {
            setPhase('diagnostic');
        } else if (targetPhase === 'history') {
            setPhase('history');
        } else if (targetPhase === 'debug_lab') {
            setPhase('debug_lab');
        } else if (targetPhase === 'analyzer') {
            setPhase('analyzer');
        } else if (targetPhase === 'profile') {
            setPhase('profile');
        } else if (targetPhase === 'new_mission') {
            // Call backend to reset/archive current mission
            if (window.confirm('Archive current mission and start a new one?')) {
                setIsResetting(true);
                fetch('/api/v1/mission/reset', { method: 'POST', credentials: 'include' })
                    .then(res => res.json())
                    .then(() => {
                        setSelectedStack(null);
                        setDiagnosticLevel(null);
                        setStackSelectMode('initial');
                        setPhase('stack_select');
                    })
                    .catch(console.error)
                    .finally(() => setIsResetting(false));
            }
        } else if (targetPhase === 'new_project') {
            setStackSelectMode('new_project');
            setPhase('stack_select');
        }
    };

    const handleProjectSelect = (projectId) => {
        const project = projects.find((item) => item.id === projectId);
        if (!project) return;

        setActiveProjectId(project.id);
        setSelectedStack(project.stack);
        setDiagnosticLevel(project.diagnosticLevel || null);
        setActiveModule(null);
        setSubmittedCode(null);
        setPhase(project.diagnosticLevel ? 'roadmap' : 'diagnostic');
    };

    const handleProjectDelete = (projectId) => {
        const target = projects.find((item) => item.id === projectId);
        if (!target) return;

        if (projects.length <= 1) {
            setProjectModal({
                mode: 'info',
                title: 'Cannot Delete Last Project',
                message: 'At least one project is required. Create a new project before deleting this one.',
            });
            return;
        }

        setProjectModal({
            mode: 'confirm',
            title: `Delete ${target.name}?`,
            message: 'This removes local project progress for this project.',
            projectId,
        });
    };

    const confirmProjectDelete = () => {
        const projectId = projectModal?.projectId;
        if (!projectId) {
            setProjectModal(null);
            return;
        }

        const remaining = projects.filter((item) => item.id !== projectId);
        setProjects(remaining);

        if (projectId === activeProjectId) {
            const next = remaining[0];
            if (!next) return;
            setActiveProjectId(next.id);
            setSelectedStack(next.stack);
            setDiagnosticLevel(next.diagnosticLevel || null);
            setActiveModule(null);
            setSubmittedCode(null);
            setPhase(next.diagnosticLevel ? 'roadmap' : 'diagnostic');
        }

        setProjectModal(null);
    };

    // ─── Render current phase content ────────────────────────
    const renderContent = () => {
        if (isResetting) {
            return (
                <div className="flex flex-col items-center justify-center h-full py-20 px-10 border-[6px] border-dashed border-black/10 bg-white">
                    <motion.div
                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="p-8 border-4 border-black bg-[#FFE145] mb-10 shadow-[6px_6px_0px_#000]"
                    >
                        <Cpu size={48} strokeWidth={3} />
                    </motion.div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic mb-4">SYNCING_MISSION_ARCHIVES</h3>
                    <p className="text-[10px] font-black uppercase text-black/30 tracking-[0.5em] animate-pulse">Initializing Tactical Handshake // Awaiting Protocol 0.2.1</p>
                </div>
            );
        }

        switch (phase) {
            case 'stack_select':
                return (
                    <StackSelector
                        onSelect={handleStackSelect}
                        modeLabel={stackSelectMode === 'new_project' ? 'PROJECT_CREATION_MODE' : 'MISSION_PHASE_01::SPECIALIZATION'}
                    />
                );
            case 'diagnostic':
                return (
                    <DiagnosticTest
                        stack={selectedStack}
                        onComplete={handleDiagnosticComplete}
                        onSkip={handleDiagnosticSkip}
                    />
                );
            case 'roadmap':
                return (
                    <ModuleRoadmap
                        stack={selectedStack}
                        level={diagnosticLevel}
                        onSelectModule={handleSelectModule}
                        onBack={() => setPhase('stack_select')}
                    />
                );
            case 'learning_room':
                return (
                    <LearningRoom
                        module={activeModule}
                        onSubmitCode={handleCodeSubmit}
                        onBack={() => setPhase('roadmap')}
                    />
                );
            case 'vibe_check':
                return (
                    <VibeCheck
                        module={activeModule}
                        submittedCode={submittedCode}
                        onPass={handleVibeCheckPass}
                        onFail={handleVibeCheckFail}
                        onBack={() => setPhase('learning_room')}
                    />
                );
            case 'history':
                return (
                    <MissionHistory 
                        onBack={() => setPhase('roadmap')} 
                    />
                );
            case 'debug_lab':
                return (
                    <DebugLab
                        selectedStack={selectedStack}
                        userLevel={diagnosticLevel || user?.diagnosticLevel || 'Beginner'}
                    />
                );
            case 'analyzer':
                return (
                    <AnalyzerPanel
                        selectedStack={selectedStack}
                    />
                );
            case 'profile':
                return (
                    <ProfilePage
                        user={user}
                    />
                );
            default:
                return <StackSelector onSelect={handleStackSelect} />;
        }
    };

    // If we're in the stack selection phase AND user hasn't picked a stack yet,
    // we show the full-screen selector without a sidebar for maximum focus.
    // Once a stack is picked, the sidebar appears for the rest of the mission.
    if (phase === 'stack_select') {
        return (
            <StackSelector
                onSelect={handleStackSelect}
                modeLabel={stackSelectMode === 'new_project' ? 'PROJECT_CREATION_MODE' : 'MISSION_PHASE_01::SPECIALIZATION'}
            />
        );
    }

    return (
        <div className="flex h-dvh min-h-dvh max-h-dvh bg-[#FFFFF0] font-mono overflow-hidden">
            {/* Mission Control Sidebar */}
            {sidebarOpen && (
                <LearningSidebar 
                    user={user} 
                    activePhase={phase} 
                    onNavigate={handleNavigate}
                    onCloseSidebar={() => setSidebarOpen(false)}
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onProjectSelect={handleProjectSelect}
                    onProjectDelete={handleProjectDelete}
                />
            )}

            {/* Main Mission Area */}
            <main className="flex-1 h-dvh min-h-dvh max-h-dvh overflow-y-auto relative custom-scrollbar">
                {!sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="absolute top-4 left-4 z-20 px-4 py-2 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFE145] font-black text-xs uppercase tracking-wider flex items-center gap-2"
                    >
                        <PanelLeftOpen size={16} strokeWidth={3} /> Open Sidebar
                    </button>
                )}
                {/* Decorative background grid */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.02]"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '16px 16px' }}
                />

                <div className="relative z-10 max-w-6xl mx-auto py-12 px-8">
                    {renderContent()}
                </div>
            </main>

            {projectModal && (
                <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                        <div className="px-5 py-4 border-b-4 border-black bg-[#FFE145]">
                            <h3 className="text-lg font-black uppercase tracking-tight">{projectModal.title}</h3>
                        </div>
                        <div className="px-5 py-5">
                            <p className="text-sm font-bold text-black/80 leading-relaxed">{projectModal.message}</p>
                        </div>
                        <div className="px-5 pb-5 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setProjectModal(null)}
                                className="px-4 py-2 border-4 border-black bg-white font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {projectModal.mode === 'confirm' ? 'Cancel' : 'OK'}
                            </button>
                            {projectModal.mode === 'confirm' && (
                                <button
                                    onClick={confirmProjectDelete}
                                    className="px-4 py-2 border-4 border-black bg-[#FF6B6B] text-white font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    Delete Project
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
