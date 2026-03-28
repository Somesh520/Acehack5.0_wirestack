import { useEffect, useMemo, useState } from 'react';
import { User, Flame, CheckCircle2, Trophy, BarChart3, CalendarDays, Clock3, Award, ShieldCheck, Zap, Target } from 'lucide-react';

function dayKey(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toPrettyDate(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function computeStreak(daySet) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;

  for (let i = 0; i < 365; i += 1) {
    const probe = new Date(today);
    probe.setDate(today.getDate() - i);
    const key = dayKey(probe);
    if (daySet.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function computeMaxStreak(daySet) {
  if (!daySet || daySet.size === 0) return 0;

  const sortedDays = [...daySet].sort();
  let best = 1;
  let run = 1;

  for (let i = 1; i < sortedDays.length; i += 1) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  return best;
}

function buildYearHeatmap(dayCounts, totalDays = 365) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1));

  // Align to Sunday so the grid renders as consistent weekly columns.
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());

  const cells = [];
  const cursor = new Date(gridStart);
  while (cursor <= today) {
    const key = dayKey(cursor);
    cells.push({
      key,
      count: dayCounts.get(key) || 0,
      date: new Date(cursor),
      inRange: cursor >= start && cursor <= today,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const monthLabels = [];
  let previousMonthKey = '';
  weeks.forEach((week, index) => {
    const firstInRange = week.find((d) => d?.inRange);
    if (!firstInRange) return;
    const monthKey = `${firstInRange.date.getFullYear()}-${firstInRange.date.getMonth()}`;
    if (monthKey !== previousMonthKey) {
      monthLabels.push({
        weekIndex: index,
        label: firstInRange.date.toLocaleDateString('en-US', { month: 'short' }),
      });
      previousMonthKey = monthKey;
    }
  });

  // Prevent month text collisions when labels are too close.
  const sparseMonthLabels = [];
  monthLabels.forEach((item) => {
    const last = sparseMonthLabels[sparseMonthLabels.length - 1];
    if (!last || item.weekIndex - last.weekIndex >= 3) {
      sparseMonthLabels.push(item);
    }
  });

  return { weeks, monthLabels: sparseMonthLabels };
}

function toValidDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function collectSubmissionEvents(missions = []) {
  const events = [];

  missions.forEach((mission) => {
    const missionDone = toValidDate(mission?.completedAt || mission?.startedAt);
    if (missionDone) events.push(missionDone);

    if (Array.isArray(mission?.moduleProgress)) {
      mission.moduleProgress.forEach((mod) => {
        const completed = toValidDate(mod?.completedAt);
        if (completed) events.push(completed);
      });
    }
  });

  return events;
}

function StatTile({ icon, label, value, hint, color }) {
  return (
    <div className={`border-4 border-black p-4 ${color} shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-black leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase text-black/60 mt-2">{hint}</div>
    </div>
  );
}

function badgeColor(level) {
  if (level === 'Advanced') return 'bg-[#3EFFB2]';
  if (level === 'Intermediate') return 'bg-[#FFE145]';
  return 'bg-white';
}

function buildUnlockedBadges({ missionsCount, streak, acceptance, solved }) {
  const allBadges = [
    {
      id: 'first_steps',
      title: 'First Steps',
      detail: 'Completed first mission',
      unlocked: missionsCount >= 1,
      icon: Award,
      color: 'bg-[#F7EDC4]',
    },
    {
      id: 'consistency',
      title: 'Consistency',
      detail: '3-day streak',
      unlocked: streak >= 3,
      icon: Zap,
      color: 'bg-[#E8F2FF]',
    },
    {
      id: 'sharp_mind',
      title: 'Sharp Mind',
      detail: '70%+ acceptance',
      unlocked: acceptance >= 70,
      icon: ShieldCheck,
      color: 'bg-[#E8FFE8]',
    },
    {
      id: 'grinder',
      title: 'Grinder',
      detail: 'Solved 50+ challenges',
      unlocked: solved >= 50,
      icon: Target,
      color: 'bg-[#FFE8E8]',
    },
  ];

  return allBadges.filter((b) => b.unlocked);
}

export default function ProfilePage({ user, isPublic = false, username = null }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOwnerData, setProfileOwnerData] = useState(null);
  const [profileStats, setProfileStats] = useState({
    totalModulesCompleted: 0,
    currentStreak: 0,
    lastActiveAt: null,
    globalRank: null,
  });

  useEffect(() => {
    let mounted = true;

    // Determine which endpoint to fetch from
    const fetchProfileData = async () => {
      try {
        let endpoint;
        let options = { credentials: 'include' };

        if (isPublic && username) {
          // Public profile - no auth needed
          endpoint = `/api/v1/public/profile/${username}`;
          options = {}; // No credentials for public endpoint
        } else {
          // Authenticated profile
          endpoint = '/api/v1/mission/history';
        }

        const res = await fetch(endpoint, options);
        const data = await res.json();

        if (!mounted) return;

        if (isPublic) {
          // Public profile returns user + missions
          setProfileOwnerData(data.user);
          setMissions(Array.isArray(data?.missions) ? data.missions : []);
          setProfileStats({
            totalModulesCompleted: Number(data?.user?.totalModulesCompleted) || 0,
            currentStreak: Number(data?.user?.currentStreak) || 0,
            lastActiveAt: data?.user?.lastActiveAt || null,
            globalRank: Number(data?.user?.globalRank) || null,
          });
        } else {
          // Authenticated profile returns just missions
          setMissions(Array.isArray(data?.missions) ? data.missions : []);
          setProfileStats({
            totalModulesCompleted: Number(data?.stats?.totalModulesCompleted) || 0,
            currentStreak: Number(data?.stats?.currentStreak) || 0,
            lastActiveAt: data?.stats?.lastActiveAt || null,
            globalRank: Number(data?.stats?.globalRank) || null,
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Profile fetch error:', err);
        if (mounted) {
          setMissions([]);
          setProfileStats({
            totalModulesCompleted: 0,
            currentStreak: 0,
            lastActiveAt: null,
            globalRank: null,
          });
          setLoading(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      mounted = false;
    };
  }, [isPublic, username]);

  const profile = useMemo(() => {
    const totalQuestions = missions.reduce((sum, m) => sum + (Number(m.totalQuestions) || 0), 0);
    const solved = missions.reduce((sum, m) => sum + (Number(m.score) || 0), 0);
    const acceptance = totalQuestions > 0 ? Math.round((solved / totalQuestions) * 100) : 0;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const oneYearAgo = new Date(now);
    oneYearAgo.setDate(now.getDate() - 364);
    oneYearAgo.setHours(0, 0, 0, 0);

    const submissionEvents = collectSubmissionEvents(missions);
    const yearlyEvents = submissionEvents.filter((d) => d >= oneYearAgo && d <= now);

    const dayCounts = new Map();
    yearlyEvents.forEach((d) => {
      const key = dayKey(d);
      if (!key) return;
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    });

    const solvedDays = new Set(dayCounts.keys());
    const activeDays = solvedDays.size;
    const streak = computeStreak(solvedDays);
    const maxStreak = computeMaxStreak(solvedDays);

    const levelBuckets = { easy: 0, medium: 0, hard: 0 };
    missions.forEach((m) => {
      const level = String(m.level || '').toLowerCase();
      const solvedCount = Number(m.score) || 0;
      if (level.includes('advanced')) levelBuckets.hard += solvedCount;
      else if (level.includes('intermediate')) levelBuckets.medium += solvedCount;
      else levelBuckets.easy += solvedCount;
    });

    const totalBucketSolved = levelBuckets.easy + levelBuckets.medium + levelBuckets.hard;
    const easyPct = totalBucketSolved ? Math.round((levelBuckets.easy / totalBucketSolved) * 100) : 0;
    const mediumPct = totalBucketSolved ? Math.round((levelBuckets.medium / totalBucketSolved) * 100) : 0;
    const hardPct = totalBucketSolved ? Math.round((levelBuckets.hard / totalBucketSolved) * 100) : 0;

    const xp = solved * 10 + activeDays * 5 + streak * 20;
    const rankLabel = xp >= 1800 ? 'Guardian' : xp >= 1000 ? 'Striker' : xp >= 500 ? 'Rising' : 'Rookie';

    const recent = [...missions]
      .sort((a, b) => new Date(b.completedAt || b.startedAt || 0).getTime() - new Date(a.completedAt || a.startedAt || 0).getTime())
      .slice(0, 8)
      .map((m, idx) => {
        const total = Number(m.totalQuestions) || 0;
        const score = Number(m.score) || 0;
        const ratio = total > 0 ? score / total : 0;
        let verdict = 'Partial';
        if (ratio >= 0.8) verdict = 'Accepted';
        else if (ratio <= 0.35) verdict = 'Needs Work';

        return {
          id: `${idx}_${m.stack || 'mission'}`,
          stack: m.stack || 'Unknown Stack',
          level: m.level || 'Beginner',
          date: toPrettyDate(m.completedAt || m.startedAt),
          score,
          total,
          verdict,
        };
      });

    const yearlyCalendar = buildYearHeatmap(dayCounts, 365);
    const unlockedBadges = buildUnlockedBadges({
      missionsCount: missions.length,
      streak,
      acceptance,
      solved,
    });

    return {
      totalQuestions,
      solved,
      acceptance,
      activeDays,
      streak,
      xp,
      rankLabel,
      easyPct,
      mediumPct,
      hardPct,
      recent,
      yearlyCalendar,
      submissionsPastYear: yearlyEvents.length,
      maxStreak,
      unlockedBadges,
    };
  }, [missions]);

  const actualStreak = Math.max(Number(profileStats.currentStreak) || 0, Number(profile.streak) || 0);
  const realGlobalRank = Number(profileStats.globalRank) || null;

  if (loading) {
    return (
      <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="animate-pulse font-black uppercase text-sm">Loading profile intel...</div>
      </div>
    );
  }

  // Resolve username from either parameter, profileOwnerData, or authenticated user
  const resolvedUsername = username || 
    (isPublic && profileOwnerData?.username) || 
    (user?.github?.username) || 
    (user?.username) || 
    (user?.email?.split('@')[0]) || 
    'profile';

  const shareUrl = isPublic ? null : `${window.location.origin}/profile/${resolvedUsername}`;

  const displayName = isPublic && profileOwnerData
    ? profileOwnerData.name || profileOwnerData.username || 'Wirestack Cadet'
    : user?.name || user?.first_name || user?.email?.split('@')[0] || 'Wirestack Cadet';

  const profileUser = isPublic && profileOwnerData ? profileOwnerData : user;

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* HERO SECTION */}
      <section className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 lg:w-40 lg:h-40 border-4 border-black bg-[#1a1a1a] flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              {profileUser?.profile_picture ? (
                <img src={profileUser.profile_picture} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={56} strokeWidth={1.5} className="text-white/40" />
              )}
            </div>
          </div>

          {/* Profile Info & CTAs */}
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-2">{profile.rankLabel}_RANKED</p>
            <h1 className="text-3xl lg:text-5xl font-black uppercase leading-tight tracking-tighter mb-3">{displayName}</h1>
            
            {/* Bio */}
            <p className="text-sm leading-relaxed text-black/70 mb-4 max-w-md">
              Curating the intersection of brutalist architecture and digital interfaces. Solving challenges, breaking grids, and documenting the manifest.
            </p>

            {/* Action CTAs */}
            <div className="flex gap-3">
              {isPublic ? (
                <>
                  <a
                    href="/"
                    className="border-3 border-black bg-[#CCFF00] px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    Start Learning
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (shareUrl) {
                        navigator.clipboard.writeText(shareUrl);
                        alert('Profile link copied!');
                      }
                    }}
                    className="border-3 border-black bg-[#CCFF00] px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    Share Profile
                  </button>
                  <button className="border-3 border-black bg-white px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* STAT CARDS - 3 COLUMN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CURRENT STREAK */}
        <section className="border-4 border-black bg-[#1a1a1a] text-[#CCFF00] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Flame size={20} className="mb-3" />
          <p className="text-[9px] font-black uppercase tracking-wider text-[#CCFF00]/60 mb-2">Current Streak</p>
          <p className="text-5xl font-black leading-none tracking-tight">{actualStreak}</p>
          <p className="text-[8px] font-bold uppercase text-[#CCFF00]/50 mt-3">day chain</p>
        </section>

        {/* TOTAL SOLVED */}
        <section className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <CheckCircle2 size={20} className="mb-3 text-black" />
          <p className="text-[9px] font-black uppercase tracking-wider text-black/60 mb-2">Total Solved</p>
          <p className="text-5xl font-black leading-none tracking-tight text-black">{profile.solved}</p>
          <p className="text-[8px] font-bold uppercase text-black/50 mt-3">challenges</p>
        </section>

        {/* GLOBAL RANK */}
        <section className="border-4 border-black bg-[#FF1E88] text-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Trophy size={20} className="mb-3" />
          <p className="text-[9px] font-black uppercase tracking-wider text-white/70 mb-2">Global Rank</p>
          <p className="text-4xl font-black leading-none tracking-tight">{realGlobalRank ? `#${realGlobalRank}` : '--'}</p>
          <p className="text-[8px] font-bold uppercase text-white/60 mt-3">{realGlobalRank ? 'live leaderboard' : 'rank unavailable'}</p>
        </section>
      </div>

      {/* CONTENT AREA - Full width sections */}
      <div className="flex-1 space-y-4">
        {/* ACTIVITY LOG */}
        <section className="border-4 border-black bg-gradient-to-br from-[#F9FBFF] via-[#F6FFF9] to-[#FFFDF4] text-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black uppercase mb-3">Activity Log</h3>
          <div className="text-[10px] font-bold text-black/60 mb-3">{profile.submissionsPastYear} submissions • {profile.activeDays} active days • Max streak: {profile.maxStreak}d</div>
          <div className="w-full overflow-x-auto">
            <div
              className="grid gap-x-[5px] gap-y-[5px] w-full min-w-fit"
              style={{ gridTemplateColumns: `repeat(${profile.yearlyCalendar.weeks.length}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: 7 }).map((_, rowIndex) => (
                <div key={`year_row_${rowIndex}`} className="contents">
                  {profile.yearlyCalendar.weeks.map((week, weekIndex) => {
                    const cell = week[rowIndex];
                    const intensity = !cell?.inRange
                      ? 'bg-transparent'
                      : cell.count >= 4
                        ? 'bg-[#159947]'
                        : cell.count >= 2
                          ? 'bg-[#36C35D]'
                          : cell.count === 1
                            ? 'bg-[#9EE3AF]'
                            : 'bg-[#E8EDF3]';

                    return (
                      <div
                        key={`year_cell_${weekIndex}_${rowIndex}`}
                        title={cell?.inRange ? `${cell.key}: ${cell.count} submission(s)` : ''}
                        className={`w-full aspect-square max-w-[16px] justify-self-center rounded-[3px] ${intensity}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              className="grid mt-2 w-full"
              style={{ gridTemplateColumns: `repeat(${profile.yearlyCalendar.weeks.length}, minmax(0, 1fr))` }}
            >
              {profile.yearlyCalendar.weeks.map((_, idx) => {
                const marker = profile.yearlyCalendar.monthLabels.find((m) => m.weekIndex === idx);
                return (
                  <div key={`year_month_${idx}`} className="text-[8px] font-bold text-black/40 leading-none text-center">
                    {marker ? marker.label : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PROBLEM MIX */}
        <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black uppercase mb-4">Problem Mix</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1"><span>Easy Logic</span><span>{profile.easyPct}%</span></div>
              <div className="h-4 border-2 border-black bg-[#f2f2f2] overflow-hidden"><div className="h-full bg-[#3EFFB2]" style={{ width: `${profile.easyPct}%` }} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1"><span>Medium Plan</span><span>{profile.mediumPct}%</span></div>
              <div className="h-4 border-2 border-black bg-[#f2f2f2] overflow-hidden"><div className="h-full bg-[#FFE145]" style={{ width: `${profile.mediumPct}%` }} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1"><span>Hard Core</span><span>{profile.hardPct}%</span></div>
              <div className="h-4 border-2 border-black bg-[#f2f2f2] overflow-hidden"><div className="h-full bg-[#FF6B6B]" style={{ width: `${profile.hardPct}%` }} /></div>
            </div>
          </div>
          <div className="mt-5 border-2 border-black bg-[#f8f8f8] p-3">
            <p className="text-[10px] font-black uppercase text-black/60">Accuracy Rating</p>
            <p className="text-3xl font-black mt-1">{profile.acceptance}<span className="text-lg">%</span></p>
          </div>
        </section>

        {/* HONOR ROLL - BADGES ROW AT BOTTOM */}
        <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black uppercase mb-4">Verified Badges</h3>
          {profile.unlockedBadges.length === 0 ? (
            <p className="text-[11px] font-bold text-black/60">Unlock badges by solving challenges and maintaining streaks</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {profile.unlockedBadges.map((badge) => {
                const BadgeIcon = badge.icon;
                const badgeBg = badge.color;
                return (
                  <div
                    key={badge.id}
                    className={`border-4 border-black ${badgeBg} p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-2`}
                  >
                    <BadgeIcon size={28} strokeWidth={2} className="text-black" />
                    <p className="text-[10px] font-black uppercase leading-tight">{badge.title}</p>
                  </div>
                );
              })}
              {[...Array(Math.max(0, 5 - profile.unlockedBadges.length))].map((_, idx) => (
                <div key={`locked_${idx}`} className="border-4 border-black bg-[#E8E8E8] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-2">
                  <Trophy size={28} strokeWidth={1.5} className="text-black/30" />
                  <p className="text-[10px] font-black uppercase leading-tight text-black/40">Locked</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT SUBMISSIONS */}
        <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 size={16} />
            <h3 className="text-sm font-black uppercase">Recent Submissions</h3>
          </div>

          {profile.recent.length === 0 ? (
            <p className="text-[11px] font-bold text-black/60">No submissions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {profile.recent.map((row) => (
                <div key={row.id} className="border-2 border-black p-3 bg-[#f8f8f8]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase">{row.stack}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 border border-black ${row.verdict === 'Accepted' ? 'bg-[#E8FFE8] text-black' : row.verdict === 'Partial' ? 'bg-[#FFF3CD] text-black' : 'bg-[#FFE8E8] text-black'}`}>{row.verdict}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold text-black/70">
                    <span>{row.score}/{row.total}</span>
                    <span>{row.date}</span>
                  </div>
                  <div className="mt-1 h-2 border border-black/20 bg-white overflow-hidden">
                    <div className="h-full bg-[#3EFFB2]" style={{ width: row.total > 0 ? `${(row.score / row.total) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
