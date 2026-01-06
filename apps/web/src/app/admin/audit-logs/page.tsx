'use client';

import { useState, useMemo } from 'react';
import {
    History,
    Search,
    Filter,
    User,
    Calendar,
    ChevronDown,
    Loader2,
    AlertTriangle,
    RefreshCw,
    FileText,
    Shield,
    Settings,
    Download,
    ChevronLeft,
    ChevronRight,
    Eye,
    Edit,
    Trash2,
    Plus,
    LogIn,
    LogOut,
    Upload,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import {
    useAuditLogs,
    useAuditLogActions,
    useAuditLogResources,
    useAuditLogStats,
    useLoginHistory,
    type AuditLog,
    type LoginHistoryEntry,
} from '@/lib/api-hooks';

function getActionIcon(action: string) {
    switch (action.toUpperCase()) {
        case 'CREATE':
        case 'UPLOAD':
            return <Plus className="h-4 w-4" />;
        case 'UPDATE':
        case 'STATUS_CHANGE':
            return <Edit className="h-4 w-4" />;
        case 'DELETE':
            return <Trash2 className="h-4 w-4" />;
        case 'LOGIN':
            return <LogIn className="h-4 w-4" />;
        case 'LOGOUT':
            return <LogOut className="h-4 w-4" />;
        case 'LOGIN_FAILED':
            return <XCircle className="h-4 w-4" />;
        case 'VIEW':
        case 'EXPORT':
            return <Eye className="h-4 w-4" />;
        case 'APPROVE':
            return <CheckCircle className="h-4 w-4" />;
        case 'REJECT':
            return <XCircle className="h-4 w-4" />;
        default:
            return <History className="h-4 w-4" />;
    }
}

function getActionColor(action: string) {
    switch (action.toUpperCase()) {
        case 'CREATE':
        case 'UPLOAD':
            return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
        case 'UPDATE':
        case 'STATUS_CHANGE':
            return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        case 'DELETE':
            return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
        case 'LOGIN':
        case 'APPROVE':
            return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'LOGOUT':
            return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
        case 'LOGIN_FAILED':
        case 'REJECT':
            return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
        case 'VIEW':
        case 'EXPORT':
            return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
        default:
            return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
    }
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

function parseUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('curl')) return 'API/curl';
    return userAgent.substring(0, 20) + '...';
}

export default function AuditLogsPage() {
    const [activeTab, setActiveTab] = useState<'all' | 'login'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedResource, setSelectedResource] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(0);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const pageSize = 50;

    const { data: actionsData } = useAuditLogActions();
    const { data: resourcesData } = useAuditLogResources();
    const { data: statsData } = useAuditLogStats(7);
    
    const {
        data: auditData,
        isLoading: isLoadingAudit,
        error: auditError,
        refetch: refetchAudit,
    } = useAuditLogs({
        action: selectedAction || undefined,
        resource: selectedResource || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        limit: pageSize,
        offset: currentPage * pageSize,
    });

    const {
        data: loginHistory,
        isLoading: isLoadingLogin,
        error: loginError,
        refetch: refetchLogin,
    } = useLoginHistory(100);

    const isLoading = activeTab === 'all' ? isLoadingAudit : isLoadingLogin;
    const error = activeTab === 'all' ? auditError : loginError;

    const filteredAuditLogs = useMemo(() => {
        if (!auditData?.results) return [];
        if (!searchQuery) return auditData.results;
        return auditData.results.filter(log =>
            log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [auditData, searchQuery]);

    const filteredLoginHistory = useMemo(() => {
        if (!loginHistory) return [];
        if (!searchQuery) return loginHistory;
        return loginHistory.filter(log =>
            log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [loginHistory, searchQuery]);

    const handleRefresh = () => {
        if (activeTab === 'all') {
            refetchAudit();
        } else {
            refetchLogin();
        }
    };

    const handleExport = () => {
        const data = activeTab === 'all' ? filteredAuditLogs : filteredLoginHistory;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.ceil((auditData?.total || 0) / pageSize);

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
                        시스템 내 모든 활동을 추적합니다
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        내보내기
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">총 로그 (7일)</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{statsData?.total || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">생성 작업</p>
                    <p className="text-2xl font-bold text-green-600">{statsData?.byAction?.CREATE || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">수정 작업</p>
                    <p className="text-2xl font-bold text-blue-600">{statsData?.byAction?.UPDATE || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">삭제 작업</p>
                    <p className="text-2xl font-bold text-red-600">{statsData?.byAction?.DELETE || 0}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'all'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        전체 로그
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('login')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'login'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        로그인 기록
                    </div>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="사용자, 이메일, 작업, IP 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                
                {activeTab === 'all' && (
                    <>
                        <select
                            value={selectedAction}
                            onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(0); }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">모든 작업</option>
                            {actionsData?.map(action => (
                                <option key={action.id} value={action.id}>{action.label}</option>
                            ))}
                        </select>
                        
                        <select
                            value={selectedResource}
                            onChange={(e) => { setSelectedResource(e.target.value); setCurrentPage(0); }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">모든 리소스</option>
                            {resourcesData?.map(resource => (
                                <option key={resource.id} value={resource.id}>{resource.label}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setCurrentPage(0); }}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-slate-400">~</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setCurrentPage(0); }}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                작업
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                사용자
                            </th>
                            {activeTab === 'all' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    리소스
                                </th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                IP 주소
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
                        {activeTab === 'all' ? (
                            filteredAuditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        로그 기록이 없습니다
                                    </td>
                                </tr>
                            ) : (
                                filteredAuditLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {log.user?.name || 'System'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {log.user?.email || '-'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                                                    {log.resource}
                                                </p>
                                                {log.resourceId && (
                                                    <p className="text-xs text-slate-500 font-mono">
                                                        {log.resourceId.substring(0, 8)}...
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                                            {log.ipAddress || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {log.details ? (
                                                <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                    {JSON.stringify(log.details).substring(0, 40)}...
                                                </code>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(log.createdAt)}
                                        </td>
                                    </tr>
                                ))
                            )
                        ) : (
                            filteredLoginHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        로그인 기록이 없습니다
                                    </td>
                                </tr>
                            ) : (
                                filteredLoginHistory.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${log.success ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {log.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                {log.success ? '로그인 성공' : '로그인 실패'}
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
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {log.failureReason || parseUserAgent(log.userAgent)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(log.createdAt)}
                                        </td>
                                    </tr>
                                ))
                            )
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {activeTab === 'all' && totalPages > 1 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            총 {auditData?.total || 0}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, auditData?.total || 0)}개 표시
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
