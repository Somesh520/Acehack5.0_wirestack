import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, ArrowRight, ShieldCheck, Mail, Lock, Layers, Zap, Command, User } from 'lucide-react';

/* 
  21st Dev Inspired Neo-Brutalist Google Sign-In Card
  Optimized for WireStack Mission Console.
*/

const LoginPage = () => {
  const [isHovered, setIsHovered] = useState(false);

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const handleGoogleLogin = () => {
    const authUrl = apiBase ? `${apiBase}/api/auth/google` : '/api/auth/google';
    if (window.top && window.top !== window) {
      window.top.location.href = authUrl;
      return;
    }
    window.location.href = authUrl;
  };

  const title = 'Welcome Back';
  const subtitle = 'Sign in to continue your mission';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5dc] p-4 font-mono relative overflow-hidden">
      
      {/* Background Decor */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }}
      />

      <div className="relative">
        {/* Triple Stack Effect (Neo-Brutalist 21st Dev Style) */}
        <motion.div
          animate={{ x: isHovered ? 20 : 24, y: isHovered ? 20 : 24 }}
          className="absolute inset-0 bg-[#ffd700] border-4 border-black z-0"
        />
        
        <motion.div
          animate={{ x: isHovered ? 14 : 16, y: isHovered ? 14 : 16 }}
          className="absolute inset-0 bg-[#ff6b6b] border-4 border-black z-10"
        />
        
        <motion.div
            animate={{ x: isHovered ? 6 : 8, y: isHovered ? 6 : 8 }}
          className="absolute inset-0 bg-[#4ecdc4] border-4 border-black z-20"
        />

        {/* Main Interface */}
        <div
          className="relative w-[340px] md:w-[420px] bg-[#fffef0] border-4 border-black p-10 md:p-12 transition-transform duration-300 ease-out z-30"
          style={{
            transform: isHovered ? 'translate(-4px, -4px)' : 'translate(0, 0)',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="space-y-10">
            {/* Mission Logo */}
            <div className="flex justify-center mb-6">
                <div className="bg-[#ffd700] border-[3px] border-black p-2 shadow-[4px_4px_0px_#000]">
                    <Layers size={24} strokeWidth={3} />
                </div>
            </div>

            <div className="space-y-4 text-center">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-black uppercase leading-none">
                {title}
              </h1>
              <p className="text-sm font-bold text-black/60 uppercase tracking-widest leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="relative group">
              <div
                className="absolute inset-0 bg-black transition-all duration-300 ease-out"
                style={{
                  transform: isHovered
                    ? 'translate(12px, 12px)'
                    : 'translate(8px, 8px)',
                }}
              />

              <button
                type="button"
                onClick={handleGoogleLogin}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative w-full h-16 bg-white hover:bg-white border-4 border-black text-black flex items-center justify-center gap-4 font-black text-xl uppercase tracking-wider no-underline transition-all duration-300 ease-out group active:scale-95 active:translate-x-1 active:translate-y-1"
                style={{
                  transform: isHovered ? 'translate(-2px, -2px)' : 'translate(0, 0)',
                }}
              >
                <Chrome
                  className="w-8 h-8 transition-transform duration-300 ease-out"
                  style={{
                    transform: isHovered ? 'rotate(360deg) scale(1.1)' : 'rotate(0deg) scale(1)',
                  }}
                />
                <span>GOOGLE_ID</span>
                <ArrowRight size={20} strokeWidth={4} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 h-1.5 bg-black"></div>
              <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">SECURE</span>
              <div className="flex-1 h-1.5 bg-black"></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
                <div className="w-4 h-4 bg-[#4ecdc4] border-2 border-black flex-shrink-0"></div>
                <p className="text-[11px] font-black uppercase tracking-tight text-black">
                  Zero_Cloud_Leaks
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
                <div className="w-4 h-4 bg-[#ff6b6b] border-2 border-black flex-shrink-0"></div>
                <p className="text-[11px] font-black uppercase tracking-tight text-black">
                  Local_LLM_Verification
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
                <div className="w-4 h-4 bg-[#ffd700] border-2 border-black flex-shrink-0"></div>
                <p className="text-[11px] font-black uppercase tracking-tight text-black">
                  Protected_by_Google
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
