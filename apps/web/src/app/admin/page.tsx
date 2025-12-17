'use client';

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
} from 'lucide-react';

// Mock data
const organizationStats = [
    { name: 'ACME Corp', critical: 12, high: 45, medium: 89, low: 156 },
    { name: 'TechStart', critical: 5, high: 22, medium: 67, low: 98 },
    { name: 'SecureNet', critical: 8, high: 34, medium: 78, low: 134 },
    { name: 'CloudFirst', critical: 3, high: 18, medium: 45, low: 89 },
];

const policyViolations = [
    { name: 'backend-api', violations: 8, severity: 'CRITICAL' },
    { name: 'frontend-web', violations: 5, severity: 'HIGH' },
    { name: 'auth-service', violations: 3, severity: 'CRITICAL' },
    { name: 'payment-gateway', violations: 3, severity: 'HIGH' },
    { name: 'notification-svc', violations: 2, severity: 'MEDIUM' },
];

const severityDistribution = [
    { name: 'Critical', value: 28, color: '#dc2626' },
    { name: 'High', value: 119, color: '#ea580c' },
    { name: 'Medium', value: 279, color: '#ca8a04' },
    { name: 'Low', value: 477, color: '#2563eb' },
];

function StatCard({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    iconColor,
}: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
}) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
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
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">관리자 대시보드</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    시스템 전체 보안 현황을 모니터링합니다
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="총 Critical 취약점"
                    value={28}
                    change="+3 이번 주"
                    changeType="up"
                    icon={AlertTriangle}
                    iconColor="bg-red-100 text-red-600 dark:bg-red-900/30"
                />
                <StatCard
                    title="정책 위반"
                    value={21}
                    change="-5 이번 주"
                    changeType="down"
                    icon={Shield}
                    iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                />
                <StatCard
                    title="관리 조직"
                    value={4}
                    icon={Building2}
                    iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                />
                <StatCard
                    title="전체 사용자"
                    value={156}
                    change="+12 이번 달"
                    changeType="neutral"
                    icon={Users}
                    iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Organization Vulnerabilities */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        조직별 취약점 현황
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={organizationStats} layout="vertical">
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
                    </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        심각도 분포
                    </h3>
                    <div className="h-72 flex items-center">
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
                    </div>
                </div>
            </div>

            {/* Policy Violations Top */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    정책 위반 Top 5
                </h3>
                <div className="space-y-4">
                    {policyViolations.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                                <p className="text-sm text-slate-500">{item.violations}개 정책 위반</p>
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
            </div>
        </div>
    );
}
