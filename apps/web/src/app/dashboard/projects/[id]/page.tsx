'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import {
    ArrowLeft,
    FolderKanban,
    AlertTriangle,
    Shield,
    Calendar,
    Clock,
    RefreshCw,
    Loader2,
    CheckCircle,
    XCircle,
    ChevronRight,
    FileSearch,
    Tag,
} from 'lucide-react';
import { useProject, useProjectScans, useProjectVulnerabilityTrend, Scan } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution, useProjectAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

function getRiskBadge(riskLevel?: string) {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
        LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        NONE: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    };
    const level = riskLevel || 'NONE';
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${colors[level] || colors.NONE}`}>
            {level === 'NONE' ? '안전' : level}
        </span>
    );
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'COMPLETED':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'FAILED':
            return <XCircle className="h-4 w-4 text-red-500" />;
        case 'RUNNING':
            return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
        default:
            return <Clock className="h-4 w-4 text-slate-400" />;
    }
}

function formatDate(dateString?: string) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Mock trend data for demo
const mockTrendData = [
    { date: '12/10', critical: 5, high: 12, medium: 28, low: 45 },
    { date: '12/11', critical: 5, high: 11, medium: 26, low: 43 },
    { date: '12/12', critical: 4, high: 10, medium: 25, low: 42 },
    { date: '12/13', critical: 4, high: 10, medium: 24, low: 40 },
    { date: '12/14', critical: 3, high: 9, medium: 23, low: 38 },
    { date: '12/15', critical: 3, high: 8, medium: 22, low: 36 },
    { date: '12/16', critical: 2, high: 8, medium: 21, low: 35 },
    { date: '12/17', critical: 2, high: 7, medium: 20, low: 34 },
];

export default function ProjectDetailPage() {
    const params = useParams();
    const projectId = params.id as string;

    const { data: project, isLoading: projectLoading, error: projectError, refetch } = useProject(projectId);
    const { data: scansData, isLoading: scansLoading } = useProjectScans(projectId);
    const { data: trendData } = useProjectVulnerabilityTrend(projectId);

    const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    // AI Execution
    const collectProjectContext = useProjectAiContext();
    const {
        execute: executeProjectAnalysis,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('project.analysis', { entityId: projectId });

    const { activePanel, closePanel } = useAiStore();

    const handleAiAnalysis = () => {
        const context = collectProjectContext(project, scansData?.data || []);
        executeProjectAnalysis(context);
    };

    const handleRegenerate = () => {
        const context = collectProjectContext(project, scansData?.data || []);
        executeProjectAnalysis(context);
    };

    const estimatedTokens = project ? estimateTokens(collectProjectContext(project, scansData?.data || [])) : 0;

    if (projectLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (projectError || !project) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-slate-600 dark:text-slate-400">프로젝트를 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    다시 시도
                </button>
            </div>
        );
    }

    const scans = scansData?.data || [];
    const chartData = trendData || mockTrendData;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/projects"
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
                            <p className="text-slate-500">{project.slug}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AiButton
                        action="project.analysis"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiAnalysis}
                        onCancel={cancelAi}
                    />
                    {getRiskBadge(project.riskLevel)}
                    {project.policyViolations && project.policyViolations > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                            <Shield className="h-3 w-3" />
                            {project.policyViolations} 정책 위반
                        </span>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Critical</p>
                            <p className="text-2xl font-bold text-red-600">{project.stats?.vulnerabilities.critical || 0}</p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">High</p>
                            <p className="text-2xl font-bold text-orange-600">{project.stats?.vulnerabilities.high || 0}</p>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Medium</p>
                            <p className="text-2xl font-bold text-yellow-600">{project.stats?.vulnerabilities.medium || 0}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">총 스캔</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{project.stats?.totalScans || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FileSearch className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Vulnerability Trend Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">취약점 수 추이</h3>
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                        {(['7d', '30d', '90d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setSelectedTimeRange(range)}
                                className={`px-3 py-1 ${selectedTimeRange === range
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {range === '7d' ? '7일' : range === '30d' ? '30일' : '90일'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip />
                            <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} name="Critical" />
                            <Line type="monotone" dataKey="high" stroke="#ea580c" strokeWidth={2} name="High" />
                            <Line type="monotone" dataKey="medium" stroke="#ca8a04" strokeWidth={2} name="Medium" />
                            <Line type="monotone" dataKey="low" stroke="#2563eb" strokeWidth={2} name="Low" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Scan History */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">이미지 태그별 스캔 이력</h3>
                </div>
                {scansLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : scans.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <FileSearch className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                        <p>스캔 이력이 없습니다.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    이미지 / 태그
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    취약점
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    스캔 일시
                                </th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {scans.map((scan: Scan) => (
                                <tr key={scan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Tag className="h-4 w-4 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{scan.targetName}</p>
                                                <p className="text-sm text-slate-500">{scan.scanType}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(scan.status)}
                                            <span className="text-sm text-slate-600 dark:text-slate-300">{scan.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {scan.summary ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">
                                                    C:{scan.summary.critical}
                                                </span>
                                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs">
                                                    H:{scan.summary.high}
                                                </span>
                                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs">
                                                    M:{scan.summary.medium}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(scan.startedAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/scans/${scan.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            상세
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === `project.analysis:${projectId}`}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleRegenerate}
                action="project.analysis"
            />
        </div>
    );
}
