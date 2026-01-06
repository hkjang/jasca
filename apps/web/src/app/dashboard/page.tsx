'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
    AreaChart,
    Area,
} from 'recharts';
import {
    AlertTriangle,
    Shield,
    CheckCircle,
    Clock,
    ExternalLink,
    Loader2,
    Bell,
    TrendingUp,
    TrendingDown,
    Activity,
    FileWarning,
    Zap,
    Target,
    ArrowRight,
    Calendar,
    BarChart3,
    PieChartIcon,
    RefreshCw,
    Settings,
    GitBranch,
    Package,
} from 'lucide-react';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/ui/badge';
import { useStatsOverview, useStatsByProject, useStatsTrend, useNotifications } from '@/lib/api-hooks';
import { AiButton, AiButtonGroup, AiResultPanel } from '@/components/ai';
import { useAiExecution, useDashboardAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { QuickActions, QuickActionsFAB } from '@/components/quick-actions';
import { NotificationCenter } from '@/components/notification-center';

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
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
}

function formatNumber(num: number): string {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function getChangeIndicator(current: number, previous: number) {
    if (previous === 0) return { trend: 'neutral', percent: 0 };
    const percent = ((current - previous) / previous) * 100;
    return {
        trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
        percent: Math.abs(percent).toFixed(1),
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const [chartView, setChartView] = useState<'severity' | 'status'>('severity');
    const [trendPeriod, setTrendPeriod] = useState<7 | 14 | 30>(7);

    // Fetch real data from API
    const { data: overview, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = useStatsOverview();
    const { data: projectStats, isLoading: projectLoading } = useStatsByProject();
    const { data: trendData, isLoading: trendLoading } = useStatsTrend(undefined, trendPeriod);
    const { data: notifications = [] } = useNotifications();

    const isLoading = overviewLoading || projectLoading || trendLoading;
    const unreadNotifications = notifications.filter(n => !n.isRead).length;

    // Calculate totals and trends
    const totalVulns = overview ? 
        overview.bySeverity.critical + overview.bySeverity.high + overview.bySeverity.medium + overview.bySeverity.low : 0;
    
    const openVulns = overview ?
        (overview.byStatus.new || 0) + (overview.byStatus.inProgress || 0) : 0;

    // Prepare severity data for pie chart
    const severityData = overview ? [
        { name: 'Critical', value: overview.bySeverity.critical, color: SEVERITY_COLORS.Critical },
        { name: 'High', value: overview.bySeverity.high, color: SEVERITY_COLORS.High },
        { name: 'Medium', value: overview.bySeverity.medium, color: SEVERITY_COLORS.Medium },
        { name: 'Low', value: overview.bySeverity.low, color: SEVERITY_COLORS.Low },
    ].filter(d => d.value > 0) : [];

    // Prepare status data for pie chart
    const statusData = overview ? [
        { name: '신규', value: overview.byStatus.new || 0, color: '#ef4444' },
        { name: '진행중', value: overview.byStatus.inProgress || 0, color: '#3b82f6' },
        { name: '해결됨', value: overview.byStatus.fixed || 0, color: '#22c55e' },
        { name: '무시됨', value: overview.byStatus.ignored || 0, color: '#94a3b8' },
    ].filter(d => d.value > 0) : [];

    // Prepare project data for bar chart - top 5
    const projectData = projectStats?.slice(0, 5).map(p => ({
        name: p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name,
        fullName: p.name,
        id: p.id,
        critical: p.lastScan?.summary?.critical || 0,
        high: p.lastScan?.summary?.high || 0,
        medium: p.lastScan?.summary?.medium || 0,
        total: (p.lastScan?.summary?.critical || 0) + (p.lastScan?.summary?.high || 0) + (p.lastScan?.summary?.medium || 0),
    })) || [];

    // Prepare trend data for area chart
    const formattedTrendData = trendData?.map(t => ({
        date: new Date(t.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
        critical: t.critical,
        high: t.high,
        medium: t.medium,
        total: t.critical + t.high + t.medium,
    })) || [];

    // Calculate risk score (0-100)
    const riskScore = overview ? Math.min(100, Math.round(
        (overview.bySeverity.critical * 40 + 
         overview.bySeverity.high * 20 + 
         overview.bySeverity.medium * 5 + 
         overview.bySeverity.low * 1) / 10
    )) : 0;

    const getRiskLevel = (score: number) => {
        if (score >= 80) return { label: '위험', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
        if (score >= 60) return { label: '높음', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' };
        if (score >= 40) return { label: '보통', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
        if (score >= 20) return { label: '낮음', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
        return { label: '안전', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    };

    const riskLevel = getRiskLevel(riskScore);

    // Drill-down navigation handlers
    const handleSeverityClick = (severity: string) => {
        router.push(`/dashboard/vulnerabilities?severity=${severity.toUpperCase()}`);
    };

    const handleStatusClick = (status: string) => {
        router.push(`/dashboard/vulnerabilities?status=${status}`);
    };

    const handleProjectClick = (projectId: string) => {
        router.push(`/dashboard/projects/${projectId}`);
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
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">보안 대시보드</h1>
                            <button
                                onClick={() => refetchOverview()}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="새로고침"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <QuickActions className="hidden md:flex" />
                    <NotificationCenter />
                    <ThemeToggle />
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
            </div>

            {/* Risk Score & Quick Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Risk Score Card */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                            <div className="relative">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        className="text-slate-200 dark:text-slate-700"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${(riskScore / 100) * 352} 352`}
                                        strokeLinecap="round"
                                        className={riskScore >= 60 ? 'text-red-500' : riskScore >= 40 ? 'text-yellow-500' : 'text-green-500'}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{riskScore}</span>
                                    <span className="text-xs text-slate-500">점</span>
                                </div>
                            </div>
                            <div className={`mt-4 px-3 py-1 rounded-full text-sm font-medium ${riskLevel.bg} ${riskLevel.color}`}>
                                {riskLevel.label}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">종합 보안 위험도</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Stats Cards */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg shadow-red-500/20 cursor-pointer hover:shadow-xl transition-shadow"
                         onClick={() => handleSeverityClick('critical')}>
                        <div className="flex items-center justify-between">
                            <Shield className="h-8 w-8 opacity-80" />
                            {overview && overview.bySeverity.critical > 0 && (
                                <span className="animate-pulse w-2 h-2 rounded-full bg-white" />
                            )}
                        </div>
                        <div className="mt-3">
                            <p className="text-3xl font-bold">{overview?.bySeverity.critical || 0}</p>
                            <p className="text-sm opacity-80">Critical</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-orange-500/20 cursor-pointer hover:shadow-xl transition-shadow"
                         onClick={() => handleSeverityClick('high')}>
                        <div className="flex items-center justify-between">
                            <AlertTriangle className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="mt-3">
                            <p className="text-3xl font-bold">{overview?.bySeverity.high || 0}</p>
                            <p className="text-sm opacity-80">High</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg shadow-green-500/20 cursor-pointer hover:shadow-xl transition-shadow"
                         onClick={() => handleStatusClick('FIXED')}>
                        <div className="flex items-center justify-between">
                            <CheckCircle className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="mt-3">
                            <p className="text-3xl font-bold">{overview?.byStatus.fixed || 0}</p>
                            <p className="text-sm opacity-80">해결됨</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-500/20 cursor-pointer hover:shadow-xl transition-shadow"
                         onClick={() => handleStatusClick('IN_PROGRESS')}>
                        <div className="flex items-center justify-between">
                            <Clock className="h-8 w-8 opacity-80" />
                        </div>
                        <div className="mt-3">
                            <p className="text-3xl font-bold">{overview?.byStatus.inProgress || 0}</p>
                            <p className="text-sm opacity-80">진행 중</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalVulns}</p>
                            <p className="text-xs text-slate-500">전체 취약점</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <FileWarning className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{openVulns}</p>
                            <p className="text-xs text-slate-500">미해결</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{projectStats?.length || 0}</p>
                            <p className="text-xs text-slate-500">프로젝트</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{unreadNotifications}</p>
                            <p className="text-xs text-slate-500">새 알림</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution Chart with Toggle */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-blue-500" />
                            분포 현황
                        </CardTitle>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={() => setChartView('severity')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                    chartView === 'severity'
                                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                심각도
                            </button>
                            <button
                                onClick={() => setChartView('status')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                    chartView === 'status'
                                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                상태
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            {(chartView === 'severity' ? severityData : statusData).length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartView === 'severity' ? severityData : statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            onClick={(entry) => chartView === 'severity' 
                                                ? handleSeverityClick(entry.name) 
                                                : handleStatusClick(entry.name === '신규' ? 'NEW' : entry.name === '진행중' ? 'IN_PROGRESS' : entry.name === '해결됨' ? 'FIXED' : 'IGNORED')}
                                            cursor="pointer"
                                        >
                                            {(chartView === 'severity' ? severityData : statusData).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => [value, '개']}
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(255,255,255,0.95)',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    데이터가 없습니다
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {(chartView === 'severity' ? severityData : statusData).map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => chartView === 'severity' 
                                        ? handleSeverityClick(item.name)
                                        : handleStatusClick(item.name === '신규' ? 'NEW' : item.name === '진행중' ? 'IN_PROGRESS' : item.name === '해결됨' ? 'FIXED' : 'IGNORED')}
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

                {/* Trend Chart with Period Toggle */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-green-500" />
                            취약점 추세
                        </CardTitle>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            {[7, 14, 30].map((days) => (
                                <button
                                    key={days}
                                    onClick={() => setTrendPeriod(days as 7 | 14 | 30)}
                                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                        trendPeriod === days
                                            ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {days}일
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            {formattedTrendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={formattedTrendData}>
                                        <defs>
                                            <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ca8a04" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(255,255,255,0.95)',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0'
                                            }}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="critical"
                                            name="Critical"
                                            stroke="#dc2626"
                                            fillOpacity={1}
                                            fill="url(#colorCritical)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="high"
                                            name="High"
                                            stroke="#ea580c"
                                            fillOpacity={1}
                                            fill="url(#colorHigh)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="medium"
                                            name="Medium"
                                            stroke="#ca8a04"
                                            fillOpacity={1}
                                            fill="url(#colorMedium)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-purple-500" />
                                프로젝트별 취약점 (Top 5)
                            </CardTitle>
                            <button
                                onClick={() => router.push('/dashboard/projects')}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                전체 보기
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                {projectData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={projectData}
                                            layout="vertical"
                                            onClick={(data) => {
                                                if (data?.activePayload?.[0]?.payload?.id) {
                                                    handleProjectClick(data.activePayload[0].payload.id);
                                                }
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                            <XAxis type="number" stroke="#64748b" fontSize={12} />
                                            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                                            <Tooltip
                                                contentStyle={{ 
                                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0'
                                                }}
                                                formatter={(value: number, name: string) => [value, name]}
                                            />
                                            <Legend />
                                            <Bar dataKey="critical" name="Critical" stackId="a" fill="#dc2626" cursor="pointer" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="high" name="High" stackId="a" fill="#ea580c" cursor="pointer" />
                                            <Bar dataKey="medium" name="Medium" stackId="a" fill="#ca8a04" cursor="pointer" radius={[0, 4, 4, 0]} />
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
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            최근 Critical
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
                                    <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
                                    <p>Critical 취약점 없음</p>
                                </div>
                            )}
                        </div>
                        {overview?.recentCritical && overview.recentCritical.length > 0 && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => handleSeverityClick('critical')}
                                    className="w-full flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    모든 Critical 취약점 보기
                                    <ExternalLink className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => router.push('/dashboard/scans/new')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-500 transition-colors">
                        <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">새 스캔</p>
                        <p className="text-xs text-slate-500">취약점 스캔 시작</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/vulnerabilities')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500 transition-colors group"
                >
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-500 transition-colors">
                        <Shield className="h-5 w-5 text-red-600 dark:text-red-400 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">취약점</p>
                        <p className="text-xs text-slate-500">전체 취약점 목록</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/reports')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 transition-colors group"
                >
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-500 transition-colors">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">리포트</p>
                        <p className="text-xs text-slate-500">보안 리포트 생성</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 transition-colors group"
                >
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-slate-500 transition-colors">
                        <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">설정</p>
                        <p className="text-xs text-slate-500">시스템 설정</p>
                    </div>
                </button>
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

            {/* FAB for mobile */}
            <QuickActionsFAB />
        </div>
    );
}
