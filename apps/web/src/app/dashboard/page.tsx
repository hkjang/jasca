'use client';

import { useRouter } from 'next/navigation';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from 'recharts';
import { AlertTriangle, Shield, CheckCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/ui/badge';
import { useStatsOverview, useStatsByProject, useStatsTrend } from '@/lib/api-hooks';
import { AiButton, AiButtonGroup, AiResultPanel } from '@/components/ai';
import { useAiExecution, useDashboardAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

const SEVERITY_COLORS = {
    Critical: '#dc2626',
    High: '#ea580c',
    Medium: '#ca8a04',
    Low: '#2563eb',
};

function formatDaysAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `${diffDays}일 전`;
}

export default function DashboardPage() {
    const router = useRouter();

    // Fetch real data from API
    const { data: overview, isLoading: overviewLoading, error: overviewError } = useStatsOverview();
    const { data: projectStats, isLoading: projectLoading } = useStatsByProject();
    const { data: trendData, isLoading: trendLoading } = useStatsTrend(undefined, 7);

    const isLoading = overviewLoading || projectLoading || trendLoading;

    // Prepare severity data for pie chart
    const severityData = overview ? [
        { name: 'Critical', value: overview.bySeverity.critical, color: SEVERITY_COLORS.Critical },
        { name: 'High', value: overview.bySeverity.high, color: SEVERITY_COLORS.High },
        { name: 'Medium', value: overview.bySeverity.medium, color: SEVERITY_COLORS.Medium },
        { name: 'Low', value: overview.bySeverity.low, color: SEVERITY_COLORS.Low },
    ] : [];

    // Prepare project data for bar chart
    const projectData = projectStats?.map(p => ({
        name: p.projectName,
        critical: p.critical,
        high: p.high,
        medium: p.medium,
    })) || [];

    // Prepare trend data for line chart
    const formattedTrendData = trendData?.map(t => ({
        date: new Date(t.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
        critical: t.critical,
        high: t.high,
        medium: t.medium,
    })) || [];

    // Drill-down navigation handlers
    const handleSeverityClick = (severity: string) => {
        router.push(`/dashboard/vulnerabilities?severity=${severity.toUpperCase()}`);
    };

    const handleStatusClick = (status: string) => {
        router.push(`/dashboard/vulnerabilities?status=${status}`);
    };

    const handleProjectClick = (projectName: string) => {
        const project = projectStats?.find(p => p.projectName === projectName);
        if (project) {
            router.push(`/dashboard/projects/${project.projectId}`);
        }
    };

    // AI Execution
    const collectDashboardContext = useDashboardAiContext();
    const {
        execute: executeSummary,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('dashboard.summary');

    const { activePanel, closePanel } = useAiStore();

    const handleAiSummary = () => {
        const context = collectDashboardContext(overview, projectStats);
        executeSummary(context);
    };

    const handleRegenerate = () => {
        const context = collectDashboardContext(overview, projectStats);
        executeSummary(context);
    };

    const estimatedTokens = overview ? estimateTokens(collectDashboardContext(overview, projectStats)) : 0;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <StatCardSkeleton key={i} />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
            </div>
        );
    }

    if (overviewError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <AlertTriangle className="h-12 w-12 mb-4 text-yellow-500" />
                <p>데이터를 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with AI Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">대시보드</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">전체 취약점 현황을 확인하세요</p>
                </div>
                <AiButton
                    action="dashboard.summary"
                    variant="primary"
                    size="md"
                    context={collectDashboardContext(overview, projectStats)}
                    estimatedTokens={estimatedTokens}
                    loading={aiLoading}
                    onExecute={handleAiSummary}
                    onCancel={cancelAi}
                />
            </div>

            {/* Stats Cards - Critical/High first for priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Critical"
                    value={overview?.bySeverity.critical || 0}
                    icon={<Shield className="h-6 w-6" />}
                    color="red"
                    onClick={() => handleSeverityClick('critical')}
                />
                <StatCard
                    title="High"
                    value={overview?.bySeverity.high || 0}
                    icon={<AlertTriangle className="h-6 w-6" />}
                    color="orange"
                    onClick={() => handleSeverityClick('high')}
                />
                <StatCard
                    title="해결됨"
                    value={overview?.byStatus.fixed || 0}
                    icon={<CheckCircle className="h-6 w-6" />}
                    color="green"
                    onClick={() => handleStatusClick('FIXED')}
                />
                <StatCard
                    title="진행 중"
                    value={overview?.byStatus.inProgress || 0}
                    icon={<Clock className="h-6 w-6" />}
                    color="blue"
                    onClick={() => handleStatusClick('IN_PROGRESS')}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Severity Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>심각도 분포</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            {severityData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severityData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            onClick={(entry) => handleSeverityClick(entry.name)}
                                            cursor="pointer"
                                        >
                                            {severityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            {severityData.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => handleSeverityClick(item.name)}
                                    className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                        {item.name}: <span className="font-medium tabular-nums">{item.value}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Trend Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>취약점 추세 (7일)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            {formattedTrendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formattedTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" stroke="#64748b" />
                                        <YAxis stroke="#64748b" />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="critical"
                                            name="Critical"
                                            stroke="#dc2626"
                                            strokeWidth={2}
                                            dot={{ fill: '#dc2626' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="high"
                                            name="High"
                                            stroke="#ea580c"
                                            strokeWidth={2}
                                            dot={{ fill: '#ea580c' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="medium"
                                            name="Medium"
                                            stroke="#ca8a04"
                                            strokeWidth={2}
                                            dot={{ fill: '#ca8a04' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projects Bar Chart */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>프로젝트별 취약점</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                {projectData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={projectData}
                                            onClick={(data) => {
                                                if (data?.activePayload?.[0]?.payload?.name) {
                                                    handleProjectClick(data.activePayload[0].payload.name);
                                                }
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="name" stroke="#64748b" />
                                            <YAxis stroke="#64748b" />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="critical" name="Critical" stackId="a" fill="#dc2626" cursor="pointer" />
                                            <Bar dataKey="high" name="High" stackId="a" fill="#ea580c" cursor="pointer" />
                                            <Bar dataKey="medium" name="Medium" stackId="a" fill="#ca8a04" cursor="pointer" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500">
                                        프로젝트 데이터가 없습니다
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Critical Vulnerabilities */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            최근 Critical 취약점
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {overview?.recentCritical && overview.recentCritical.length > 0 ? (
                                overview.recentCritical.slice(0, 5).map((vuln) => (
                                    <button
                                        key={vuln.id}
                                        onClick={() => router.push(`/dashboard/vulnerabilities/${vuln.id}`)}
                                        className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {vuln.cveId}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {vuln.title || vuln.pkgName}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400">{vuln.project}</span>
                                                    <span className="text-xs text-slate-400">•</span>
                                                    <span className="text-xs text-slate-400">{formatDaysAgo(vuln.createdAt)}</span>
                                                </div>
                                            </div>
                                            <SeverityBadge severity="critical" size="sm" />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    최근 Critical 취약점이 없습니다
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={() => handleSeverityClick('critical')}
                                className="w-full flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                모든 Critical 취약점 보기
                                <ExternalLink className="h-3 w-3" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'dashboard.summary'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleRegenerate}
                action="dashboard.summary"
            />
        </div>
    );
}
