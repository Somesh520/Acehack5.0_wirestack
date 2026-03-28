import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STACKS } from "../constants/stacks.jsx";
import {
  Target,
  Flame,
  BookOpen,
  FolderKanban,
  Map,
  Trophy,
  Bug,
  Search,
  Plus,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  History,
  Activity,
  User as UserIcon,
  PlusCircle,
  Trash2,
  X
} from "lucide-react";

// --- Utility for class names (manual alternative to 'cn') ---
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getDisplayName(user) {
  const fallback = "Wirestack Cadet";
  const name = user?.name || user?.username || user?.email?.split("@")[0] || fallback;
  return name.toString().trim();
}

function SectionBlock({ title, children }) {
  return (
    <section className="border-[3px] border-black rounded-2xl bg-white/85 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h4 className="text-[9px] font-black text-black/45 uppercase tracking-[0.28em] px-1 mb-2 italic">{title}</h4>
      {children}
    </section>
  );
}

// --- Sub-components adapted from User's Snippet ---

function StatCard({ icon, label, value, color, compact = false }) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn(
        "relative rounded-lg border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all",
        compact ? "p-1.5" : "p-2"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            compact ? "w-7 h-7" : "w-8 h-8",
            "rounded-md border-[3px] border-black flex items-center justify-center shrink-0",
            color
          )}
        >
          {React.cloneElement(icon, { size: compact ? 12 : 14, strokeWidth: 3 })}
        </div>
        <div className="min-w-0">
          <div className={cn("font-black text-black/45 uppercase leading-none mb-1 truncate", compact ? "text-[7px] tracking-[0.12em]" : "text-[8px] tracking-[0.16em]")}>
            {label}
          </div>
          <div className={cn("font-black text-black leading-none truncate", compact ? "text-sm" : "text-base")}>{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge }) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-[3px] border-black font-black text-left transition-all",
        isActive
          ? "bg-[#FFE145] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          : "bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      )}
    >
      <div className="flex-shrink-0">{React.cloneElement(icon, { size: 18, strokeWidth: 3 })}</div>
      <span className="flex-1 text-[12px] uppercase tracking-tight">{label}</span>
      {badge && (
        <div className="bg-[#FF3EA5] text-white border-2 border-black font-black px-2 text-[10px] rounded-full">
          {badge}
        </div>
      )}
      <ChevronRight size={16} strokeWidth={4} className="flex-shrink-0" />
    </motion.button>
  );
}

export default function LearningSidebar({
  user,
  activePhase,
  onNavigate,
  onCloseSidebar,
  projects = [],
  activeProjectId,
  onProjectSelect,
  onProjectDelete,
}) {
  const [showStacks, setShowStacks] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 900
  );
  const sortedStacks = [...STACKS].sort((a, b) => a.title.localeCompare(b.title));
  const displayName = getDisplayName(user);
  const isCompact = viewportHeight < 980;
  const isUltraCompact = viewportHeight < 860;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    { id: "debug_lab", icon: <Bug />, label: "Debug Lab" },
    { id: "analyzer", icon: <Search />, label: "Analyzer" },
    { id: "history", icon: <History />, label: "History Archives", badge: "REC" },
  ];

  return (
    <aside className={cn(
      "w-[292px] md:w-[304px] h-dvh min-h-dvh max-h-dvh bg-gradient-to-br from-[#FFE1FF] via-[#F0F7FF] to-[#E1FFFF] border-r-8 border-black shrink-0 sticky top-0 font-mono z-50 overflow-hidden flex flex-col",
      isCompact ? "p-2.5 gap-2" : "p-3 md:p-4 gap-3"
    )}>
      <div className="flex justify-between items-center">
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-black/40">Mission Shell</div>
        <button
          onClick={onCloseSidebar}
          className="w-9 h-9 border-[3px] border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFE145] transition-all flex items-center justify-center"
          aria-label="Close sidebar"
        >
          <X size={16} strokeWidth={3} />
        </button>
      </div>
      
      {/* Brand & Identity Header */}
      <motion.div
        whileHover={{ y: -1 }}
        className="relative p-3 rounded-2xl border-[3px] border-black bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
             <div className="absolute inset-0 bg-black rounded-full translate-x-1 translate-y-1" />
             <div className="relative w-full h-full rounded-full border-4 border-black bg-[#FF3EA5] flex items-center justify-center overflow-hidden">
                {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover grayscale contrast-125" />
                ) : (
                    <UserIcon size={22} className="text-white" strokeWidth={4} />
                )}
             </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-black text-black leading-tight truncate">{displayName}</h3>
            <p className="text-[9px] font-black text-[#FF3EA5] uppercase tracking-[0.18em] flex items-center gap-1">
              <Activity size={10} strokeWidth={4} /> STATUS::ACTIVE
            </p>
            <p className="text-[9px] font-black text-black/45 mt-1 uppercase tracking-wide truncate">
              {user?.selectedStack ? `${user.selectedStack} Track` : 'Track not selected'}
            </p>
          </div>
          <div className="w-3 h-3 rounded-full bg-[#3EFFB2] border-2 border-black animate-pulse shrink-0" />
        </div>
      </motion.div>

      {/* Project + Stack Dock */}
      <SectionBlock title="Project_Dock">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-black/55 uppercase tracking-widest">Projects</p>
          <button
            onClick={() => onNavigate('new_project')}
            className="w-7 h-7 border-2 border-black bg-[#FFE145] rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#3EFFB2] transition-all flex items-center justify-center"
            title="Create New Project"
          >
            <Plus size={14} strokeWidth={4} />
          </button>
        </div>

        <div className="max-h-32 overflow-auto space-y-1.5 pr-1">
          {projects.length === 0 ? (
            <p className="text-[10px] font-bold text-black/40 uppercase">No project yet</p>
          ) : (
            projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect?.(project.id)}
                  className={cn(
                    'w-full text-left border-2 border-black rounded-lg px-2 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
                    isActive ? 'bg-[#3EFFB2]' : 'bg-white hover:bg-[#f6f6f6]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FolderKanban size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase truncate flex-1">{project.name}</span>
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onProjectDelete?.(project.id);
                      }}
                      className="w-6 h-6 border-2 border-black rounded bg-white hover:bg-[#FFE8E8] flex items-center justify-center shrink-0"
                      title="Delete Project"
                    >
                      <Trash2 size={12} strokeWidth={3} />
                    </button>
                  </div>
                  <p className="text-[9px] font-black text-black/55 uppercase mt-1 truncate">
                    Stack: {project.stack || 'none'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </SectionBlock>

      {/* Statistics Section */}
      <SectionBlock title="Performance_Sync">
        <div className="grid grid-cols-1 gap-2">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} compact={isCompact} />
          ))}
        </div>
      </SectionBlock>

      {/* Navigation Menu */}
      <SectionBlock title="Mission_Control">
        <div className="flex flex-col gap-2">
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
      </SectionBlock>

      {/* Available Missions (Special Request) */}
        {!isCompact && (
        <SectionBlock title="Available_Missions">
        <div 
            className="flex items-center justify-between px-1 cursor-pointer group"
            onClick={() => setShowStacks(!showStacks)}
        >
            <p className="text-[11px] font-black text-black/60 uppercase tracking-widest">Select Stack</p>
            <PlusCircle size={14} className={cn("transition-transform duration-300", showStacks ? "rotate-45 text-[#FF3EA5]" : "text-black/35")} />
        </div>
        
        <AnimatePresence>
            {showStacks && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-1.5 overflow-hidden px-0.5 pt-1"
                >
                    {sortedStacks.map((stack) => (
                        <motion.button
                            key={stack.id}
                        whileHover={{ x: 2 }}
                            onClick={() => onNavigate(stack.id)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#3EFFB2] transition-all"
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
      </SectionBlock>
      )}

      {/* New Mission Action - HIGH PROMINENCE */}
      {!isUltraCompact && (
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('new_mission')}
          className={cn(
            "w-full rounded-2xl border-[3px] border-black bg-gradient-to-r from-[#3EFFB2] to-[#2ecc71] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 group",
            isCompact ? "py-2.5" : "py-3"
          )}
        >
          <Plus className="w-5 h-5 font-black group-hover:rotate-90 transition-transform" strokeWidth={4} />
          <span className={cn("font-black text-black uppercase tracking-tight italic", isCompact ? "text-[13px]" : "text-[15px]")}>NEW_MISSION</span>
          <Zap className="w-4 h-4 text-[#FFE145] animate-bounce" fill="currentColor" />
        </motion.button>
      )}

      {/* Bottom Action Bar */}
      <div className="mt-auto pt-2">
        <div className={cn(
          "grid grid-cols-2 border-[3px] border-black rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
          isCompact ? "gap-2 p-2" : "gap-3 p-2.5"
        )}>
          <motion.button
            whileHover={!isCompact ? { x: 2, scale: 1.01 } : undefined}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = '/'}
            className={cn(
              "flex items-center justify-center rounded-xl border-[3px] border-black bg-white hover:bg-gray-100 transition-all font-black",
              isCompact ? "gap-1.5 py-2" : "gap-2 py-2.5"
            )}
          >
            <Settings size={isCompact ? 14 : 16} strokeWidth={3} />
            <span className={cn("uppercase", isCompact ? "text-[9px]" : "text-[10px]")}>ROOT</span>
          </motion.button>

          <motion.button
            whileHover={!isCompact ? { scale: 1.01 } : undefined}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = '/api/auth/logout'}
            className={cn(
              "flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FF3EA5] hover:bg-[#e62e91] text-white transition-all font-black",
              isCompact ? "gap-1.5 py-2" : "gap-2 py-2.5"
            )}
          >
            <LogOut size={isCompact ? 14 : 16} strokeWidth={3} />
            <span className={cn("uppercase", isCompact ? "text-[9px]" : "text-[10px]")}>EXIT</span>
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
