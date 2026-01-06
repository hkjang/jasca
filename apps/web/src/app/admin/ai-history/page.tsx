'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Brain,
    Zap,
    BarChart3,
    Activity,
    Search,
    RefreshCw,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Timer,
    Hash,
    AlertTriangle,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface AiExecution {
    id: string;
    action: string;
    actionLabel: string | null;
    model: string | null;
    provider: string | null;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
    error: string | null;
    userId: string | null;
    createdAt: string;
}

interface AiStats {
    total: number;
    totalTokens: number;
    avgDuration: number;
    successRate: number;
    byAction: Record<string, number>;
    byStatus: Record<string, number>;
    trend: Array<{ date: string; count: number }>;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AiHistoryPage() {
    const { accessToken } = useAuthStore();
    const [executions, setExecutions] = useState<AiExecution[]>([]);
    const [stats, setStats] = useState<AiStats | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pageSize = 10;

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [selectedAction, selectedStatus, currentPage]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedAction) params.set('action', selectedAction);
            if (selectedStatus) params.set('status', selectedStatus);
            params.set('limit', String(pageSize));
            params.set('offset', String(currentPage * pageSize));

            const response = await fetch(`/api/ai/history?${params}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            setExecutions(data.results || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('Failed to fetch AI history:', err);
            setExecutions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const response = await fetch('/api/ai/stats?days=30', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch AI stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchHistory(), fetchStats()]);
        setIsRefreshing(false);
    };

    // Filter executions by search
    const filteredExecutions = useMemo(() => {
        if (!searchQuery) return executions;
        return executions.filter(exec =>
            (exec.actionLabel || exec.action).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (exec.model || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [executions, searchQuery]);

    const totalPages = Math.ceil(total / pageSize);

    const uniqueActions = useMemo(() => {
        if (!stats?.byAction) return [];
        return Object.keys(stats.byAction).map(action => ({
            id: action,
            label: action.replace('.', ' - '),
        }));
    }, [stats]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI 사용 기록</h1>
                        <p className="text-sm text-slate-500">AI 실행 이력 및 사용량 분석</p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    새로고침
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">총 호출</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '-' : stats?.total || 0}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">성공</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '-' : stats?.byStatus?.SUCCESS || 0}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">성공률</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '-' : `${stats?.successRate || 0}%`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                            <Hash className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">총 토큰</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '-' : `${((stats?.totalTokens || 0) / 1000).toFixed(1)}K`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                            <Timer className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">평균 응답</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '-' : formatDuration(stats?.avgDuration || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage by Action Chart */}
            {stats && Object.keys(stats.byAction).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        액션별 사용량 (최근 30일)
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(stats.byAction)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([action, count]) => {
                                const maxCount = Math.max(...Object.values(stats.byAction));
                                const percentage = (count / maxCount) * 100;
                                return (
                                    <div key={action}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-700 dark:text-slate-300">{action}</span>
                                            <span className="text-slate-500">{count}회</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="액션, 모델 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={selectedAction}
                    onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(0); }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">모든 액션</option>
                    {uniqueActions.map(action => (
                        <option key={action.id} value={action.id}>{action.label}</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(0); }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">모든 상태</option>
                    <option value="SUCCESS">성공</option>
                    <option value="ERROR">오류</option>
                    <option value="TIMEOUT">타임아웃</option>
                </select>
            </div>

            {/* Execution History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    액션
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    모델
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    토큰
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    시간
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    일시
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredExecutions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        실행 기록이 없습니다
                                    </td>
                                </tr>
                            ) : (
                                filteredExecutions.map((exec) => (
                                    <tr key={exec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            {exec.status === 'SUCCESS' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                    성공
                                                </span>
                                            ) : exec.status === 'TIMEOUT' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    <Timer className="h-3.5 w-3.5" />
                                                    타임아웃
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    오류
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {exec.actionLabel || exec.action}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">{exec.action}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                <Cpu className="h-3 w-3" />
                                                {exec.model || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            <span className="text-green-600">{exec.inputTokens}</span>
                                            {' / '}
                                            <span className="text-blue-600">{exec.outputTokens}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {formatDuration(exec.durationMs)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(exec.createdAt)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            총 {total}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)}개 표시
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage >= totalPages - 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
