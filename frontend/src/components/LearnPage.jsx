import { useState, useEffect } from 'react';
import StackSelector from './StackSelector';
import DiagnosticTest from './DiagnosticTest';
import ModuleRoadmap from './ModuleRoadmap';
import LearningRoom from './LearningRoom';
import VibeCheck from './VibeCheck';
import LearningSidebar from './LearningSidebar';
import MissionHistory from './MissionHistory';

import { STACKS } from '../constants/stacks.jsx';

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

    // Check auth on mount
    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    setUser(data.user);
                    if (data.user.selectedStack && data.user.diagnosticLevel) {
                        setSelectedStack(data.user.selectedStack);
                        setDiagnosticLevel(data.user.diagnosticLevel);
                        setPhase('roadmap');
                    }
                }
            })
            .catch(console.error);
    }, []);

    // ─── Phase handlers ──────────────────────────────────────
    const handleStackSelect = (stack) => {
        setSelectedStack(stack);
        setPhase('diagnostic');
    };

    const handleDiagnosticComplete = ({ score, total, level }) => {
        setDiagnosticLevel(level);
        setPhase('roadmap');
    };

    const handleDiagnosticSkip = () => {
        setDiagnosticLevel('Beginner');
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
                fetch('/api/v1/mission/reset', { method: 'POST', credentials: 'include' })
                    .then(res => res.json())
                    .then(() => {
                        handleStackSelect(targetPhase);
                    })
                    .catch(console.error);
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
        } else if (targetPhase === 'new_mission') {
            // Call backend to reset/archive current mission
            if (window.confirm('Archive current mission and start a new one?')) {
                fetch('/api/v1/mission/reset', { method: 'POST', credentials: 'include' })
                    .then(res => res.json())
                    .then(() => {
                        setSelectedStack(null);
                        setDiagnosticLevel(null);
                        setPhase('stack_select');
                    })
                    .catch(console.error);
            }
        }
    };

    // ─── Render current phase content ────────────────────────
    const renderContent = () => {
        switch (phase) {
            case 'stack_select':
                return <StackSelector onSelect={handleStackSelect} />;
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
            default:
                return <StackSelector onSelect={handleStackSelect} />;
        }
    };

    // If we're in the stack selection phase AND user hasn't picked a stack yet,
    // we show the full-screen selector without a sidebar for maximum focus.
    // Once a stack is picked, the sidebar appears for the rest of the mission.
    if (phase === 'stack_select') {
        return <StackSelector onSelect={handleStackSelect} />;
    }

    return (
        <div className="flex h-screen bg-[#FFFFF0] font-mono overflow-hidden">
            {/* Mission Control Sidebar */}
            <LearningSidebar 
                user={user} 
                activePhase={phase} 
                onNavigate={handleNavigate} 
            />

            {/* Main Mission Area */}
            <main className="flex-1 h-screen overflow-y-auto relative custom-scrollbar">
                {/* Decorative background grid */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.02]"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '16px 16px' }}
                />

                <div className="relative z-10 max-w-6xl mx-auto py-12 px-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
