'use client';

import { useState, useMemo } from 'react';
import {
    Brain,
    Clock,
    Zap,
    BarChart3,
    Activity,
    Search,
    Filter,
    RefreshCw,
    Loader2,
    TrendingUp,
    TrendingDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    FileText,
    Cpu,
    Timer,
    Hash,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';

// Mock data for AI execution history
interface AiExecution {
    id: string;
    action: string;
    actionLabel: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    status: 'success' | 'error' | 'timeout';
    userId: string;
    userName: string;
    createdAt: string;
    error?: string;
}

const mockExecutions: AiExecution[] = Array.from({ length: 50 }, (_, i) => {
    const actions = [
        { id: 'dashboard.summary', label: '대시보드 요약' },
        { id: 'vuln.actionGuide', label: '취약점 조치 가이드' },
        { id: 'project.analysis', label: '프로젝트 분석' },
        { id: 'policy.interpretation', label: '정책 해석' },
        { id: 'notification.summary', label: '알림 요약' },
    ];
    const action = actions[i % actions.length];
    const statuses: Array<'success' | 'error' | 'timeout'> = ['success', 'success', 'success', 'success', 'error'];
    const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'llama3.2'];
    
    const date = new Date();
    date.setHours(date.getHours() - i);
    
    return {
        id: `exec-${i}`,
        action: action.id,
        actionLabel: action.label,
        model: models[i % models.length],
        inputTokens: 200 + Math.floor(Math.random() * 800),
        outputTokens: 100 + Math.floor(Math.random() * 400),
        durationMs: 500 + Math.floor(Math.random() * 3000),
        status: statuses[i % statuses.length],
        userId: `user-${i % 5}`,
        userName: ['김철수', '이영희', '박지훈', '최민수', '정수진'][i % 5],
        createdAt: date.toISOString(),
        error: statuses[i % statuses.length] === 'error' ? 'API rate limit exceeded' : undefined,
    };
});

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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pageSize = 10;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    // Calculate stats
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayExecutions = mockExecutions.filter(e => new Date(e.createdAt) >= today);
        const successCount = mockExecutions.filter(e => e.status === 'success').length;
        const totalTokens = mockExecutions.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);
        const avgDuration = mockExecutions.reduce((sum, e) => sum + e.durationMs, 0) / mockExecutions.length;
        
        return {
            totalCalls: mockExecutions.length,
            todayCalls: todayExecutions.length,
            successRate: Math.round((successCount / mockExecutions.length) * 100),
            totalTokens,
            avgDuration: Math.round(avgDuration),
        };
    }, []);

    // Filter executions
    const filteredExecutions = useMemo(() => {
        return mockExecutions.filter(exec => {
            const matchesSearch = !searchQuery || 
                exec.actionLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exec.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exec.model.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesAction = !selectedAction || exec.action === selectedAction;
            const matchesStatus = !selectedStatus || exec.status === selectedStatus;
            return matchesSearch && matchesAction && matchesStatus;
        });
    }, [searchQuery, selectedAction, selectedStatus]);

    const paginatedExecutions = filteredExecutions.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
    );
    const totalPages = Math.ceil(filteredExecutions.length / pageSize);

    const uniqueActions = Array.from(new Set(mockExecutions.map(e => e.action))).map(action => ({
        id: action,
        label: mockExecutions.find(e => e.action === action)?.actionLabel || action,
    }));

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
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalCalls}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">오늘</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.todayCalls}</p>
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
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.successRate}%</p>
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
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{(stats.totalTokens / 1000).toFixed(1)}K</p>
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
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatDuration(stats.avgDuration)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage by Action Chart (Simple bar representation) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    액션별 사용량
                </h3>
                <div className="space-y-3">
                    {uniqueActions.map(action => {
                        const count = mockExecutions.filter(e => e.action === action.id).length;
                        const percentage = (count / mockExecutions.length) * 100;
                        return (
                            <div key={action.id}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-slate-700 dark:text-slate-300">{action.label}</span>
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

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="액션, 사용자, 모델 검색..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
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
                    <option value="success">성공</option>
                    <option value="error">오류</option>
                    <option value="timeout">타임아웃</option>
                </select>
            </div>

            {/* Execution History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                                사용자
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                일시
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {paginatedExecutions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    실행 기록이 없습니다
                                </td>
                            </tr>
                        ) : (
                            paginatedExecutions.map((exec) => (
                                <tr key={exec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        {exec.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                성공
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
                                            {exec.actionLabel}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">{exec.action}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            <Cpu className="h-3 w-3" />
                                            {exec.model}
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
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {exec.userName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {formatDate(exec.createdAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            총 {filteredExecutions.length}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filteredExecutions.length)}개 표시
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
