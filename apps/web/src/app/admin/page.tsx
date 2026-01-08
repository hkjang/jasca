'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
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
    Building2,
    Users,
    FolderKanban,
    TrendingUp,
    TrendingDown,
    Loader2,
    RefreshCw,
    Bell,
    Activity,
    Server,
    Database,
    Cpu,
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    Settings,
    FileText,
    UserPlus,
    ShieldCheck,
    ArrowRight,
    Zap,
    Eye,
    AlertCircle,
    ChevronRight,
    BarChart3,
    GitBranch,
    Scan,
    ShieldAlert,
    CheckCircle,
    Timer,
    Target,
} from 'lucide-react';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    useStatsOverview,
    useStatsByProject,
    useOrganizations,
    useUsers,
    usePolicies,
    useScans,
    useProjects,
} from '@/lib/api-hooks';

// System Status Component
function SystemStatusCard({
    name,
    status,
    latency,
    icon: Icon,
    description,
}: {
    name: string;
    status: 'online' | 'warning' | 'offline' | 'loading';
    latency?: number;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}) {
    const statusConfig = {
        online: { color: 'text-emerald-500', bg: 'bg-emerald-500', label: '정상' },
        warning: { color: 'text-amber-500', bg: 'bg-amber-500', label: '경고' },
        offline: { color: 'text-red-500', bg: 'bg-red-500', label: '오프라인' },
        loading: { color: 'text-slate-400', bg: 'bg-slate-400', label: '확인 중' },
    };

    const config = statusConfig[status];

    return (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{name}</span>
                    <span className={`flex h-2 w-2 rounded-full ${config.bg}`}>
                        {status === 'online' && (
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                    </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
            </div>
            <div className="text-right">
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                {latency !== undefined && (
                    <p className="text-xs text-slate-400">{latency}ms</p>
                )}
            </div>
        </div>
    );
}

// Security Score Gauge
function SecurityScoreGauge({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) {
    const getScoreColor = (s: number) => {
        if (s >= 80) return { color: 'text-emerald-500', bg: 'from-emerald-500 to-emerald-400', label: '우수' };
        if (s >= 60) return { color: 'text-amber-500', bg: 'from-amber-500 to-amber-400', label: '보통' };
        return { color: 'text-red-500', bg: 'from-red-500 to-red-400', label: '위험' };
    };

    const config = getScoreColor(score);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        className="stroke-slate-200 dark:stroke-slate-700"
                        strokeWidth="8"
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        className={`stroke-current ${config.color}`}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${config.color}`}>{score}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/100</span>
                </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                {trend === 'stable' && <Activity className="h-4 w-4 text-slate-400" />}
                <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
            </div>
        </div>
    );
}

// Activity Timeline Item
function TimelineItem({
    icon: Icon,
    iconColor,
    title,
    description,
    time,
    type,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    title: string;
    description: string;
    time: string;
    type: 'scan' | 'policy' | 'user' | 'alert' | 'system';
}) {
    return (
        <div className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
                <div className={`p-1.5 rounded-full ${iconColor} ring-4 ring-white dark:ring-slate-800`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-2"></div>
            </div>
            <div className="flex-1 min-w-0 pb-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{description}</p>
                <p className="text-xs text-slate-400 mt-1">{time}</p>
            </div>
        </div>
    );
}

// Quick Action Button
function QuickActionButton({
    icon: Icon,
    label,
    href,
    color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    color: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
        >
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
        </Link>
    );
}

// Stat Card with enhanced design
function StatCard({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    iconColor,
    iconBg,
    loading,
    href,
    subValue,
}: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    iconBg: string;
    loading?: boolean;
    href?: string;
    subValue?: string;
}) {
    const content = (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                    {loading ? (
                        <div className="mt-2">
                            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                            {subValue && (
                                <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
                            )}
                        </>
                    )}
                    {change && (
                        <div className="flex items-center gap-1 mt-2">
                            {changeType === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                            {changeType === 'down' && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                            <span className={`text-sm font-medium ${
                                changeType === 'up' ? 'text-red-500' : 
                                changeType === 'down' ? 'text-emerald-500' : 'text-slate-400'
                            }`}>
                                {change}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${iconBg}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

// Trend mini chart
function TrendMiniChart({ data, color }: { data: number[]; color: string }) {
    const chartData = data.map((value, index) => ({ value, index }));
    
    return (
        <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${color})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
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
    const { data: scansData, isLoading: scansLoading } = useScans();
    const { data: projectsData, isLoading: projectsLoading } = useProjects();

    // System status simulation (in real app, this would come from health check API)
    type StatusType = 'online' | 'warning' | 'offline' | 'loading';
    const [systemStatus, setSystemStatus] = useState<{
        api: { status: StatusType; latency: number };
        database: { status: StatusType; latency: number };
        scanner: { status: StatusType; latency: number };
        ai: { status: StatusType; latency: number };
    }>({
        api: { status: 'loading', latency: 0 },
        database: { status: 'loading', latency: 0 },
        scanner: { status: 'loading', latency: 0 },
        ai: { status: 'loading', latency: 0 },
    });

    useEffect(() => {
        // Simulate system status check
        const timer = setTimeout(() => {
            setSystemStatus({
                api: { status: 'online' as const, latency: 45 },
                database: { status: 'online' as const, latency: 12 },
                scanner: { status: 'online' as const, latency: 156 },
                ai: { status: 'online' as const, latency: 234 },
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Calculate organization stats for chart
    const organizationChartData = useMemo(() => {
        if (!projectStats || !organizations) return [];

        const orgStatsMap = new Map<string, { name: string; critical: number; high: number; medium: number; low: number }>();

        for (const org of organizations) {
            orgStatsMap.set(org.id, { name: org.name, critical: 0, high: 0, medium: 0, low: 0 });
        }

        for (const project of projectStats) {
            const summary = project.lastScan?.summary;
            if (summary) {
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

    // Calculate security score - improved scoring system
    const securityScore = useMemo(() => {
        if (!statsOverview?.bySeverity) return 85;
        const { critical, high, medium, low } = statsOverview.bySeverity;
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
    }, [statsOverview]);

    // Generate trend data
    const trendData = useMemo(() => {
        const days = ['월', '화', '수', '목', '금', '토', '일'];
        return days.map((day, index) => ({
            day,
            critical: Math.floor(Math.random() * 5),
            high: Math.floor(Math.random() * 15),
            medium: Math.floor(Math.random() * 25) + 10,
            scans: Math.floor(Math.random() * 10) + 5,
        }));
    }, []);

    // Recent activity timeline
    const recentActivity = useMemo(() => {
        const activities = [
            {
                icon: Scan,
                iconColor: 'bg-blue-500',
                title: '보안 스캔 완료',
                description: 'frontend-app 프로젝트 전체 스캔',
                time: '5분 전',
                type: 'scan' as const,
            },
            {
                icon: ShieldCheck,
                iconColor: 'bg-emerald-500',
                title: '정책 업데이트',
                description: 'Critical 취약점 블록 정책 수정',
                time: '23분 전',
                type: 'policy' as const,
            },
            {
                icon: ShieldAlert,
                iconColor: 'bg-red-500',
                title: 'Critical 취약점 발견',
                description: 'CVE-2025-1234 발견됨',
                time: '1시간 전',
                type: 'alert' as const,
            },
            {
                icon: UserPlus,
                iconColor: 'bg-purple-500',
                title: '새 사용자 등록',
                description: 'user@example.com 가입',
                time: '2시간 전',
                type: 'user' as const,
            },
            {
                icon: GitBranch,
                iconColor: 'bg-amber-500',
                title: 'CI 파이프라인 연동',
                description: 'GitHub Actions 연동 완료',
                time: '3시간 전',
                type: 'system' as const,
            },
        ];
        return activities;
    }, []);

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
            securityScore,
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

    const users = usersData?.data || [];
    const totalUsers = usersData?.total || 0;
    const totalOrganizations = organizations?.length || 0;
    const totalProjects = projectsData?.total || 0;
    const totalScans = scansData?.total || 0;
    const activePolicies = policies?.filter((p: { isActive: boolean }) => p.isActive).length || 0;

    // Quick actions
    const quickActions = [
        { icon: Play, label: '새 스캔 실행', href: '/dashboard/scans', color: 'bg-blue-500' },
        { icon: UserPlus, label: '사용자 추가', href: '/admin/users', color: 'bg-purple-500' },
        { icon: FileText, label: '정책 생성', href: '/admin/policies', color: 'bg-emerald-500' },
        { icon: Settings, label: 'Trivy 설정', href: '/admin/trivy-settings', color: 'bg-amber-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">관리자 대시보드</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            시스템 전체 보안 현황 및 관리
                        </p>
                    </div>
                    {/* Critical Vulnerabilities Alert */}
                    {statsOverview && statsOverview.bySeverity?.critical > 0 && (
                        <div className="relative">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium animate-pulse">
                                <Bell className="h-4 w-4" />
                                <span>{statsOverview.bySeverity.critical} Critical 알림</span>
                            </div>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        </div>
                    )}
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
                    <ThemeToggle />
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

            {/* Top Section: Security Score + System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Security Score Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">보안 점수</h3>
                        <Target className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex items-center justify-center py-2">
                        <SecurityScoreGauge score={securityScore} trend={securityScore >= 70 ? 'up' : 'down'} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-lg font-bold text-red-500">{statsOverview?.bySeverity?.critical || 0}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Critical</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-lg font-bold text-orange-500">{statsOverview?.bySeverity?.high || 0}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">High</p>
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">시스템 상태</h3>
                        <Activity className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="space-y-3">
                        <SystemStatusCard
                            name="API Server"
                            status={systemStatus.api.status}
                            latency={systemStatus.api.latency}
                            icon={Server}
                            description="REST API 서비스"
                        />
                        <SystemStatusCard
                            name="Database"
                            status={systemStatus.database.status}
                            latency={systemStatus.database.latency}
                            icon={Database}
                            description="PostgreSQL 데이터베이스"
                        />
                        <SystemStatusCard
                            name="Scanner"
                            status={systemStatus.scanner.status}
                            latency={systemStatus.scanner.latency}
                            icon={Scan}
                            description="Trivy 스캔 엔진"
                        />
                        <SystemStatusCard
                            name="AI Service"
                            status={systemStatus.ai.status}
                            latency={systemStatus.ai.latency}
                            icon={Zap}
                            description="AI 분석 서비스"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">빠른 작업</h3>
                        <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                        {quickActions.map((action) => (
                            <QuickActionButton
                                key={action.label}
                                icon={action.icon}
                                label={action.label}
                                href={action.href}
                                color={action.color}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="총 취약점"
                    value={statsOverview?.total || 0}
                    change={statsLoading ? undefined : '+3 이번 주'}
                    changeType="up"
                    icon={AlertTriangle}
                    iconColor="text-red-600"
                    iconBg="bg-red-100 dark:bg-red-900/30"
                    loading={statsLoading}
                    href="/dashboard/results"
                />
                <StatCard
                    title="활성 정책"
                    value={activePolicies}
                    subValue={`총 ${policies?.length || 0}개 정책`}
                    icon={Shield}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                    loading={policiesLoading}
                    href="/admin/policies"
                />
                <StatCard
                    title="관리 조직"
                    value={totalOrganizations}
                    icon={Building2}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100 dark:bg-blue-900/30"
                    loading={orgsLoading}
                    href="/admin/organizations"
                />
                <StatCard
                    title="프로젝트"
                    value={totalProjects}
                    icon={FolderKanban}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/30"
                    loading={projectsLoading}
                    href="/admin/projects"
                />
                <StatCard
                    title="전체 사용자"
                    value={totalUsers}
                    icon={Users}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                    loading={usersLoading}
                    href="/admin/users"
                />
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vulnerability Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">취약점 트렌드</h3>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                Critical
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                High
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                Medium
                            </span>
                        </div>
                    </div>
                    <div className="h-72">
                        {statsLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
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
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f017" />
                                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#fff',
                                        }}
                                    />
                                    <Area type="monotone" dataKey="critical" stackId="1" stroke="#dc2626" fill="url(#colorCritical)" />
                                    <Area type="monotone" dataKey="high" stackId="1" stroke="#ea580c" fill="url(#colorHigh)" />
                                    <Area type="monotone" dataKey="medium" stackId="1" stroke="#ca8a04" fill="url(#colorMedium)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">최근 활동</h3>
                        <Link href="/admin/audit-logs" className="text-sm text-blue-500 hover:text-blue-600">
                            전체 보기
                        </Link>
                    </div>
                    <div className="mt-4">
                        {recentActivity.map((activity, index) => (
                            <TimelineItem
                                key={index}
                                icon={activity.icon}
                                iconColor={activity.iconColor}
                                title={activity.title}
                                description={activity.description}
                                time={activity.time}
                                type={activity.type}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Organization Vulnerabilities */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            조직별 취약점 현황
                        </h3>
                        <Link href="/admin/organizations" className="text-sm text-blue-500 hover:text-blue-600">
                            상세 보기
                        </Link>
                    </div>
                    <div className="h-72">
                        {projectStatsLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : organizationChartData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <Building2 className="h-12 w-12 mb-2 text-slate-300 dark:text-slate-600" />
                                <p>데이터가 없습니다</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={organizationChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f017" />
                                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                                    <YAxis type="category" dataKey="name" stroke="#64748b" width={100} fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#fff',
                                        }}
                                    />
                                    <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="high" stackId="a" fill="#ea580c" name="High" />
                                    <Bar dataKey="medium" stackId="a" fill="#ca8a04" name="Medium" />
                                    <Bar dataKey="low" stackId="a" fill="#2563eb" name="Low" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            심각도 분포
                        </h3>
                        <Link href="/dashboard/results" className="text-sm text-blue-500 hover:text-blue-600">
                            상세 보기
                        </Link>
                    </div>
                    <div className="h-72 flex items-center">
                        {statsLoading ? (
                            <div className="flex items-center justify-center w-full">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : severityDistribution.length === 0 ? (
                            <div className="flex flex-col items-center justify-center w-full text-slate-500">
                                <CheckCircle className="h-12 w-12 mb-2 text-emerald-300 dark:text-emerald-600" />
                                <p>취약점이 없습니다</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="50%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severityDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {severityDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#fff',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-3">
                                    {severityDistribution.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</span>
                                                <span className="text-xs text-slate-400">
                                                    ({Math.round((item.value / severityDistribution.reduce((a, b) => a + b.value, 0)) * 100)}%)
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">총계</span>
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                                                {severityDistribution.reduce((a, b) => a + b.value, 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Policy Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Policies */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">활성 정책</h3>
                        <Link href="/admin/policies" className="text-sm text-blue-500 hover:text-blue-600">
                            정책 관리
                        </Link>
                    </div>
                    {policiesLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : !policies || policies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                            <Shield className="h-12 w-12 mb-2 text-slate-300 dark:text-slate-600" />
                            <p>정책이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {policies.slice(0, 5).map((policy: any) => (
                                <div key={policy.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div className={`p-2 rounded-lg ${policy.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                        <Shield className={`h-4 w-4 ${policy.isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{policy.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{policy.description || '설명 없음'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        policy.isActive
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'
                                    }`}>
                                        {policy.isActive ? '활성' : '비활성'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Health Metrics */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">시스템 지표</h3>
                        <BarChart3 className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Scan className="h-5 w-5 text-blue-600" />
                                <span className="text-sm text-blue-600 dark:text-blue-400">총 스캔 수</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalScans}</p>
                            <p className="text-xs text-blue-500 mt-1">이번 달</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                <span className="text-sm text-emerald-600 dark:text-emerald-400">해결된 취약점</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{statsOverview?.byStatus?.fixed || 0}</p>
                            <p className="text-xs text-emerald-500 mt-1">이번 주</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Timer className="h-5 w-5 text-amber-600" />
                                <span className="text-sm text-amber-600 dark:text-amber-400">평균 해결 시간</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">2.4일</p>
                            <p className="text-xs text-amber-500 mt-1">전체 평균</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Eye className="h-5 w-5 text-purple-600" />
                                <span className="text-sm text-purple-600 dark:text-purple-400">모니터링 중</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalProjects}</p>
                            <p className="text-xs text-purple-500 mt-1">활성 프로젝트</p>
                        </div>
                    </div>
                </div>
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
