import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { BookOpen, Code2, Send, ArrowLeft, Lightbulb, AlertTriangle, Zap, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export default function LearningRoom({ module, onSubmitCode, onBack }) {
    const [code, setCode] = useState(module?.starterCode || '// Write your code here\n');
    const [showHint, setShowHint] = useState(false);
    const [conceptExpanded, setConceptExpanded] = useState(true);
    const editorRef = useRef(null);

    const conceptSections = generateConceptContent(module);

    const handleEditorMount = (editor) => {
        editorRef.current = editor;
        editor.focus();
    };

    const handleSubmit = () => {
        const currentCode = editorRef.current?.getValue() || code;
        if (currentCode.trim().length < 20) {
            alert('Write at least 20 characters of meaningful code.');
            return;
        }
        onSubmitCode(currentCode);
    };

    if (!module) return null;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col font-mono bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Concept Panel */}
                <div className="w-[420px] shrink-0 border-r-4 border-black bg-gray-50 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b-4 border-black bg-[#FFD700] shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen size={20} />
                                <h3 className="font-black text-sm uppercase">Conceptual Intel</h3>
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase mt-1 opacity-70">Target: {module.concept}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {conceptSections.map((section, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                {section.type === 'heading' && (
                                    <h4 className="font-black text-sm uppercase flex items-center gap-2 mb-3 text-[#FF3366]">
                                        <Zap size={14} fill="currentColor" /> {section.content}
                                    </h4>
                                )}
                                {section.type === 'text' && (
                                    <p className="text-xs font-bold leading-relaxed text-gray-700">
                                        {section.content}
                                    </p>
                                )}
                                {section.type === 'important' && (
                                    <div className="bg-white border-3 border-black p-3 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex gap-2">
                                        <Sparkles size={14} className="shrink-0 mt-0.5 text-[#00F0FF]" />
                                        <span>{section.content}</span>
                                    </div>
                                )}
                                {section.type === 'warning' && (
                                    <div className="bg-[#FF3366] text-white border-3 border-black p-3 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex gap-2">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>{section.content}</span>
                                    </div>
                                )}
                                {section.type === 'code' && (
                                    <pre className="bg-black text-[#33FF66] border-2 border-black p-4 text-[10px] overflow-x-auto font-mono">
                                        {section.content}
                                    </pre>
                                )}
                            </motion.div>
                        ))}

                        <div className="pt-6 border-t-2 border-dashed border-gray-300">
                            <button
                                onClick={() => setShowHint(!showHint)}
                                className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors text-[10px] font-black uppercase"
                            >
                                <Lightbulb size={14} /> {showHint ? 'HIDE INTEL' : 'REQUEST HINT?'}
                            </button>
                            <AnimatePresence>
                                {showHint && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <p className="p-3 bg-white border-2 border-black mt-2 text-[10px] font-bold text-gray-500 italic">
                                            {module.challenge_hint || `Deep dive into ${module.concept} fundamentals.`}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Editor Area */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    {/* Challenge Header */}
                    <div className="px-6 py-4 border-b-4 border-black bg-[#00F0FF]">
                        <h3 className="font-black text-xs uppercase flex items-center gap-2">
                            <Code2 size={16} /> Mission Objective:
                        </h3>
                        <p className="text-[11px] font-bold mt-2 leading-relaxed text-black/80">{module.challenge}</p>
                    </div>

                    {/* Editor header */}
                    <div className="px-4 py-2 border-b-2 border-black bg-gray-50 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                            MONACO SOURCE EDITOR (AUTO-COMPLETE DISABLED)
                        </span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 rounded-full border border-black bg-white" />)}
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            defaultValue={module.starterCode || '// Write your code here\n'}
                            theme="light"
                            onMount={handleEditorMount}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                tabSize: 2,
                                wordWrap: 'on',
                                suggestOnTriggerCharacters: false,
                                quickSuggestions: false,
                                parameterHints: { enabled: false },
                                padding: { top: 20, bottom: 20 },
                                renderLineHighlight: 'none',
                                hideCursorInOverviewRuler: true,
                                overviewRulerBorder: false,
                            }}
                        />
                    </div>

                    {/* Submit Footer */}
                    <div className="px-6 py-4 border-t-4 border-black bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase">
                            <AlertTriangle size={12} fill="#FF3366" stroke="white" /> Vibe-Coding Detection Active
                        </div>
                        <button
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-[#33FF66] border-4 border-black font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all flex items-center gap-3"
                        >
                            <Send size={18} /> INITIATE VIBE CHECK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function generateConceptContent(module) {
    if (!module) return [];
    const concept = module.concept || 'Programming';
    return [
        { type: 'heading', content: `Core Intel: ${concept}` },
        { type: 'text', content: module.description || `Module decrypting the fundamentals of ${concept}.` },
        { type: 'important', content: `Understanding the WHY is mandatory for this mission.` },
        { type: 'heading', content: 'Operational Mechanics' },
        { type: 'text', content: `When executing ${concept}, the system handles resources in a specific sequence. Visualizing this flow is key to debugging.` },
        { type: 'warning', content: `Relying on "Vibe" leads to critical failure during code deployment.` },
    ];
}
