import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STACKS } from "../constants/stacks.jsx";
import {
  Target,
  Flame,
  BookOpen,
  Map,
  Trophy,
  Plus,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  History,
  Activity,
  User as UserIcon,
  PlusCircle
} from "lucide-react";

// --- Utility for class names (manual alternative to 'cn') ---
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// --- Sub-components adapted from User's Snippet ---

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative p-4 rounded-xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-lg border-[3px] border-black flex items-center justify-center",
            color
          )}
        >
          {React.cloneElement(icon, { size: 24, strokeWidth: 3 })}
        </div>
        <div>
          <div className="text-[10px] font-black text-black/40 uppercase tracking-widest leading-none mb-1">
            {label}
          </div>
          <div className="text-2xl font-black text-black leading-none">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge }) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] border-black font-black text-left transition-all",
        isActive
          ? "bg-[#FFE145] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          : "bg-white hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      )}
    >
      <div className="flex-shrink-0">{React.cloneElement(icon, { size: 20, strokeWidth: 3 })}</div>
      <span className="flex-1 text-sm uppercase tracking-tight">{label}</span>
      {badge && (
        <div className="bg-[#FF3EA5] text-white border-2 border-black font-black px-2 text-[10px] rounded-full">
          {badge}
        </div>
      )}
      <ChevronRight size={18} strokeWidth={4} className="flex-shrink-0" />
    </motion.button>
  );
}

export default function LearningSidebar({ user, activePhase, onNavigate }) {
  const [showStacks, setShowStacks] = useState(false);
  const sortedStacks = [...STACKS].sort((a, b) => a.title.localeCompare(b.title));

  const stats = [
    {
      icon: <Target />,
      label: "Phase_Lvl",
      value: user?.diagnosticLevel || "TBD",
      color: "bg-[#2979FF] text-white",
    },
    {
      icon: <Flame />,
      label: "Active_Strk",
      value: `${user?.currentStreak || 0} D`,
      color: "bg-[#FFE145] text-black",
    },
    {
      icon: <BookOpen />,
      label: "Mod_Synced",
      value: user?.totalModulesCompleted || 0,
      color: "bg-[#3EFFB2] text-black",
    },
  ];

  const menuItems = [
    { id: "roadmap", icon: <Map />, label: "Mission Roadmap" },
    { id: "learning_room", icon: <Trophy />, label: "Challenge Room" },
    { id: "history", icon: <History />, label: "History Archives", badge: "REC" },
  ];

  return (
    <aside className="w-80 h-screen bg-gradient-to-br from-[#FFE1FF] via-[#F0F7FF] to-[#E1FFFF] border-r-8 border-black p-6 flex flex-col gap-8 shrink-0 sticky top-0 font-mono z-50 overflow-y-auto custom-scrollbar">
      
      {/* Brand & Identity Header */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative p-5 rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
             <div className="absolute inset-0 bg-black rounded-full translate-x-1.5 translate-y-1.5" />
             <div className="relative w-full h-full rounded-full border-4 border-black bg-[#FF3EA5] flex items-center justify-center overflow-hidden">
                {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover grayscale contrast-125" />
                ) : (
                    <UserIcon size={32} className="text-white" strokeWidth={4} />
                )}
             </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-black leading-tight truncate">WIRESTACK_PRO</h3>
            <p className="text-[10px] font-black text-[#FF3EA5] uppercase tracking-widest flex items-center gap-1">
              <Activity size={10} strokeWidth={4} /> STATUS::ACTIVE
            </p>
          </div>
          <div className="w-3 h-3 rounded-full bg-[#3EFFB2] border-2 border-black animate-pulse shrink-0" />
        </div>
      </motion.div>

      {/* Statistics Section */}
      <div className="flex flex-col gap-4">
        <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] px-2 italic">Performance_Sync</h4>
        <div className="flex flex-col gap-3">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>

      <div className="h-[4px] bg-black rounded-full" />

      {/* Navigation Menu */}
      <div className="flex flex-col gap-4">
        <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] px-2 italic">Mission_Control</h4>
        <div className="flex flex-col gap-3">
          {menuItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activePhase === item.id}
              onClick={() => onNavigate(item.id)}
              badge={item.badge}
            />
          ))}
        </div>
      </div>

      {/* Available Missions (Special Request) */}
      <div className="flex flex-col gap-4">
        <div 
            className="flex items-center justify-between px-2 cursor-pointer group"
            onClick={() => setShowStacks(!showStacks)}
        >
            <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] italic">Available_Missions</h4>
            <PlusCircle size={14} className={cn("transition-transform duration-300", showStacks ? "rotate-45 text-[#FF3EA5]" : "text-black/30")} />
        </div>
        
        <AnimatePresence>
            {showStacks && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-2 overflow-hidden px-1"
                >
                    {sortedStacks.map((stack) => (
                        <motion.button
                            key={stack.id}
                            whileHover={{ x: 4 }}
                            onClick={() => onNavigate(stack.id)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:bg-[#3EFFB2] transition-all"
                        >
                            <div className={cn("w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center shrink-0", stack.color)}>
                                {React.cloneElement(stack.icon, { size: 14, strokeWidth: 3 })}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tight truncate flex-1 text-left">{stack.title}</span>
                            <Zap size={10} className="text-black/20" />
                        </motion.button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* New Mission Action - HIGH PROMINENCE */}
      <motion.button
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate('new_mission')}
        className="w-full py-5 rounded-2xl border-4 border-black bg-gradient-to-r from-[#3EFFB2] to-[#2ecc71] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 group"
      >
        <Plus className="w-8 h-8 font-black group-hover:rotate-90 transition-transform" strokeWidth={4} />
        <span className="text-xl font-black text-black uppercase tracking-tighter italic">NEW_MISSION</span>
        <Zap className="w-6 h-6 text-[#FFE145] animate-bounce" fill="currentColor" />
      </motion.button>

      <div className="flex-1 min-h-[40px]" />

      {/* Terminal Exit Flow */}
      <div className="flex flex-col gap-4">
        <div className="h-[4px] bg-black rounded-full" />
        <div className="grid grid-cols-2 gap-4">
           <motion.button
            whileHover={{ x: 2, scale: 1.02 }}
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center gap-2 py-4 rounded-xl border-[3px] border-black bg-white hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-black"
          >
            <Settings size={18} strokeWidth={3} />
            <span className="text-[10px] uppercase">ROOT</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => window.location.href = '/api/auth/logout'}
            className="flex items-center justify-center gap-2 py-4 rounded-xl border-[3px] border-black bg-[#FF3EA5] hover:bg-[#e62e91] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-black"
          >
            <LogOut size={18} strokeWidth={3} />
            <span className="text-[10px] uppercase">EXIT</span>
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
