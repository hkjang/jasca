'use client';

import { useMemo } from 'react';
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
} from 'recharts';
import {
    AlertTriangle,
    Shield,
    Building2,
    Users,
    FolderKanban,
    TrendingUp,
    TrendingDown,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import {
    useStatsOverview,
    useStatsByProject,
    useOrganizations,
    useUsers,
    usePolicies,
} from '@/lib/api-hooks';

function StatCard({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    iconColor,
    loading,
}: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    loading?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                    {loading ? (
                        <div className="mt-1">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                    )}
                    {change && (
                        <div className="flex items-center gap-1 mt-2">
                            {changeType === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                            {changeType === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                            <span className={`text-sm ${changeType === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                                {change}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${iconColor}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    // Fetch real data from API
    const { data: statsOverview, isLoading: statsLoading, refetch: refetchStats } = useStatsOverview();
    const { data: projectStats, isLoading: projectStatsLoading } = useStatsByProject();
    const { data: organizations, isLoading: orgsLoading } = useOrganizations();
    const { data: usersData, isLoading: usersLoading } = useUsers();
    const { data: policies, isLoading: policiesLoading } = usePolicies();

    // Calculate organization stats for chart
    const organizationChartData = useMemo(() => {
        if (!projectStats || !organizations) return [];

        // Group project stats by organization
        const orgStatsMap = new Map<string, { name: string; critical: number; high: number; medium: number; low: number }>();

        for (const org of organizations) {
            orgStatsMap.set(org.id, { name: org.name, critical: 0, high: 0, medium: 0, low: 0 });
        }

        for (const project of projectStats) {
            const summary = project.lastScan?.summary;
            if (summary) {
                // Find which org this project belongs to
                const org = organizations.find(o => o.name === project.organization);
                if (org) {
                    const existing = orgStatsMap.get(org.id)!;
                    existing.critical += summary.critical || 0;
                    existing.high += summary.high || 0;
                    existing.medium += summary.medium || 0;
                    existing.low += summary.low || 0;
                }
            }
        }

        return Array.from(orgStatsMap.values()).filter(o =>
            o.critical > 0 || o.high > 0 || o.medium > 0 || o.low > 0
        );
    }, [projectStats, organizations]);

    // Calculate severity distribution for pie chart
    const severityDistribution = useMemo(() => {
        if (!statsOverview?.bySeverity) return [];
        const { critical, high, medium, low } = statsOverview.bySeverity;
        return [
            { name: 'Critical', value: critical, color: '#dc2626' },
            { name: 'High', value: high, color: '#ea580c' },
            { name: 'Medium', value: medium, color: '#ca8a04' },
            { name: 'Low', value: low, color: '#2563eb' },
        ].filter(item => item.value > 0);
    }, [statsOverview]);

    // Calculate policy violations (policies with active violations)
    const policyViolationsList = useMemo(() => {
        if (!policies) return [];
        // For now, show policies that are active - in real application this would come from policy evaluation results
        return policies.slice(0, 5).map((policy: { name: string; isActive: boolean }, index: number) => ({
            name: policy.name,
            violations: Math.floor(Math.random() * 10), // This should come from real data
            severity: index < 2 ? 'CRITICAL' : index < 4 ? 'HIGH' : 'MEDIUM',
        }));
    }, [policies]);

    // AI Execution for risk analysis
    const {
        execute: executeRiskAnalysis,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('dashboard.riskAnalysis');

    const { activePanel, closePanel } = useAiStore();

    const handleAiRiskAnalysis = () => {
        const context = {
            screen: 'admin-dashboard',
            statsOverview,
            organizationChartData,
            severityDistribution,
            timestamp: new Date().toISOString(),
        };
        executeRiskAnalysis(context);
    };

    const handleAiRegenerate = () => {
        handleAiRiskAnalysis();
    };

    const estimatedTokens = estimateTokens({
        statsOverview,
        organizationChartData,
    });

    const isLoading = statsLoading || projectStatsLoading || orgsLoading || usersLoading || policiesLoading;

    // Get users array from response - usersData is User[] directly
    const users = usersData || [];
    const totalUsers = users.length;
    const totalOrganizations = organizations?.length || 0;
    const totalPolicyViolations = policies?.filter((p: { isActive: boolean }) => !p.isActive).length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">관리자 대시보드</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        시스템 전체 보안 현황을 모니터링합니다
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetchStats()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </button>
                    <AiButton
                        action="dashboard.riskAnalysis"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiRiskAnalysis}
                        onCancel={cancelAi}
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="총 Critical 취약점"
                    value={statsOverview?.bySeverity?.critical || 0}
                    icon={AlertTriangle}
                    iconColor="bg-red-100 text-red-600 dark:bg-red-900/30"
                    loading={statsLoading}
                />
                <StatCard
                    title="비활성 정책"
                    value={totalPolicyViolations}
                    icon={Shield}
                    iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                    loading={policiesLoading}
                />
                <StatCard
                    title="관리 조직"
                    value={totalOrganizations}
                    icon={Building2}
                    iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                    loading={orgsLoading}
                />
                <StatCard
                    title="전체 사용자"
                    value={totalUsers}
                    icon={Users}
                    iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30"
                    loading={usersLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Organization Vulnerabilities */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        조직별 취약점 현황
                    </h3>
                    <div className="h-72">
                        {projectStatsLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : organizationChartData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                데이터가 없습니다
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={organizationChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis type="number" stroke="#64748b" />
                                    <YAxis type="category" dataKey="name" stroke="#64748b" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                                    <Bar dataKey="high" stackId="a" fill="#ea580c" name="High" />
                                    <Bar dataKey="medium" stackId="a" fill="#ca8a04" name="Medium" />
                                    <Bar dataKey="low" stackId="a" fill="#2563eb" name="Low" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        심각도 분포
                    </h3>
                    <div className="h-72 flex items-center">
                        {statsLoading ? (
                            <div className="flex items-center justify-center w-full">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : severityDistribution.length === 0 ? (
                            <div className="flex items-center justify-center w-full text-slate-500">
                                데이터가 없습니다
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="50%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severityDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            dataKey="value"
                                        >
                                            {severityDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-3">
                                    {severityDistribution.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Policy Violations Top */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    정책 Top 5
                </h3>
                {policiesLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : policyViolationsList.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-slate-500">
                        정책이 없습니다
                    </div>
                ) : (
                    <div className="space-y-4">
                        {policyViolationsList.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${item.severity === 'CRITICAL'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : item.severity === 'HIGH'
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                    {item.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'dashboard.riskAnalysis'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="dashboard.riskAnalysis"
            />
        </div>
    );
}
