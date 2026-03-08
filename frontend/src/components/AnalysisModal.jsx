import React from 'react';
import { X, DollarSign, Shield, TrendingUp, Box, CheckCircle, Loader2, Code2, FolderOpen } from 'lucide-react';

const ScoreBadge = ({ score }) => {
    const colors = {
        'A': 'bg-[#33FF66] text-black',
        'B': 'bg-[#00F0FF] text-black',
        'C': 'bg-[#FFD700] text-black',
        'D': 'bg-[#FF3366] text-white',
    };
    const letter = score?.charAt(0)?.toUpperCase() || '?';
    return (
        <span className={`font-black text-2xl px-3 py-1 border-3 border-black ${colors[letter] || 'bg-gray-300 text-black'}`}>
            {letter}
        </span>
    );
};

const AnalysisModal = ({ analysis, isLoading, onClose, folderName }) => {
    if (!isLoading && !analysis) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-[90vw] max-w-[700px] max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-4 border-black bg-[#FF3366]">
                    <h2 className="font-black text-xl uppercase tracking-wider text-white flex items-center gap-2">
                        <TrendingUp size={20} />
                        {folderName ? (
                            <span className="flex items-center gap-1"><FolderOpen size={18} /> {folderName}</span>
                        ) : (
                            'PROJECT ANALYSIS'
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-12 h-12 animate-spin text-[#FF3366] mb-4" />
                            <p className="font-black text-lg uppercase">
                                {folderName ? 'Scanning your project folder...' : 'Analyzing your stack...'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Cost · Security · Scalability · Architecture</p>
                        </div>
                    ) : analysis ? (
                        <>
                            {/* Summary */}
                            {analysis.summary && (
                                <div className="p-3 bg-gray-100 border-3 border-black">
                                    <p className="font-bold text-sm">{analysis.summary}</p>
                                </div>
                            )}

                            {/* Detected Stack Tags */}
                            {analysis.detected_stack?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {analysis.detected_stack.map((tech, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-black text-white font-black text-xs uppercase border-2 border-black">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Cost Section */}
                            {analysis.cost && (
                                <div className="border-3 border-black">
                                    <div className="bg-[#33FF66] px-4 py-2 border-b-3 border-black flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                            <DollarSign size={16} /> DEPLOYMENT COST
                                        </h3>
                                        <div className="text-right">
                                            <span className="font-black text-lg">{analysis.cost.monthly_estimate}</span>
                                            {analysis.cost.annual_estimate && (
                                                <p className="text-[10px] font-bold opacity-70">~{analysis.cost.annual_estimate}/yr</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        {analysis.cost.breakdown && (
                                            <table className="w-full text-xs font-bold">
                                                <thead>
                                                    <tr className="border-b-2 border-black">
                                                        <th className="text-left py-1 uppercase">Service</th>
                                                        <th className="text-left py-1 uppercase">Provider</th>
                                                        <th className="text-right py-1 uppercase">Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analysis.cost.breakdown.map((item, i) => (
                                                        <tr key={i} className="border-b border-gray-200">
                                                            <td className="py-1.5">{item.service}</td>
                                                            <td className="py-1.5 text-gray-600">{item.provider}</td>
                                                            <td className="py-1.5 text-right font-black">{item.cost}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        {analysis.cost.free_tier_possible && (
                                            <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-black">
                                                <CheckCircle size={12} /> Free tier possible!
                                            </div>
                                        )}
                                        {analysis.cost.tip && (
                                            <p className="mt-2 text-xs bg-[#FFD700]/30 p-2 border-2 border-black font-bold">
                                                💡 {analysis.cost.tip}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Security Section */}
                            {analysis.security && (
                                <div className="border-3 border-black">
                                    <div className="bg-[#00F0FF] px-4 py-2 border-b-3 border-black flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                            <Shield size={16} /> SECURITY ANALYSIS
                                        </h3>
                                        <ScoreBadge score={analysis.security.score} />
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {analysis.security.critical_fixes?.length > 0 && (
                                            <div className="p-2 bg-red-50 border-2 border-red-400">
                                                <p className="font-black text-xs uppercase text-red-600 mb-1">🚨 CRITICAL FIXES</p>
                                                <ul className="text-xs font-bold space-y-0.5 text-red-700">
                                                    {analysis.security.critical_fixes.map((f, i) => <li key={i}>• {f}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.security.strengths?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-green-600 mb-1">✅ Strengths</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.security.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.security.vulnerabilities?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-red-500 mb-1">⚠️ Vulnerabilities</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.security.vulnerabilities.map((v, i) => <li key={i}>• {v}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.security.recommendations?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-blue-600 mb-1">🔒 Recommendations</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.security.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Scalability */}
                            {analysis.scalability && (
                                <div className="border-3 border-black">
                                    <div className="bg-[#FFD700] px-4 py-2 border-b-3 border-black flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                            <TrendingUp size={16} /> SCALABILITY
                                        </h3>
                                        <ScoreBadge score={analysis.scalability.score} />
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {analysis.scalability.max_concurrent_users && (
                                            <p className="text-xs font-bold">
                                                👥 Max concurrent users: <span className="font-black text-[#FF3366]">{analysis.scalability.max_concurrent_users}</span>
                                            </p>
                                        )}
                                        {analysis.scalability.bottlenecks?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-orange-500 mb-1">🔥 Bottlenecks</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.scalability.bottlenecks.map((b, i) => <li key={i}>• {b}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.scalability.improvements?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-green-600 mb-1">📈 Improvements</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.scalability.improvements.map((imp, i) => <li key={i}>• {imp}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Architecture */}
                            {analysis.architecture && (
                                <div className="border-3 border-black">
                                    <div className="bg-[#d63aff] px-4 py-2 border-b-3 border-black">
                                        <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                                            <Box size={16} /> ARCHITECTURE: {analysis.architecture.pattern?.toUpperCase()}
                                        </h3>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {analysis.architecture.weaknesses?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-red-500 mb-1">⚠️ Weaknesses</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.architecture.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.architecture.missing_components?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-orange-500 mb-1">🧩 Missing Components</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.architecture.missing_components.map((m, i) => <li key={i}>• {m}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.architecture.production_checklist?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-green-600 mb-1">✅ Production Checklist</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.architecture.production_checklist.map((c, i) => (
                                                        <li key={i} className="flex items-center gap-1">
                                                            <CheckCircle size={10} className="text-green-500 shrink-0" /> {c}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Code Quality */}
                            {analysis.code_quality && (
                                <div className="border-3 border-black">
                                    <div className="bg-[#1a1a2e] px-4 py-2 border-b-3 border-black flex items-center justify-between">
                                        <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                                            <Code2 size={16} /> CODE QUALITY
                                        </h3>
                                        <ScoreBadge score={analysis.code_quality.score} />
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {analysis.code_quality.issues?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-red-500 mb-1">🐛 Issues</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.code_quality.issues.map((issue, i) => <li key={i}>• {issue}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {analysis.code_quality.suggestions?.length > 0 && (
                                            <div>
                                                <p className="font-black text-xs uppercase text-blue-600 mb-1">💡 Suggestions</p>
                                                <ul className="text-xs font-bold space-y-0.5">
                                                    {analysis.code_quality.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-center text-gray-500 py-8 font-bold">No analysis data</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;
