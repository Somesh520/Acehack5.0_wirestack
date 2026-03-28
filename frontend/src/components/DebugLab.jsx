import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Bug, ArrowRight, Sparkles, CheckCircle2, XCircle, Play, RefreshCw, Square } from 'lucide-react';
import { STACKS } from '../constants/stacks.jsx';

const TOPIC_BANK = {
  react: [
    'Hooks',
    'State Management',
    'Rendering Bugs',
    'useEffect Dependencies',
    'Event Handling',
    'Controlled vs Uncontrolled Inputs',
    'Context API',
    'Prop Drilling',
    'Component Lifecycle',
    'Conditional Rendering',
    'List Keys and Reconciliation',
    'Memoization (useMemo/useCallback)',
    'Async Data Fetching',
    'Error Boundaries',
    'Custom Hooks',
    'Form Validation',
    'State Immutability',
    'React Router Navigation Bugs',
    'Performance Re-renders',
    'Cleanup and Memory Leaks',
  ],
  vue: ['Reactivity', 'Watchers', 'Computed Properties', 'Props and Emits', 'Pinia State', 'Lifecycle Hooks', 'Template Rendering'],
  angular: ['RxJS Streams', 'Dependency Injection', 'Change Detection', 'Forms Validation', 'Route Guards', 'Service Layer Bugs'],
  next: ['Server Components', 'Client Components', 'Route Handlers', 'Caching and Revalidation', 'Metadata', 'Dynamic Routes'],
  node: ['Async Handling', 'API Validation', 'Error Handling', 'Promise Chains', 'Stream Handling', 'File System Errors', 'Process Events'],
  express: ['Middleware Flow', 'Status Codes', 'Request Validation', 'Auth Middleware', 'Route Params', 'Error Middleware', 'Rate Limiting'],
  python: ['Function Logic', 'Input Guards', 'Loop Bugs', 'Exception Handling', 'Asyncio Basics', 'List/Dict Mutations', 'Edge Cases'],
  java: ['NullPointer Fixes', 'Collection Handling', 'Exception Hierarchy', 'Spring Controller Bugs', 'Dependency Injection'],
  csharp: ['LINQ Bugs', 'Nullability', 'ASP.NET Middleware', 'Async Task Handling', 'Model Binding'],
  go: ['Goroutine Leaks', 'Channel Deadlocks', 'Error Returns', 'Slice Mutation Bugs', 'Context Cancellation'],
  ruby: ['Nil Handling', 'Rails Controller Flow', 'ActiveRecord Query Bugs', 'Params Validation', 'Callback Issues'],
  cpp: ['Pointer Safety', 'Memory Leaks', 'Boundary Conditions', 'STL Usage Bugs', 'Race Conditions'],
  mern: ['Schema Validation', 'API Contract Mismatch', 'React-Node Integration', 'Auth Flow', 'State Sync'],
  mean: ['Angular Service to API Flow', 'Mongo Query Bugs', 'Express Middleware', 'JWT Validation'],
  jamstack: ['Build-time Data Issues', 'ISR/SSR Refresh Bugs', 'API Integration', 'Caching Invalidation'],
  reactnative: ['Navigation State', 'AsyncStorage Bugs', 'Hook Side Effects', 'Platform-specific Behavior'],
  flutter: ['Widget Rebuild Bugs', 'State Management', 'Async UI States', 'Navigation Stack'],
  swift: ['Optional Unwrap', 'Main Thread UI', 'Network Callback Handling', 'State Persistence'],
  android: ['Coroutine Scope', 'Activity Lifecycle', 'State Restore', 'Network Error Handling'],
  mongodb: ['Aggregation Pipeline Bugs', 'Indexing Mistakes', 'Schema Validation', 'Projection Issues'],
  postgres: ['Join Logic Errors', 'Transaction Handling', 'Constraint Violations', 'Query Optimization'],
  mysql: ['Join/Group By Bugs', 'Constraint Failures', 'Transaction Bugs', 'Date-time Parsing'],
  redis: ['Cache Invalidation', 'TTL Bugs', 'Race Conditions', 'Serialization Mismatch'],
  aws: ['IAM Permissions', 'Lambda Timeout Bugs', 'S3 Policy Issues', 'CloudWatch Tracing'],
  docker: ['Container Networking', 'Volume Mount Bugs', 'Env Variable Injection', 'Image Layer Issues'],
  kubernetes: ['Probe Failures', 'ConfigMap/Secret Bugs', 'Resource Limits', 'Rolling Update Issues'],
  'ai-ml': ['Data Leakage', 'Model Input Validation', 'Feature Drift', 'Inference Error Handling'],
  default: ['Condition Bugs', 'Data Handling', 'Async Bugs'],
};

const CHALLENGE_BANK = {
  beginner: [
    {
      title: 'Null Guard Missing',
      bugBrief: 'Function crashes when users is undefined.',
      brokenCode: `function getFirstUser(users) {
  return users[0].name;
}

console.log(getFirstUser());`,
      expectedTokens: ['if', '!users', 'return', 'null'],
      acceptance: 'Handle empty/undefined input without crash.',
    },
    {
      title: 'Wrong Condition Branch',
      bugBrief: 'Discount logic always applies full price.',
      brokenCode: `function finalPrice(price, hasCoupon) {
  if (hasCoupon = true) {
    return price * 0.9;
  }
  return price;
}`,
      expectedTokens: ['===', 'hasCoupon'],
      acceptance: 'Use proper comparison operator and correct branch.',
    },
    {
      title: 'Missing Early Return',
      bugBrief: 'Validation warning logs but function still proceeds.',
      brokenCode: `function saveProfile(data) {
  if (!data?.email) {
    console.error('email required');
  }
  return { ok: true };
}`,
      expectedTokens: ['return', 'if', '!data'],
      acceptance: 'Stop execution when required input is missing.',
    },
    {
      title: 'Off-by-One Loop',
      bugBrief: 'Loop accesses out-of-range array index.',
      brokenCode: `function sum(arr) {
  let total = 0;
  for (let i = 0; i <= arr.length; i++) {
    total += arr[i];
  }
  return total;
}`,
      expectedTokens: ['<', 'arr.length'],
      acceptance: 'Fix loop boundary so only valid indexes are accessed.',
    },
  ],
  intermediate: [
    {
      title: 'Async Not Awaited',
      bugBrief: 'Data logs as Promise instead of JSON result.',
      brokenCode: `async function loadUser() {
  const data = fetch('/api/user');
  const json = data.json();
  return json;
}`,
      expectedTokens: ['await', 'fetch', 'await', 'data.json'],
      acceptance: 'Resolve promise chain correctly and return parsed JSON.',
    },
    {
      title: 'Try-Catch Missing',
      bugBrief: 'Failing API call breaks entire flow.',
      brokenCode: `async function loadOrders() {
  const res = await fetch('/api/orders');
  const data = await res.json();
  return data.items;
}`,
      expectedTokens: ['try', 'catch', 'return'],
      acceptance: 'Guard API failure and return safe fallback.',
    },
    {
      title: 'Status Check Missing',
      bugBrief: 'API error responses still parsed as success payload.',
      brokenCode: `async function loadStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  return data.result;
}`,
      expectedTokens: ['res.ok', 'throw', 'try'],
      acceptance: 'Handle non-200 responses before consuming payload.',
    },
    {
      title: 'Mutating Shared State',
      bugBrief: 'Original list gets mutated causing stale UI behavior.',
      brokenCode: `function addItem(items, item) {
  items.push(item);
  return items;
}`,
      expectedTokens: ['...', 'return', 'new'],
      acceptance: 'Return immutable updated data instead of mutating original.',
    },
  ],
  advanced: [
    {
      title: 'Race Condition in Shared State',
      bugBrief: 'Counter update loses increments in rapid calls.',
      brokenCode: `let count = 0;
function increaseAsync() {
  setTimeout(() => {
    count = count + 1;
  }, 0);
}

increaseAsync();
increaseAsync();`,
      expectedTokens: ['queue', 'current', 'count'],
      acceptance: 'Stabilize update logic to avoid stale shared value usage.',
    },
    {
      title: 'Leaky Retry Loop',
      bugBrief: 'Retry mechanism can loop forever on persistent failure.',
      brokenCode: `async function fetchWithRetry(apiCall) {
  try {
    return await apiCall();
  } catch (e) {
    return fetchWithRetry(apiCall);
  }
}`,
      expectedTokens: ['attempt', 'maxRetries', 'throw'],
      acceptance: 'Add bounded retries and clean failure path.',
    },
    {
      title: 'Stale Closure Update',
      bugBrief: 'Async callback reads stale state snapshot and overwrites latest value.',
      brokenCode: `let state = { count: 0 };
function scheduleIncrement() {
  const snapshot = state.count;
  setTimeout(() => {
    state.count = snapshot + 1;
  }, 100);
}`,
      expectedTokens: ['current', 'latest', 'state.count'],
      acceptance: 'Use latest state value in async callback to prevent overwrite.',
    },
    {
      title: 'Partial Failure Not Handled',
      bugBrief: 'Batch requests fail completely if one promise rejects.',
      brokenCode: `async function loadAll(tasks) {
  const results = await Promise.all(tasks.map((t) => t()));
  return results;
}`,
      expectedTokens: ['allSettled', 'filter', 'status'],
      acceptance: 'Handle partial failures without dropping successful results.',
    },
  ],
};

const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'];

function normalizeLevel(level) {
  const value = (level || '').toString().toLowerCase();
  if (value.includes('adv')) return 'advanced';
  if (value.includes('inter')) return 'intermediate';
  return 'beginner';
}

function parseJsonFromReply(reply) {
  if (!reply || typeof reply !== 'string') return null;
  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function localEvaluate({ challenge, userCode, brokenCode }) {
  const source = (userCode || '').toLowerCase();
  const issues = [];

  if (!userCode || userCode.trim().length < 20) {
    return {
      passed: false,
      score: 15,
      feedback: 'Solution too short. Proper fix missing.',
      reasons: ['Write a complete corrected implementation.'],
    };
  }

  if (userCode.trim() === (brokenCode || '').trim()) {
    issues.push('Code unchanged. Bug fix expected.');
  }

  const tokens = challenge?.expectedTokens || [];
  let matched = 0;
  for (const token of tokens) {
    if (source.includes(token.toLowerCase())) matched += 1;
  }

  const tokenScore = tokens.length ? Math.round((matched / tokens.length) * 70) : 50;
  const changeScore = userCode.trim() !== (brokenCode || '').trim() ? 20 : 0;
  const lengthScore = userCode.trim().length > 60 ? 10 : 0;
  const score = Math.min(100, tokenScore + changeScore + lengthScore);

  if (score < 60) {
    issues.push('Fix seems incomplete for target bug.');
  }

  return {
    passed: score >= 60 && issues.length === 0,
    score,
    feedback: score >= 60 ? 'Core bug fix detected.' : 'Bug fix not fully validated yet.',
    reasons: issues,
  };
}

export default function DebugLab({ selectedStack, userLevel = 'Beginner' }) {
  const [stackChoice, setStackChoice] = useState(selectedStack || 'react');
  const [topicChoice, setTopicChoice] = useState('');
  const [level, setLevel] = useState(normalizeLevel(userLevel));
  const [questionNumber, setQuestionNumber] = useState(1);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState('setup');
  const [result, setResult] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
  const [usedChallengeKeys, setUsedChallengeKeys] = useState([]);
  const [lastChallengeKey, setLastChallengeKey] = useState('');
  const [sessionStats, setSessionStats] = useState({
    attempted: 0,
    passed: 0,
    topics: {},
  });

  const stackOptions = useMemo(() => STACKS.map((s) => ({ id: s.id, title: s.title })), []);
  const topics = useMemo(() => TOPIC_BANK[stackChoice] || TOPIC_BANK.default, [stackChoice]);

  useEffect(() => {
    if (!topicChoice && topics.length > 0) {
      setTopicChoice(topics[0]);
    }
  }, [topics, topicChoice]);

  useEffect(() => {
    // Reset history only when stack changes, not when topic changes.
    // This prevents repeating the same base questions across different topics.
    setQuestionNumber(1);
    setUsedChallengeKeys([]);
    setLastChallengeKey('');
  }, [stackChoice]);

  const pickChallenge = (nextLevel, qNumber, topic, usedKeys, previousKey) => {
    const bank = CHALLENGE_BANK[nextLevel] || CHALLENGE_BANK.beginner;
    const topicSeed = (topic || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const startIndex = (qNumber + topicSeed) % bank.length;

    let fallback = bank[startIndex];
    let fallbackKey = `${nextLevel}|${fallback.title}`;

    for (let offset = 0; offset < bank.length; offset += 1) {
      const idx = (startIndex + offset) % bank.length;
      const candidate = bank[idx];
      const candidateKey = `${nextLevel}|${candidate.title}`;

      if (candidateKey !== previousKey) {
        fallback = candidate;
        fallbackKey = candidateKey;
      }

      if (!usedKeys.includes(candidateKey) && candidateKey !== previousKey) {
        return { challenge: candidate, key: candidateKey };
      }
    }

    return { challenge: fallback, key: fallbackKey };
  };

  const startChallenge = () => {
    const currentLevel = normalizeLevel(level);
    const picked = pickChallenge(currentLevel, questionNumber, topicChoice, usedChallengeKeys, lastChallengeKey);
    const selected = {
      ...picked.challenge,
      title: `${topicChoice} • ${picked.challenge.title}`,
    };
    setChallenge(selected);
    setCode(selected.brokenCode);
    setResult(null);
    setLastSubmittedAt(null);
    setLastChallengeKey(picked.key);
    setUsedChallengeKeys((prev) => (prev.includes(picked.key) ? prev : [...prev, picked.key]));
    setPhase('running');
  };

  const runAiReview = async ({ currentChallenge, userCode, local }) => {
    try {
      const prompt = `You are a strict debugging evaluator. Return only JSON:\n{\n  "passed": true/false,\n  "score": 0-100,\n  "feedback": "short",\n  "nextHint": "short"\n}\n\nLevel: ${level}\nTopic: ${topicChoice}\nBug brief: ${currentChallenge.bugBrief}\nAcceptance: ${currentChallenge.acceptance}\nExpected tokens: ${(currentChallenge.expectedTokens || []).join(', ')}\n\nBroken code:\n${currentChallenge.brokenCode}\n\nUser fixed code:\n${userCode}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'AI review failed');

      const parsed = parseJsonFromReply(data?.reply);
      if (!parsed) throw new Error('AI reply parse failed');

      const mergedScore = Math.round(((Number(parsed.score) || local.score) + local.score) / 2);
      return {
        passed: Boolean(parsed.passed) || mergedScore >= 65,
        score: mergedScore,
        feedback: parsed.feedback || local.feedback,
        aiFeedback: parsed.nextHint || 'Refine edge case handling and retry.',
      };
    } catch {
      return {
        passed: local.passed,
        score: local.score,
        feedback: local.feedback,
        aiFeedback: 'AI fallback used. Strengthen validation and error handling for better score.',
      };
    }
  };

  const submitFix = async () => {
    if (!challenge) return;
    setLastSubmittedAt(new Date());
    setIsReviewing(true);
    setPhase('reviewing');

    const local = localEvaluate({ challenge, userCode: code, brokenCode: challenge.brokenCode });
    const ai = await runAiReview({ currentChallenge: challenge, userCode: code, local });

    setSessionStats((prev) => {
      const topicKey = topicChoice || 'General';
      const currentTopic = prev.topics[topicKey] || { attempted: 0, passed: 0 };
      return {
        attempted: prev.attempted + 1,
        passed: prev.passed + (ai.passed ? 1 : 0),
        topics: {
          ...prev.topics,
          [topicKey]: {
            attempted: currentTopic.attempted + 1,
            passed: currentTopic.passed + (ai.passed ? 1 : 0),
          },
        },
      };
    });

    setResult({
      ...ai,
      reasons: local.reasons,
    });
    setIsReviewing(false);
    setPhase('result');
  };

  const nextQuestion = () => {
    const currentIndex = LEVEL_ORDER.indexOf(level);
    const canLevelUp = result?.passed && currentIndex < LEVEL_ORDER.length - 1;
    const nextLevel = canLevelUp ? LEVEL_ORDER[currentIndex + 1] : level;
    const nextQ = questionNumber + 1;

    setLevel(nextLevel);
    setQuestionNumber(nextQ);
    const picked = pickChallenge(nextLevel, nextQ, topicChoice, usedChallengeKeys, lastChallengeKey);
    const selected = {
      ...picked.challenge,
      title: `${topicChoice} • ${picked.challenge.title}`,
    };
    setChallenge(selected);
    setCode(selected.brokenCode);
    setResult(null);
    setLastSubmittedAt(null);
    setLastChallengeKey(picked.key);
    setUsedChallengeKeys((prev) => (prev.includes(picked.key) ? prev : [...prev, picked.key]));
    setPhase('running');
  };

  const submittedTimeLabel = lastSubmittedAt
    ? lastSubmittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const topicRows = useMemo(() => {
    return Object.entries(sessionStats.topics).map(([topic, stat]) => {
      const accuracy = stat.attempted > 0 ? Math.round((stat.passed / stat.attempted) * 100) : 0;
      const mastered = stat.passed >= 2 || (stat.attempted >= 3 && accuracy >= 70);
      return { topic, ...stat, accuracy, mastered };
    });
  }, [sessionStats]);

  const masteredCount = topicRows.filter((row) => row.mastered).length;

  const handleStopSession = () => {
    setPhase('stopped');
  };

  return (
    <div className="font-mono space-y-5">
      <section className="border-4 border-black bg-white p-4 md:p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Bug size={20} />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Issue Lab Arena</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 border-2 border-black bg-[#FFE145] text-[11px] font-black uppercase">Level: {level}</div>
            {phase !== 'setup' && phase !== 'stopped' && (
              <button
                onClick={handleStopSession}
                className="px-3 py-1 border-2 border-black bg-[#FFE8E8] text-[11px] font-black uppercase inline-flex items-center gap-1.5 hover:bg-[#FFD6D6]"
              >
                <Square size={12} /> Stop
              </button>
            )}
          </div>
        </div>
      </section>

      {phase === 'setup' && (
        <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black uppercase mb-4">Choose Issue Track</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black uppercase mb-2 block">Stack</label>
              <select
                value={stackChoice}
                onChange={(e) => setStackChoice(e.target.value)}
                className="w-full border-4 border-black bg-[#f8f8f8] px-3 py-3 font-black text-sm"
              >
                {stackOptions.map((stack) => (
                  <option key={stack.id} value={stack.id}>{stack.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black uppercase mb-2 block">Topic</label>
              <select
                value={topicChoice}
                onChange={(e) => setTopicChoice(e.target.value)}
                className="w-full border-4 border-black bg-[#f8f8f8] px-3 py-3 font-black text-sm"
              >
                {topics.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={startChallenge}
            className="mt-5 w-full md:w-auto px-6 py-3 border-4 border-black bg-[#33FF66] font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2"
          >
            <Play size={16} /> Start Challenge
          </button>
        </section>
      )}

      {phase === 'stopped' && (
        <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
          <div>
            <h3 className="text-lg font-black uppercase">Session Stopped</h3>
            <p className="text-xs font-bold text-black/60 mt-1 uppercase">Your issue-solving mastery snapshot</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border-2 border-black p-3 bg-[#f7f7f7]">
              <p className="text-[10px] font-black uppercase text-black/50">Questions Attempted</p>
              <p className="text-2xl font-black mt-1">{sessionStats.attempted}</p>
            </div>
            <div className="border-2 border-black p-3 bg-[#E8FFE8]">
              <p className="text-[10px] font-black uppercase text-black/50">Questions Solved</p>
              <p className="text-2xl font-black mt-1">{sessionStats.passed}</p>
            </div>
            <div className="border-2 border-black p-3 bg-[#FFF9E8]">
              <p className="text-[10px] font-black uppercase text-black/50">Topics Practiced</p>
              <p className="text-2xl font-black mt-1">{topicRows.length}</p>
            </div>
            <div className="border-2 border-black p-3 bg-[#E8F2FF]">
              <p className="text-[10px] font-black uppercase text-black/50">Mastered Topics</p>
              <p className="text-2xl font-black mt-1">{masteredCount}</p>
            </div>
          </div>

          <div className="border-2 border-black">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] bg-black text-white text-[10px] font-black uppercase tracking-wider">
              <div className="px-3 py-2">Topic</div>
              <div className="px-3 py-2">Solved</div>
              <div className="px-3 py-2">Attempts</div>
              <div className="px-3 py-2">Mastery</div>
            </div>

            {topicRows.length === 0 ? (
              <div className="px-3 py-4 text-xs font-bold">No submissions yet. Solve at least one question.</div>
            ) : (
              topicRows.map((row) => (
                <div key={row.topic} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] text-xs font-bold border-t-2 border-black/10">
                  <div className="px-3 py-2">{row.topic}</div>
                  <div className="px-3 py-2">{row.passed}</div>
                  <div className="px-3 py-2">{row.attempted}</div>
                  <div className={`px-3 py-2 font-black ${row.mastered ? 'text-[#1B8E3E]' : 'text-black/60'}`}>
                    {row.accuracy}% {row.mastered ? '(Mastered)' : ''}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setPhase(challenge ? 'running' : 'setup')}
              className="px-4 py-2 border-4 border-black bg-[#33FF66] font-black text-xs uppercase"
            >
              Resume Session
            </button>
            <button
              onClick={() => {
                setPhase('setup');
                setResult(null);
              }}
              className="px-4 py-2 border-4 border-black bg-white font-black text-xs uppercase"
            >
              Back To Setup
            </button>
          </div>
        </section>
      )}

      {phase !== 'setup' && challenge && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-[calc(100dvh-210px)]">
          <article className="border-4 border-black bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-0">
            <div className="px-4 py-3 border-b-4 border-black bg-[#f3f3f3]">
              <p className="text-[10px] font-black uppercase tracking-widest text-black/50">Question #{questionNumber} | {topicChoice}</p>
              <h3 className="text-lg font-black uppercase mt-1">{challenge.title}</h3>
            </div>

            <div className="p-4 space-y-4 text-sm font-bold overflow-auto min-h-0">
              <div>
                <p className="text-[11px] font-black uppercase text-black/50 mb-1">Description</p>
                <p className="text-black/80">{challenge.bugBrief}</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase text-black/50 mb-1">Acceptance Criteria</p>
                <p className="text-black/80">{challenge.acceptance}</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase text-black/50 mb-1">Expected Fix Signals</p>
                <div className="flex flex-wrap gap-2">
                  {(challenge.expectedTokens || []).map((token) => (
                    <span key={token} className="px-2 py-1 text-[10px] border-2 border-black bg-[#FFF9E8] uppercase">{token}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase text-black/50 mb-1">Broken Snippet</p>
                <pre className="border-2 border-black bg-[#fafafa] p-3 text-[12px] leading-relaxed whitespace-pre-wrap overflow-x-auto">{challenge.brokenCode}</pre>
              </div>
            </div>
          </article>

          <article className="border-4 border-black bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-0">
            <div className="px-4 py-2 border-b-4 border-black bg-black text-white text-[10px] font-black uppercase tracking-widest">
              Code Editor
            </div>

            <div className="flex-1 min-h-[220px]">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={code}
                theme="light"
                onChange={(value) => setCode(value || '')}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  tabSize: 2,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            </div>

            <div className="p-3 border-t-4 border-black bg-[#f7f7f7] flex flex-wrap gap-2">
              <button
                onClick={submitFix}
                disabled={isReviewing || phase === 'result'}
                className="px-4 py-2 border-4 border-black bg-[#00F0FF] font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
              >
                {isReviewing ? 'Submitted' : 'Submit'}
              </button>

              <button
                onClick={startChallenge}
                className="px-4 py-2 border-4 border-black bg-white font-black text-xs uppercase"
              >
                <RefreshCw size={12} className="inline mr-1" /> Reset
              </button>

              {phase === 'result' && result && (
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 border-4 border-black bg-[#33FF66] font-black text-xs uppercase"
                >
                  Next <ArrowRight size={12} className="inline ml-1" />
                </button>
              )}

              {lastSubmittedAt && (
                <div className={`ml-auto px-3 py-2 border-2 border-black text-[10px] font-black uppercase ${phase === 'reviewing' ? 'bg-[#FFF3CD]' : 'bg-[#E8FFE8]'}`}>
                  {phase === 'reviewing' ? 'Submitted • AI checking...' : `Submitted at ${submittedTimeLabel}`}
                </div>
              )}
            </div>

            {(phase === 'reviewing' || (phase === 'result' && result)) && (
              <div className={`border-t-4 border-black p-3 ${phase === 'reviewing' ? 'bg-[#FFF8D6]' : (result?.passed ? 'bg-[#E8FFE8]' : 'bg-[#FFE8E8]')}`}>
                {phase === 'reviewing' ? (
                  <p className="text-xs font-black uppercase flex items-center gap-2">
                    <Sparkles size={14} /> AI is validating your patch
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-black uppercase flex items-center gap-2">
                      {result.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {result.passed ? 'Accepted' : 'Try Again'} • Score {result.score}/100
                    </p>
                    <p className="text-xs font-bold mt-1 text-black/80 truncate" title={result.feedback}>{result.feedback}</p>
                  </>
                )}
              </div>
            )}
          </article>
        </section>
      )}

      {phase === 'result' && result && !result.passed && (
        <section className="border-4 border-black p-4 bg-[#FFE8E8] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold text-black/80">Hint: {result.aiFeedback}</p>
          {Array.isArray(result.reasons) && result.reasons.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.reasons.map((reason, idx) => (
                <p key={idx} className="text-xs font-bold">- {reason}</p>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              setResult(null);
              setPhase('running');
            }}
            className="mt-3 px-4 py-2 border-4 border-black bg-white font-black text-xs uppercase"
          >
            Retry Same Question
          </button>
        </section>
      )}
    </div>
  );
}
