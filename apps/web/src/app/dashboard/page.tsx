'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
    Bell,
    Activity,
    FileWarning,
    Zap,
    RefreshCw,
    Settings,
    GitBranch,
    Package,
    Scan,
    BarChart3,
    PieChart as PieChartIcon,
    ChevronRight,
    Calendar,
    Timer,
} from 'lucide-react';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/ui/badge';
import { useStatsOverview, useStatsByProject, useStatsTrend, useNotifications } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution, useDashboardAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { QuickActions, QuickActionsFAB } from '@/components/quick-actions';
import { NotificationCenter } from '@/components/notification-center';
import { DashboardSettingsButton } from '@/components/dashboard-settings';
import { useChartView, useTrendPeriod, useWidgetVisibility } from '@/stores/preferences-store';

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

export default function DashboardPage() {
    const router = useRouter();
    const [chartView, setChartView] = useChartView();
    const [trendPeriod, setTrendPeriod] = useTrendPeriod();
    const { visibility: widgetVisibility } = useWidgetVisibility();

    // Fetch real data from API
    const { data: overview, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = useStatsOverview();
    const { data: projectStats, isLoading: projectLoading } = useStatsByProject();
    const { data: trendData, isLoading: trendLoading } = useStatsTrend(undefined, trendPeriod);
    const { data: notifications = [] } = useNotifications();

    const isLoading = overviewLoading || projectLoading || trendLoading;
    const unreadNotifications = notifications.filter(n => !n.isRead).length;

    // Calculate totals
    const totalVulns = overview ? 
        overview.bySeverity.critical + overview.bySeverity.high + overview.bySeverity.medium + overview.bySeverity.low : 0;
    
    const openVulns = overview ?
        (overview.byStatus.open || 0) + (overview.byStatus.inProgress || 0) : 0;

    // Prepare severity data for pie chart
    const severityData = overview ? [
        { name: 'Critical', value: overview.bySeverity.critical, color: SEVERITY_COLORS.Critical },
        { name: 'High', value: overview.bySeverity.high, color: SEVERITY_COLORS.High },
        { name: 'Medium', value: overview.bySeverity.medium, color: SEVERITY_COLORS.Medium },
        { name: 'Low', value: overview.bySeverity.low, color: SEVERITY_COLORS.Low },
    ].filter(d => d.value > 0) : [];

    // Prepare status data for pie chart
    const statusData = overview ? [
        { name: '신규', value: overview.byStatus.open || 0, color: '#ef4444' },
        { name: '진행중', value: overview.byStatus.inProgress || 0, color: '#3b82f6' },
        { name: '해결됨', value: overview.byStatus.fixed || 0, color: '#22c55e' },
        { name: '무시됨', value: overview.byStatus.ignored || 0, color: '#94a3b8' },
    ].filter(d => d.value > 0) : [];

    // Prepare project data for bar chart - top 5
    const projectData = projectStats?.slice(0, 5).map(p => ({
        name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
        fullName: p.name,
        id: p.id,
        critical: p.lastScan?.summary?.critical || 0,
        high: p.lastScan?.summary?.high || 0,
        medium: p.lastScan?.summary?.medium || 0,
    })) || [];

    // Prepare trend data for area chart
    const formattedTrendData = trendData?.map(t => ({
        date: new Date(t.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
        critical: t.critical,
        high: t.high,
        medium: t.medium,
    })) || [];

    // Calculate security score (0-100, higher is better) - improved scoring system
    const securityScore = (() => {
        if (!overview?.bySeverity) return 85;
        const { critical, high, medium, low } = overview.bySeverity;
        const total = critical + high + medium + low;
        if (total === 0) return 100;
        
        // Base score starts at 100
        let score = 100;
        
        // Critical vulnerabilities have severe impact
        if (critical > 0) {
            score -= Math.min(40, critical * 8); // Max 40 point deduction for critical
        } else {
            // Bonus for having no critical vulnerabilities
            score += 5;
        }
        
        // High vulnerabilities have moderate impact
        score -= Math.min(25, high * 3); // Max 25 point deduction for high
        
        // Medium vulnerabilities have low impact
        score -= Math.min(15, medium * 1); // Max 15 point deduction for medium
        
        // Low vulnerabilities have minimal impact
        score -= Math.min(10, low * 0.25); // Max 10 point deduction for low
        
        // Additional bonus tiers
        if (critical === 0 && high === 0) {
            score += 5; // No critical or high
        }
        if (critical === 0 && high === 0 && medium <= 5) {
            score += 5; // Excellent security posture
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    })();

    // Convert security score to risk display (inverted for gauge - high security = low risk)
    const riskScore = 100 - securityScore;

    const getRiskLevel = (score: number) => {
        // score here is risk score (inverted), so high score = high risk
        if (score >= 60) return { label: '위험', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
        if (score >= 40) return { label: '높음', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' };
        if (score >= 25) return { label: '보통', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
        if (score >= 10) return { label: '낮음', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
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
            {/* Header */}
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
                            전체 취약점 현황을 확인하세요
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <QuickActions className="hidden md:flex" />
                    <NotificationCenter />
                    <DashboardSettingsButton />
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

            {/* Risk Score + Stats Cards */}
            {(widgetVisibility.riskScore || widgetVisibility.statsCards) && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Risk Score Card */}
                {widgetVisibility.riskScore && (
                <Card className="p-6 flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-slate-200 dark:text-slate-700"
                            />
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${(riskScore / 100) * 251} 251`}
                                strokeLinecap="round"
                                className={riskScore >= 60 ? 'text-red-500' : riskScore >= 30 ? 'text-yellow-500' : 'text-green-500'}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{riskScore}</span>
                        </div>
                    </div>
                    <div className={`mt-3 px-3 py-1 rounded-full text-sm font-medium ${riskLevel.bg} ${riskLevel.color}`}>
                        {riskLevel.label}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">위험도</p>
                </Card>
                )}

                {/* Stats Cards */}
                {widgetVisibility.statsCards && (
                <>
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
                </>
                )}
            </div>
            )}

            {/* Summary Stats */}
            {widgetVisibility.summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/vulnerabilities')}>
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
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusClick('OPEN')}>
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
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/projects')}>
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
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/notifications')}>
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
            )}

            {/* Charts Row */}
            {(widgetVisibility.distributionChart || widgetVisibility.trendChart) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution Chart */}
                {widgetVisibility.distributionChart && (
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
                                                : handleStatusClick(entry.name === '신규' ? 'OPEN' : entry.name === '진행중' ? 'IN_PROGRESS' : entry.name === '해결됨' ? 'FIXED' : 'IGNORED')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {(chartView === 'severity' ? severityData : statusData).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
                                    <p>취약점 없음</p>
                                </div>
                            )}
                        </div>
                        {(chartView === 'severity' ? severityData : statusData).length > 0 && (
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {(chartView === 'severity' ? severityData : statusData).map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                            {item.name}: <span className="font-semibold">{item.value}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* Trend Chart */}
                {widgetVisibility.trendChart && (
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
                                            <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                                        <YAxis stroke="#64748b" fontSize={11} />
                                        <Tooltip />
                                        <Legend />
                                        <Area type="monotone" dataKey="critical" name="Critical" stroke="#dc2626" fill="url(#colorCrit)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="high" name="High" stroke="#ea580c" fill="url(#colorHigh)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="medium" name="Medium" stroke="#ca8a04" fill="#ca8a04" fillOpacity={0.1} strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    데이터 없음
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                )}
            </div>
            )}

            {/* Bottom Section */}
            {(widgetVisibility.projectsChart || widgetVisibility.criticalList) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projects Bar Chart */}
                {widgetVisibility.projectsChart && (
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-purple-500" />
                                프로젝트별 취약점
                            </CardTitle>
                            <button
                                onClick={() => router.push('/dashboard/projects')}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                전체 보기
                                <ChevronRight className="h-4 w-4" />
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
                                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                                            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={90} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="critical" name="Critical" stackId="a" fill="#dc2626" style={{ cursor: 'pointer' }} />
                                            <Bar dataKey="high" name="High" stackId="a" fill="#ea580c" style={{ cursor: 'pointer' }} />
                                            <Bar dataKey="medium" name="Medium" stackId="a" fill="#ca8a04" style={{ cursor: 'pointer' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500">
                                        프로젝트 없음
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                )}

                {/* Recent Critical */}
                {widgetVisibility.criticalList && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Shield className="h-5 w-5 text-red-500" />
                            Critical 취약점
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[280px] overflow-y-auto">
                            {overview?.recentCritical && overview.recentCritical.length > 0 ? (
                                overview.recentCritical.slice(0, 5).map((vuln) => (
                                    <button
                                        key={vuln.id}
                                        onClick={() => router.push(`/dashboard/vulnerabilities/${vuln.id}`)}
                                        className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3"
                                    >
                                        <div className="w-1 h-8 bg-red-500 rounded-full flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                {vuln.cveId}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {vuln.project} • {formatDaysAgo(vuln.createdAt)}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    </button>
                                ))
                            ) : (
                                <div className="p-6 text-center">
                                    <CheckCircle className="h-10 w-10 mx-auto text-green-400 mb-2" />
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Critical 없음</p>
                                </div>
                            )}
                        </div>
                        {overview?.recentCritical && overview.recentCritical.length > 5 && (
                            <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => handleSeverityClick('critical')}
                                    className="w-full py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    더 보기
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}
            </div>
            )}

            {/* Quick Links */}
            {widgetVisibility.quickLinks && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => router.push('/dashboard/scans/new')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all"
                >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">새 스캔</p>
                        <p className="text-xs text-slate-500">취약점 스캔 시작</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/vulnerabilities')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500 hover:shadow-lg transition-all"
                >
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">취약점</p>
                        <p className="text-xs text-slate-500">전체 취약점 목록</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/reports')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all"
                >
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">리포트</p>
                        <p className="text-xs text-slate-500">보안 리포트 생성</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 hover:shadow-lg transition-all"
                >
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">설정</p>
                        <p className="text-xs text-slate-500">시스템 설정</p>
                    </div>
                </button>
            </div>
            )}

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
