import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, BadgeIndianRupee, Shield, Cpu, Layers, Bug, ClipboardCheck, AlertTriangle, Github, Link2Off, RefreshCw } from 'lucide-react';
import { STACKS } from '../constants/stacks.jsx';

const STACK_TECH_MAP = {
  react: ['React', 'JavaScript', 'Vite'],
  next: ['Next.js', 'React', 'Node.js'],
  vue: ['Vue', 'JavaScript'],
  angular: ['Angular', 'TypeScript'],
  node: ['Node.js', 'Express'],
  express: ['Express', 'Node.js'],
  python: ['Python', 'FastAPI'],
  mern: ['MongoDB', 'Express', 'React', 'Node.js'],
  mean: ['MongoDB', 'Express', 'Angular', 'Node.js'],
  docker: ['Docker', 'Container Runtime'],
  aws: ['AWS', 'Cloud Infrastructure'],
};

function getStackPayload(selectedStackId) {
  const stackMeta = STACKS.find((stack) => stack.id === selectedStackId);
  if (!stackMeta) return ['JavaScript', 'Web App'];

  const mapped = STACK_TECH_MAP[selectedStackId];
  if (mapped && mapped.length > 0) return mapped;

  return [stackMeta.title.replace(/\s*\/.*/, '').trim(), 'Web Application'];
}

function fallbackAnalysis(techList) {
  return {
    summary: `This stack is suitable for MVP delivery. Keep architecture modular and prioritize observability from day one for faster debugging cycles.`,
    detected_stack: techList,
    cost: {
      monthly_estimate: '$10 - $60/month',
      annual_estimate: '$120 - $720/year',
      free_tier_possible: true,
      tip: 'Use managed free tiers first, then scale paid services based on traffic.',
      breakdown: [
        { service: 'Hosting', provider: 'Vercel/Render', cost: '$0 - $20/mo', note: 'Frontend + basic API hosting' },
        { service: 'Database', provider: 'MongoDB Atlas/Neon', cost: '$0 - $20/mo', note: 'Shared tier for early stage' },
      ],
    },
    security: {
      score: 'B',
      strengths: ['Modern framework defaults'],
      vulnerabilities: ['Input validation gaps can appear in rapid MVP builds'],
      critical_fixes: ['Add request validation and rate limiting'],
      recommendations: ['Enable centralized logging and auth audit trails'],
    },
    scalability: {
      score: 'B',
      max_concurrent_users: '500 - 3k',
      bottlenecks: ['Database query hotspots', 'Single region deployment'],
      improvements: ['Add caching layer', 'Enable horizontal scaling'],
    },
  };
}

const CODEQL_RULES = [
  {
    id: 'js/eval-injection',
    title: 'Dynamic eval usage',
    severity: 'high',
    cwe: 'CWE-95',
    pattern: /\beval\s*\(/g,
    message: 'Using eval can lead to code injection vulnerabilities.',
    fix: 'Replace eval with explicit parsing or safe function maps.',
  },
  {
    id: 'js/xss-innerhtml',
    title: 'Potential DOM XSS via innerHTML',
    severity: 'high',
    cwe: 'CWE-79',
    pattern: /\.innerHTML\s*=\s*/g,
    message: 'Direct innerHTML assignment may allow script injection.',
    fix: 'Use textContent or sanitize trusted HTML before assignment.',
  },
  {
    id: 'js/exec-command',
    title: 'Command execution sink detected',
    severity: 'high',
    cwe: 'CWE-78',
    pattern: /(?:exec|spawn|execSync)\s*\(/g,
    message: 'Command execution APIs can introduce injection risk.',
    fix: 'Validate inputs and prefer parameterized safe command wrappers.',
  },
  {
    id: 'js/insecure-jwt-secret',
    title: 'Hardcoded weak JWT secret',
    severity: 'medium',
    cwe: 'CWE-798',
    pattern: /jwt\.sign\([^)]*['"][^'"\n]{1,12}['"]/g,
    message: 'Short or hardcoded secret found in JWT signing.',
    fix: 'Use strong env-based secret with rotation policy.',
  },
  {
    id: 'js/sql-string-concat',
    title: 'Potential SQL string concatenation',
    severity: 'medium',
    cwe: 'CWE-89',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]{0,80}(?:\+|\$\{)/gi,
    message: 'Dynamic SQL string building may lead to SQL injection.',
    fix: 'Use parameterized queries or ORM query bindings.',
  },
  {
    id: 'js/debug-data-leak',
    title: 'Verbose console logging',
    severity: 'low',
    cwe: 'CWE-532',
    pattern: /console\.(?:log|debug|info)\s*\(/g,
    message: 'Console logs may expose sensitive runtime details.',
    fix: 'Remove non-essential logs or use redacted structured logger.',
  },
];

function indexToLine(source, index) {
  if (index <= 0) return 1;
  return source.slice(0, index).split('\n').length;
}

function runCodeQlLikeScan(code) {
  const source = (code || '').trim();
  if (!source) {
    return { score: 100, findings: [] };
  }

  const findings = [];
  CODEQL_RULES.forEach((rule) => {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match = regex.exec(source);
    while (match) {
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        severity: rule.severity,
        cwe: rule.cwe,
        line: indexToLine(source, match.index),
        message: rule.message,
        fix: rule.fix,
      });
      match = regex.exec(source);
    }
  });

  const weights = { high: 15, medium: 8, low: 3 };
  const penalty = findings.reduce((sum, item) => sum + (weights[item.severity] || 2), 0);
  const score = Math.max(0, 100 - penalty);

  return { score, findings };
}

function runCodeRabbitLikeReview(code) {
  const source = (code || '').trim();
  if (!source) return [];

  const lines = source.split('\n');
  const suggestions = [];

  if (lines.length > 120) {
    suggestions.push({ priority: 'high', title: 'File too large', detail: 'Split into smaller modules for maintainability and review speed.' });
  }

  const longFunctions = source.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{240,}?\}/g);
  if (longFunctions && longFunctions.length > 0) {
    suggestions.push({ priority: 'high', title: 'Long function detected', detail: 'Extract helper methods and keep each function focused on one responsibility.' });
  }

  const consoleCount = (source.match(/console\.(log|info|debug|warn|error)\s*\(/g) || []).length;
  if (consoleCount >= 4) {
    suggestions.push({ priority: 'medium', title: 'Excessive console usage', detail: 'Replace debug logs with structured logger and remove noise logs before production.' });
  }

  const asyncWithoutTry = /async\s+function[\s\S]{0,220}await[\s\S]{0,220}(?![\s\S]*catch\s*\()/m.test(source);
  if (asyncWithoutTry) {
    suggestions.push({ priority: 'high', title: 'Async path lacks error boundary', detail: 'Wrap awaited operations with try/catch and return typed fallback response.' });
  }

  const magicNumbers = source.match(/\b\d{2,}\b/g) || [];
  if (magicNumbers.length >= 3) {
    suggestions.push({ priority: 'low', title: 'Magic numbers present', detail: 'Move constants to named config variables for readability.' });
  }

  if (!/test\(|describe\(/.test(source)) {
    suggestions.push({ priority: 'medium', title: 'No visible test hooks', detail: 'Add unit tests for core branches and edge cases to stabilize changes.' });
  }

  return suggestions;
}

export default function AnalyzerPanel({ selectedStack }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [githubStatus, setGithubStatus] = useState({ connected: false, username: '' });
  const [repoList, setRepoList] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoFiles, setRepoFiles] = useState([]);
  const [repoFilesLoading, setRepoFilesLoading] = useState(false);
  const [repoFilesError, setRepoFilesError] = useState('');
  const [repoFileFilter, setRepoFileFilter] = useState('');
  const [codeqlQuery, setCodeqlQuery] = useState('SELECT * FROM findings ORDER BY severity DESC LIMIT 50');
  const [codeqlSemanticLoading, setCodeqlSemanticLoading] = useState(false);
  const [codeqlSemanticResult, setCodeqlSemanticResult] = useState(null);
  const [officialCodeqlLoading, setOfficialCodeqlLoading] = useState(false);
  const [officialCodeqlResult, setOfficialCodeqlResult] = useState(null);

  const stackMeta = useMemo(
    () => STACKS.find((stack) => stack.id === selectedStack),
    [selectedStack]
  );

  const loadGithubStatus = async () => {
    try {
      const res = await fetch('/api/auth/github/status', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load GitHub status');
      setGithubStatus(data);
      return data;
    } catch {
      setGithubStatus({ connected: false, username: '' });
      return { connected: false };
    }
  };

  const loadRepos = async () => {
    setRepoLoading(true);
    try {
      const res = await fetch('/api/auth/github/repos', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch repositories');

      const repos = data?.repos || [];
      setRepoList(repos);
      if (repos.length > 0) {
        setSelectedRepo((prev) => prev || repos[0].full_name);
      }
    } catch (err) {
      setError(err.message);
      setRepoList([]);
      setSelectedRepo('');
    } finally {
      setRepoLoading(false);
    }
  };

  const loadRepoFiles = async (repoFullName) => {
    if (!repoFullName) {
      setRepoFiles([]);
      setRepoFilesError('');
      return;
    }

    setRepoFilesLoading(true);
    setRepoFilesError('');
    try {
      const params = new URLSearchParams({ repoFullName });
      const res = await fetch(`/api/auth/github/repo-files?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch repository files');

      const files = Array.isArray(data?.files) ? data.files : [];
      setRepoFiles(files);
    } catch (err) {
      setRepoFiles([]);
      setRepoFilesError(err.message);
    } finally {
      setRepoFilesLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const status = await loadGithubStatus();
      if (status.connected) {
        await loadRepos();
      }
    };
    init();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') {
      loadGithubStatus().then((status) => {
        if (status.connected) loadRepos();
      });
      params.delete('github');
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  useEffect(() => {
    if (!githubStatus.connected || !selectedRepo) {
      setRepoFiles([]);
      setRepoFilesError('');
      return;
    }
    loadRepoFiles(selectedRepo);
  }, [githubStatus.connected, selectedRepo]);

  const visibleRepoFiles = useMemo(() => {
    if (!repoFileFilter.trim()) return repoFiles;
    const term = repoFileFilter.trim().toLowerCase();
    return repoFiles.filter((file) => String(file.path || '').toLowerCase().includes(term));
  }, [repoFiles, repoFileFilter]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');

    const stackPayload = getStackPayload(selectedStack);

    try {
      const res = await fetch('/api/ai/analyze-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stack: stackPayload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Analysis failed');
      setAnalysis(data);
    } catch (err) {
      setError(`${err.message}. Showing fallback analysis.`);
      setAnalysis(fallbackAnalysis(stackPayload));
    } finally {
      setLoading(false);
    }
  };

  const handleDeepScan = () => {
    const codeql = runCodeQlLikeScan(codeInput);
    const rabbit = runCodeRabbitLikeReview(codeInput);
    setScanResult({ codeql, rabbit });
  };

  const handleConnectGithub = () => {
    window.location.href = '/api/auth/github/connect';
  };

  const handleDisconnectGithub = async () => {
    try {
      const res = await fetch('/api/auth/github/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to disconnect');

      setGithubStatus({ connected: false, username: '' });
      setRepoList([]);
      setSelectedRepo('');
      setRepoFiles([]);
      setRepoFilesError('');
      setRepoFileFilter('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnalyzeRepo = async () => {
    if (!selectedRepo) {
      setError('Select a repository first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const repoUrl = `https://github.com/${selectedRepo}`;
      const res = await fetch('/api/ai/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Repo analysis failed');
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeqlSemanticQuery = async () => {
    if (!selectedRepo) {
      setError('Select a repository first');
      return;
    }

    setCodeqlSemanticLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/codeql-semantic-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repoFullName: selectedRepo,
          query: codeqlQuery,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'CodeQL semantic query failed');
      setCodeqlSemanticResult(data);
    } catch (err) {
      setCodeqlSemanticResult(null);
      setError(err.message);
    } finally {
      setCodeqlSemanticLoading(false);
    }
  };

  const handleFetchOfficialCodeqlAlerts = async () => {
    if (!selectedRepo) {
      setError('Select a repository first');
      return;
    }

    setOfficialCodeqlLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/github-codeql-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repoFullName: selectedRepo,
          state: 'open',
          perPage: 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setOfficialCodeqlResult({
            mode: 'github-official-codeql-alerts',
            totalReturned: 0,
            severityCounts: {},
            alerts: [],
            setupRequired: true,
            message: data?.error || 'Official CodeQL alerts not found yet. Falling back to semantic scan.',
          });

          // Fallback to our open-source semantic scan so user still gets security signal.
          const fallbackRes = await fetch('/api/ai/codeql-semantic-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              repoFullName: selectedRepo,
              query: codeqlQuery,
            }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok) {
            setCodeqlSemanticResult(fallbackData);
            setError('Official CodeQL alerts not available yet. Showing semantic scan fallback results.');
            return;
          }
        }

        throw new Error(data?.error || 'Failed to fetch official GitHub CodeQL alerts');
      }
      setOfficialCodeqlResult(data);
    } catch (err) {
      setOfficialCodeqlResult(null);
      setError(err.message);
    } finally {
      setOfficialCodeqlLoading(false);
    }
  };

  return (
    <div className="font-mono space-y-6">
      <section className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Search size={20} /> Code Analyzer
            </h2>
            <p className="text-xs font-bold text-black/60 mt-2 uppercase tracking-wide">
              Stack: {stackMeta?.title || 'General Web Stack'}
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-5 py-3 border-4 border-black bg-[#00F0FF] font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
          >
            {loading ? 'Analyzing...' : 'Run Analyzer'}
          </button>
        </div>
        {error && <p className="mt-3 text-xs font-black text-[#B00020] uppercase">{error}</p>}
      </section>

      <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-black uppercase flex items-center gap-2"><Github size={16} /> GitHub Connected Repos</h3>
          {!githubStatus.connected ? (
            <button
              onClick={handleConnectGithub}
              className="px-4 py-2 border-4 border-black bg-[#111] text-white font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              Connect GitHub
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2 py-1 border-2 border-black bg-[#E8FFE8]">
                Connected: {githubStatus.username || 'GitHub User'}
              </span>
              <button
                onClick={loadRepos}
                className="px-3 py-2 border-2 border-black bg-white font-black text-[10px] uppercase"
              >
                <RefreshCw size={12} className="inline mr-1" /> Refresh
              </button>
              <button
                onClick={handleDisconnectGithub}
                className="px-3 py-2 border-2 border-black bg-[#FFE8E8] font-black text-[10px] uppercase"
              >
                <Link2Off size={12} className="inline mr-1" /> Disconnect
              </button>
            </div>
          )}
        </div>

        {!githubStatus.connected ? (
          <p className="text-xs font-bold text-black/60">Connect GitHub to analyze private/public repositories like CodeRabbit workflow.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="text-[11px] font-black uppercase mb-2 block">Select Repository</label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  disabled={repoLoading || repoList.length === 0}
                  className="w-full border-4 border-black bg-[#f9f9f9] px-3 py-3 text-sm font-black"
                >
                  {repoList.length === 0 ? (
                    <option value="">{repoLoading ? 'Loading repos...' : 'No repos available'}</option>
                  ) : (
                    repoList.map((repo) => (
                      <option key={repo.id} value={repo.full_name}>
                        {repo.full_name}{repo.private ? ' (private)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <button
                onClick={handleAnalyzeRepo}
                disabled={!selectedRepo || repoLoading || loading}
                className="px-5 py-3 border-4 border-black bg-[#FFE145] font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                Analyze Repo
              </button>
            </div>

            {selectedRepo && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="border-4 border-black bg-[#F8FBFF] p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="text-[11px] font-black uppercase">Repository Files</h4>
                    <p className="text-[10px] font-black uppercase text-black/70">
                      Showing {visibleRepoFiles.length} of {repoFiles.length}
                    </p>
                  </div>

                  <input
                    type="text"
                    value={repoFileFilter}
                    onChange={(e) => setRepoFileFilter(e.target.value)}
                    placeholder="Filter by path, e.g. src/components"
                    className="w-full border-2 border-black px-3 py-2 text-xs font-black bg-white"
                  />

                  {repoFilesLoading ? (
                    <p className="text-xs font-black uppercase">Loading repository files...</p>
                  ) : repoFilesError ? (
                    <p className="text-xs font-black text-[#B00020] uppercase">{repoFilesError}</p>
                  ) : visibleRepoFiles.length === 0 ? (
                    <p className="text-xs font-bold text-black/70">No files matched this filter.</p>
                  ) : (
                    <div className="max-h-56 overflow-auto border-2 border-black bg-white">
                      <ul className="divide-y-2 divide-black">
                        {visibleRepoFiles.slice(0, 300).map((file) => (
                          <li key={file.sha || file.path} className="px-3 py-2 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-black truncate" title={file.path}>{file.path}</p>
                            <span className="text-[10px] font-black text-black/60 shrink-0">{file.size || 0} B</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {visibleRepoFiles.length > 300 && (
                    <p className="text-[10px] font-black uppercase text-black/60">
                      Showing first 300 filtered files for readability.
                    </p>
                  )}
                </div>

                <div className="border-4 border-black bg-[#FFF9E6] p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="text-[11px] font-black uppercase">CodeQL Open Source Semantic Query</h4>
                    <button
                      onClick={handleCodeqlSemanticQuery}
                      disabled={codeqlSemanticLoading || !selectedRepo}
                      className="px-3 py-2 border-2 border-black bg-[#FFE145] font-black text-[10px] uppercase disabled:opacity-60"
                    >
                      {codeqlSemanticLoading ? 'Running...' : 'Run SQL Query'}
                    </button>
                  </div>

                  <textarea
                    value={codeqlQuery}
                    onChange={(e) => setCodeqlQuery(e.target.value)}
                    className="w-full min-h-[92px] border-2 border-black p-2 text-[11px] font-black bg-white"
                    placeholder='SELECT * FROM findings WHERE severity = "high" ORDER BY line DESC LIMIT 20'
                  />

                  <p className="text-[10px] font-bold text-black/70">
                    Supports: SELECT, WHERE (=, LIKE, IN), ORDER BY, LIMIT on virtual findings table.
                  </p>

                  {codeqlSemanticResult && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="border-2 border-black bg-white p-2">
                          <p className="text-[10px] font-black uppercase">Score</p>
                          <p className="text-sm font-black">{codeqlSemanticResult.score}/100</p>
                        </div>
                        <div className="border-2 border-black bg-white p-2">
                          <p className="text-[10px] font-black uppercase">Findings</p>
                          <p className="text-sm font-black">{codeqlSemanticResult.findingsTotal}</p>
                        </div>
                      </div>

                      <p className="text-[10px] font-black uppercase text-black/70">
                        Matched {codeqlSemanticResult.matchedRows} rows from {codeqlSemanticResult.filesScanned} scanned files
                      </p>

                      {Array.isArray(codeqlSemanticResult.rows) && codeqlSemanticResult.rows.length > 0 ? (
                        <div className="max-h-56 overflow-auto border-2 border-black bg-white">
                          <table className="w-full text-[10px] font-black">
                            <thead className="sticky top-0 bg-black text-white">
                              <tr>
                                <th className="text-left px-2 py-1">Severity</th>
                                <th className="text-left px-2 py-1">Rule</th>
                                <th className="text-left px-2 py-1">Path</th>
                                <th className="text-left px-2 py-1">Line</th>
                              </tr>
                            </thead>
                            <tbody>
                              {codeqlSemanticResult.rows.slice(0, 120).map((row, idx) => (
                                <tr key={`${row.ruleId || 'r'}-${row.path || 'p'}-${row.line || idx}-${idx}`} className="border-t border-black/20">
                                  <td className="px-2 py-1 uppercase">{row.severity || '-'}</td>
                                  <td className="px-2 py-1">{row.ruleId || row.title || '-'}</td>
                                  <td className="px-2 py-1 max-w-[260px] truncate" title={row.path}>{row.path || '-'}</td>
                                  <td className="px-2 py-1">{row.line || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs font-bold">No rows returned for current query.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-4 border-black bg-[#EFFFF6] p-3 space-y-3 xl:col-span-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="text-[11px] font-black uppercase">Official GitHub CodeQL Alerts</h4>
                    <button
                      onClick={handleFetchOfficialCodeqlAlerts}
                      disabled={officialCodeqlLoading || !selectedRepo}
                      className="px-3 py-2 border-2 border-black bg-[#9BFFB0] font-black text-[10px] uppercase disabled:opacity-60"
                    >
                      {officialCodeqlLoading ? 'Fetching...' : 'Fetch Official Alerts'}
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-black/70">
                    Pulls real GitHub Code Scanning alerts generated by CodeQL workflows from your selected repository.
                  </p>

                  {officialCodeqlResult && (
                    <div className="space-y-2">
                      {officialCodeqlResult.setupRequired && (
                        <p className="text-xs font-black uppercase text-[#8A3A00]">
                          CodeQL workflow not detected for this repository yet. Run GitHub CodeQL analysis once to get official alerts.
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="border-2 border-black bg-white p-2">
                          <p className="text-[10px] font-black uppercase">Alerts</p>
                          <p className="text-sm font-black">{officialCodeqlResult.totalReturned || 0}</p>
                        </div>
                        <div className="border-2 border-black bg-white p-2">
                          <p className="text-[10px] font-black uppercase">High</p>
                          <p className="text-sm font-black">{officialCodeqlResult.severityCounts?.high || 0}</p>
                        </div>
                        <div className="border-2 border-black bg-white p-2">
                          <p className="text-[10px] font-black uppercase">Medium</p>
                          <p className="text-sm font-black">{officialCodeqlResult.severityCounts?.medium || 0}</p>
                        </div>
                        <div className="border-2 border-black bg-white p-2">
                          <p className="text-[10px] font-black uppercase">Low</p>
                          <p className="text-sm font-black">{officialCodeqlResult.severityCounts?.low || 0}</p>
                        </div>
                      </div>

                      {Array.isArray(officialCodeqlResult.alerts) && officialCodeqlResult.alerts.length > 0 ? (
                        <div className="max-h-64 overflow-auto border-2 border-black bg-white">
                          <table className="w-full text-[10px] font-black">
                            <thead className="sticky top-0 bg-black text-white">
                              <tr>
                                <th className="text-left px-2 py-1">Severity</th>
                                <th className="text-left px-2 py-1">Rule</th>
                                <th className="text-left px-2 py-1">Path</th>
                                <th className="text-left px-2 py-1">Line</th>
                                <th className="text-left px-2 py-1">State</th>
                              </tr>
                            </thead>
                            <tbody>
                              {officialCodeqlResult.alerts.map((alert) => (
                                <tr key={`gh-codeql-${alert.number}`} className="border-t border-black/20">
                                  <td className="px-2 py-1 uppercase">{alert.severity || '-'}</td>
                                  <td className="px-2 py-1">{alert.ruleId || '-'}</td>
                                  <td className="px-2 py-1 max-w-[260px] truncate" title={alert.mostRecentInstance?.path || ''}>{alert.mostRecentInstance?.path || '-'}</td>
                                  <td className="px-2 py-1">{alert.mostRecentInstance?.line || '-'}</td>
                                  <td className="px-2 py-1 uppercase">{alert.state || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs font-bold">No official open CodeQL alerts found for this repository.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {loading && (
        <section className="border-4 border-black bg-white p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-sm font-black uppercase">Scanning Stack Architecture...</p>
        </section>
      )}

      {analysis && !loading && (
        <>
          <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-black uppercase mb-2 flex items-center gap-2"><Layers size={16} /> Summary</h3>
            <p className="text-sm font-bold leading-relaxed text-black/80">{analysis.summary || 'No summary available.'}</p>
            {Array.isArray(analysis.detected_stack) && analysis.detected_stack.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.detected_stack.slice(0, 8).map((item, idx) => (
                  <span key={idx} className="text-[10px] font-black uppercase bg-black text-white px-2 py-1">{item}</span>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-4 border-black bg-[#FFF3CD] p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="text-[11px] font-black uppercase mb-2 flex items-center gap-2"><BadgeIndianRupee size={14} /> Cost</h4>
              <p className="text-lg font-black">{analysis.cost?.monthly_estimate || 'N/A'}</p>
              <p className="text-[11px] font-bold text-black/60">{analysis.cost?.annual_estimate || ''}</p>
            </div>

            <div className="border-4 border-black bg-[#E8FFE8] p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="text-[11px] font-black uppercase mb-2 flex items-center gap-2"><Shield size={14} /> Security</h4>
              <p className="text-lg font-black">Score {analysis.security?.score || 'N/A'}</p>
              <p className="text-[11px] font-bold text-black/60">{analysis.security?.critical_fixes?.[0] || 'No critical fix listed'}</p>
            </div>

            <div className="border-4 border-black bg-[#E8F2FF] p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="text-[11px] font-black uppercase mb-2 flex items-center gap-2"><Cpu size={14} /> Scalability</h4>
              <p className="text-lg font-black">Score {analysis.scalability?.score || 'N/A'}</p>
              <p className="text-[11px] font-bold text-black/60">{analysis.scalability?.max_concurrent_users || 'Unknown range'}</p>
            </div>
          </section>

          <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h3 className="text-sm font-black uppercase flex items-center gap-2"><Bug size={16} /> Deep Analyzer (CodeQL + CodeRabbit Core)</h3>
              <button
                onClick={handleDeepScan}
                className="px-4 py-2 border-4 border-black bg-[#FFE145] font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                Run Deep Scan
              </button>
            </div>

            <textarea
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Paste code here for security scan + review suggestions..."
              className="w-full min-h-[180px] border-4 border-black p-3 text-xs font-bold bg-[#f9f9f9] focus:outline-none"
            />

            {scanResult && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border-4 border-black bg-[#FFF8F8] p-4">
                  <h4 className="text-[11px] font-black uppercase mb-2 flex items-center gap-2"><AlertTriangle size={14} /> CodeQL-style Findings</h4>
                  <p className="text-xs font-black uppercase mb-2">Security Score: {scanResult.codeql.score}/100</p>
                  {scanResult.codeql.findings.length === 0 ? (
                    <p className="text-xs font-bold">No critical pattern hit detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {scanResult.codeql.findings.slice(0, 10).map((finding, idx) => (
                        <div key={`${finding.ruleId}-${idx}`} className="border-2 border-black p-2 bg-white">
                          <p className="text-[11px] font-black uppercase">[{finding.severity}] {finding.title}</p>
                          <p className="text-[10px] font-bold mt-1">Rule: {finding.ruleId} • {finding.cwe} • line {finding.line}</p>
                          <p className="text-[11px] font-bold mt-1">{finding.message}</p>
                          <p className="text-[10px] font-bold mt-1 text-black/70">Fix: {finding.fix}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-4 border-black bg-[#F5FBFF] p-4">
                  <h4 className="text-[11px] font-black uppercase mb-2 flex items-center gap-2"><ClipboardCheck size={14} /> CodeRabbit-style Review</h4>
                  {scanResult.rabbit.length === 0 ? (
                    <p className="text-xs font-bold">No major maintainability issue detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {scanResult.rabbit.map((item, idx) => (
                        <div key={`${item.title}-${idx}`} className="border-2 border-black p-2 bg-white">
                          <p className="text-[11px] font-black uppercase">[{item.priority}] {item.title}</p>
                          <p className="text-[11px] font-bold mt-1">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
