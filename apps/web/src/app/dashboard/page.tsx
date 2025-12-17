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
import { AlertTriangle, Shield, CheckCircle, Clock, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/ui/badge';

// Mock data - would come from API in production
const severityData = [
    { name: 'Critical', value: 12, color: '#dc2626' },
    { name: 'High', value: 45, color: '#ea580c' },
    { name: 'Medium', value: 89, color: '#ca8a04' },
    { name: 'Low', value: 156, color: '#2563eb' },
];

const trendData = [
    { date: '12/11', critical: 15, high: 48, medium: 92 },
    { date: '12/12', critical: 14, high: 46, medium: 90 },
    { date: '12/13', critical: 13, high: 45, medium: 88 },
    { date: '12/14', critical: 12, high: 44, medium: 87 },
    { date: '12/15', critical: 12, high: 45, medium: 89 },
    { date: '12/16', critical: 11, high: 43, medium: 86 },
    { date: '12/17', critical: 12, high: 45, medium: 89 },
];

const projectData = [
    { name: 'backend-api', critical: 3, high: 12, medium: 28 },
    { name: 'frontend-web', critical: 2, high: 8, medium: 15 },
    { name: 'auth-service', critical: 4, high: 10, medium: 22 },
    { name: 'data-service', critical: 3, high: 15, medium: 24 },
];

// Recent critical vulnerabilities
const recentCritical = [
    { id: '1', cveId: 'CVE-2024-1234', title: 'Remote Code Execution in Library X', project: 'backend-api', daysAgo: 2 },
    { id: '2', cveId: 'CVE-2024-5678', title: 'SQL Injection Vulnerability', project: 'auth-service', daysAgo: 3 },
    { id: '3', cveId: 'CVE-2024-9012', title: 'Authentication Bypass', project: 'data-service', daysAgo: 5 },
];

export default function DashboardPage() {
    const router = useRouter();
    const isLoading = false; // Would come from API query

    // Drill-down navigation handlers
    const handleSeverityClick = (severity: string) => {
        router.push(`/dashboard/vulnerabilities?severity=${severity.toUpperCase()}`);
    };

    const handleStatusClick = (status: string) => {
        router.push(`/dashboard/vulnerabilities?status=${status}`);
    };

    const handleProjectClick = (projectSlug: string) => {
        router.push(`/dashboard/projects/${projectSlug}`);
    };

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

    return (
        <div className="space-y-6">
            {/* Stats Cards - Critical/High first for priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Critical"
                    value={12}
                    change={-2}
                    changeLabel="지난 주 대비"
                    icon={<Shield className="h-6 w-6" />}
                    color="red"
                    onClick={() => handleSeverityClick('critical')}
                />
                <StatCard
                    title="High"
                    value={45}
                    change={3}
                    changeLabel="지난 주 대비"
                    icon={<AlertTriangle className="h-6 w-6" />}
                    color="orange"
                    onClick={() => handleSeverityClick('high')}
                />
                <StatCard
                    title="해결됨"
                    value={156}
                    change={-23}
                    changeLabel="이번 주 해결"
                    icon={<CheckCircle className="h-6 w-6" />}
                    color="green"
                    onClick={() => handleStatusClick('FIXED')}
                />
                <StatCard
                    title="진행 중"
                    value={34}
                    change={0}
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
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
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
                            {recentCritical.map((vuln) => (
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
                                                {vuln.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-400">{vuln.project}</span>
                                                <span className="text-xs text-slate-400">•</span>
                                                <span className="text-xs text-slate-400">{vuln.daysAgo}일 전</span>
                                            </div>
                                        </div>
                                        <SeverityBadge severity="critical" size="sm" />
                                    </div>
                                </button>
                            ))}
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
        </div>
    );
}

