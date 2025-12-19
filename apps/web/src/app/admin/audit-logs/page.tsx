'use client';

import { useState, useMemo } from 'react';
import {
    History,
    Search,
    Filter,
    User,
    Shield,
    Settings,
    Key,
    Calendar,
    ChevronDown,
    Loader2,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
} from 'lucide-react';
import { useLoginHistory, LoginHistoryEntry } from '@/lib/api-hooks';

function getActionIcon(success: boolean) {
    if (success) return <CheckCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
}

function getActionColor(success: boolean) {
    if (success) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function parseUserAgent(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('curl')) return 'curl/API';
    return userAgent.substring(0, 30) + '...';
}

export default function AuditLogsPage() {
    const { data: loginHistory, isLoading, error, refetch } = useLoginHistory(100);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'success' | 'failed'>('all');

    const filteredLogs = useMemo(() => {
        if (!loginHistory) return [];
        return loginHistory.filter(log => {
            const matchesSearch =
                log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                selectedFilter === 'all' ||
                (selectedFilter === 'success' && log.success) ||
                (selectedFilter === 'failed' && !log.success);

            return matchesSearch && matchesFilter;
        });
    }, [loginHistory, searchQuery, selectedFilter]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                감사 로그를 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">감사 로그</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        시스템 내 로그인 활동을 추적합니다
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    새로고침
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">총 로그</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{loginHistory?.length || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">성공</p>
                    <p className="text-2xl font-bold text-green-600">{loginHistory?.filter(l => l.success).length || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">실패</p>
                    <p className="text-2xl font-bold text-red-600">{loginHistory?.filter(l => !l.success).length || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="사용자, 이메일, IP 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'success' | 'failed')}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">모든 활동</option>
                    <option value="success">성공</option>
                    <option value="failed">실패</option>
                </select>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                상태
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                사용자
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                IP 주소
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                브라우저
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                세부 정보
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                시간
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    로그 기록이 없습니다
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getActionColor(log.success)}`}>
                                            {getActionIcon(log.success)}
                                            {log.success ? '성공' : '실패'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {log.user?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {log.user?.email || '-'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                                        {log.ipAddress || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {parseUserAgent(log.userAgent)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {log.failureReason || (log.success ? '로그인 성공' : '-')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {formatDate(log.createdAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
