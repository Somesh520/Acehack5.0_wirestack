import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Zap } from 'lucide-react';

const AIChatPanel = ({ onSuggestSystemDesign, messages = [], setMessages = () => { } }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const parseSystemDesign = (text) => {
        const match = text.match(/```system_design\s*\n?([\s\S]*?)```/);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const cleanMessage = (text) => {
        return text.replace(/```system_design[\s\S]*?```/g, '').trim();
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, history }),
                credentials: 'include'
            });

            const data = await res.json();
            const reply = data.reply || 'Oops! Something went wrong.';
            const thoughtProcess = data.thoughtProcess || null;

            // Parse system design from AI response
            const design = parseSystemDesign(reply);
            if (design && onSuggestSystemDesign) {
                onSuggestSystemDesign(design);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: reply, thoughtProcess }]);
        } catch (err) {
            console.error('AI Chat Error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Oops! I had a hiccup. Try again!'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const componentColors = {
        express: 'bg-[#00F0FF]',
        mongodb: 'bg-[#33FF66]',
        auth: 'bg-[#FF3366]',
        react: 'bg-[#A020F0]',
        stripe: 'bg-[#FFA500]'
    };

    const componentNames = {
        express: 'Express Server',
        mongodb: 'MongoDB',
        auth: 'Google Auth',
        react: 'React Frontend',
        stripe: 'Stripe Pay'
    };

    const renderMessage = (msg, idx) => {
        const isBot = msg.role === 'assistant';
        const design = parseSystemDesign(msg.content);
        const cleanText = cleanMessage(msg.content);

        return (
            <div key={idx} className={`flex gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 shrink-0 border-2 border-black flex items-center justify-center ${isBot ? 'bg-[#FFD700]' : 'bg-[#00F0FF]'}`}>
                    {isBot ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className={`flex-1 min-w-0 ${isBot ? '' : 'flex flex-col items-end'}`}>
                    <div className={`inline-block text-left p-4 border-4 border-black text-xs font-black leading-relaxed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isBot ? 'bg-white' : 'bg-[#FFD700]'}`}>
                        {msg.thoughtProcess && (
                            <div className="mb-4 p-3 bg-gray-100 border-2 border-black rounded-none text-[10px] text-gray-600 font-mono">
                                <div className="flex items-center gap-2 font-black text-black mb-2 uppercase tracking-tighter border-b-2 border-black pb-1">
                                    <Sparkles size={12} /> Thought Process
                                </div>
                                {msg.thoughtProcess}
                            </div>
                        )}
                        <div className="space-y-2">
                            {cleanText.split('\n').map((line, i) => (
                                <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}</p>
                            ))}
                        </div>

                        {/* Rendering System Design Alternatives */}
                        {design && Array.isArray(design) && (
                            <div className="mt-6 space-y-4">
                                {design.map((level, li) => (
                                    <div key={li} className="p-4 border-4 border-black bg-gray-50 flex flex-col gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-center justify-between border-b-2 border-black pb-2">
                                            <div className="flex items-center gap-2 text-black font-black uppercase tracking-widest text-[11px]">
                                                <Zap size={14} className="text-[#00F0FF] fill-[#00F0FF]" />
                                                <span>{level.title || level.category || 'Architecture Layer'}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-[10px]">
                                            {/* Render Best Practice/Primary Choice */}
                                            {level.best_practice && (
                                                <div className="flex p-2 border-2 border-black bg-[#33FF66]/20">
                                                    <div className="w-1/3 font-black text-[#008000] uppercase tracking-tighter">🏆 Best Choice:</div>
                                                    <div className="w-2/3 ml-2">
                                                        <span className="font-bold bg-white px-1 whitespace-nowrap">{level.best_practice.name || level.best_practice}</span>
                                                        <p className="mt-1 text-gray-700 italic">{level.best_practice.reason || level.reason || ''}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Render Alternatives */}
                                            {level.alternatives && Array.isArray(level.alternatives) && level.alternatives.length > 0 && (
                                                <div className="flex p-2 border-2 border-black bg-white">
                                                    <div className="w-1/3 font-black text-[#FF3366] uppercase tracking-tighter">🔄 Alternatives:</div>
                                                    <div className="w-2/3 ml-2 flex flex-wrap gap-1">
                                                        {level.alternatives.map((alt, ai) => (
                                                            <span key={ai} className="px-1.5 py-0.5 border border-black bg-gray-100 font-bold whitespace-nowrap">
                                                                {typeof alt === 'string' ? alt : alt.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fallback rendering for older/simpler formats */}
                                            {!level.best_practice && !level.alternatives && level.name && (
                                                <div className="p-2 border-2 border-black bg-white font-bold">
                                                    {level.name} - {level.reason || 'Component suggested by AI.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-2 text-[9px] text-[#FF3366] font-black uppercase tracking-widest text-center animate-pulse">
                                    Click elements on canvas to customize further!
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-14 px-4 border-b-4 border-black bg-[#FFD700] flex items-center gap-3">
                <div className="p-1.5 bg-white border-2 border-black">
                    <Sparkles size={18} className="text-black" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-tighter">AI Mission Command</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.map(renderMessage)}
                {isLoading && (
                    <div className="flex gap-2">
                        <div className="w-8 h-8 shrink-0 border-2 border-black flex items-center justify-center bg-[#FFD700]">
                            <Bot size={16} />
                        </div>
                        <div className="p-3 border-2 border-black bg-white">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t-4 border-black bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type mission details..."
                        className="flex-1 px-4 py-3 bg-white border-4 border-black text-xs font-black placeholder:text-gray-400 focus:outline-none focus:bg-[#00F0FF]/10"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="p-3 bg-[#FF3366] text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;
