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
                <div className={`flex-1 min-w-0 ${isBot ? '' : 'text-right'}`}>
                    <div className={`inline-block text-left p-3 border-2 border-black text-xs font-bold leading-relaxed ${isBot ? 'bg-white' : 'bg-[#FFD700]'}`}>
                        {msg.thoughtProcess && (
                            <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded text-[10px] text-gray-500 font-mono">
                                <span className="block font-black text-gray-700 mb-1 border-b border-gray-300 pb-1">🧠 AGENT THOUGHT PROCESS</span>
                                {msg.thoughtProcess}
                            </div>
                        )}
                        {cleanText.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}</p>
                        ))}
                    </div>
                    {design && (
                        <div className="mt-2 space-y-1">
                            {design.map((level, li) => (
                                <div key={li} className="p-2 border-2 border-black bg-white text-[10px] font-black flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Zap size={10} />
                                        <span>LEVEL {li + 1}: {level.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-[#33FF66] text-black px-1.5 py-0.5 border border-black uppercase">
                                            {level.best_practice.name}
                                        </div>
                                        <span className="font-bold whitespace-nowrap">— BEST PRACTICE</span>
                                    </div>
                                    <p className="font-bold text-gray-500 italic mt-0.5">{level.best_practice.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b-4 border-black bg-[#FFD700] flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wider">AI Assistant</h3>
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
            <div className="p-3 border-t-4 border-black bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Describe your app idea..."
                        className="flex-1 p-2 border-2 border-black text-xs font-bold placeholder:text-gray-400 focus:outline-none focus:border-[#FFD700]"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="p-2 border-2 border-black bg-[#FFD700] hover:bg-[#FFC000] disabled:opacity-50 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;
