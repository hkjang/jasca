'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    FileSearch,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    ChevronRight,
    Loader2,
    RefreshCw,
    Upload,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    LayoutGrid,
    LayoutList,
    Download,
    Trash2,
    RotateCw,
    CalendarDays,
    Zap,
    Timer,
    GitCompare,
    X,
    Shield,
    Activity,
    TrendingUp,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    BarChart3,
} from 'lucide-react';
import { useScans, Scan } from '@/lib/api-hooks';
import { UploadScanModal } from '@/components/upload-scan-modal';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

// ============ Helper Functions ============

function getStatusIcon(status: string) {
    switch (status) {
        case 'COMPLETED':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'FAILED':
            return <XCircle className="h-4 w-4 text-red-500" />;
        case 'RUNNING':
            return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
        default:
            return <Clock className="h-4 w-4 text-slate-400" />;
    }
}

function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
        COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
            {status}
        </span>
    );
}

function getSeverityColor(severity: string) {
    const colors: Record<string, string> = {
        critical: 'bg-red-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
        low: 'bg-blue-500',
    };
    return colors[severity] || 'bg-slate-400';
}

function getSeverityBadge(severity: string, count: number) {
    const colors: Record<string, string> = {
        critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[severity] || 'bg-slate-100 text-slate-700'}`}>
            {severity.charAt(0).toUpperCase()}: {count}
        </span>
    );
}

function formatDate(dateString?: string | null) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRelativeTime(dateString?: string | null) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return formatDate(dateString);
}

// Vulnerability bar component
function VulnerabilityBar({ summary }: { summary?: { critical: number; high: number; medium: number; low: number } }) {
    if (!summary) return <span className="text-sm text-slate-400">-</span>;
    
    const total = summary.critical + summary.high + summary.medium + summary.low;
    if (total === 0) return (
        <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">안전</span>
        </div>
    );

    return (
        <div className="space-y-1">
            <div className="flex h-2 w-32 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                {summary.critical > 0 && (
                    <div 
                        className="bg-red-500" 
                        style={{ width: `${(summary.critical / total) * 100}%` }}
                        title={`Critical: ${summary.critical}`}
                    />
                )}
                {summary.high > 0 && (
                    <div 
                        className="bg-orange-500" 
                        style={{ width: `${(summary.high / total) * 100}%` }}
                        title={`High: ${summary.high}`}
                    />
                )}
                {summary.medium > 0 && (
                    <div 
                        className="bg-yellow-500" 
                        style={{ width: `${(summary.medium / total) * 100}%` }}
                        title={`Medium: ${summary.medium}`}
                    />
                )}
                {summary.low > 0 && (
                    <div 
                        className="bg-blue-500" 
                        style={{ width: `${(summary.low / total) * 100}%` }}
                        title={`Low: ${summary.low}`}
                    />
                )}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="text-red-600">{summary.critical}</span>
                <span>/</span>
                <span className="text-orange-600">{summary.high}</span>
                <span>/</span>
                <span className="text-yellow-600">{summary.medium}</span>
                <span>/</span>
                <span className="text-blue-600">{summary.low}</span>
            </div>
        </div>
    );
}

// ============ Main Component ============

export default function ScansPage() {
    const { data, isLoading, error, refetch } = useScans();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [sourceFilter, setSourceFilter] = useState<string>('');
    const [severityFilter, setSeverityFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);
    
    // View mode
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    
    // Sorting
    const [sortField, setSortField] = useState<string>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Comparison mode
    const [compareMode, setCompareMode] = useState(false);
    const [selectedScans, setSelectedScans] = useState<string[]>([]);
    
    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30);
    
    // Bulk selection
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);

    // AI Execution for scan diff analysis
    const {
        execute: executeScanDiff,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('scan.changeAnalysis');

    const { activePanel, closePanel } = useAiStore();

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) return;
        const intervalId = setInterval(() => {
            refetch();
        }, refreshInterval * 1000);
        return () => clearInterval(intervalId);
    }, [autoRefresh, refreshInterval, refetch]);

    // Filtered and sorted data
    const filteredScans = useMemo(() => {
        let scans = data?.results || [];
        
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            scans = scans.filter((scan: any) => 
                scan.targetName?.toLowerCase().includes(query) ||
                scan.imageRef?.toLowerCase().includes(query) ||
                scan.artifactName?.toLowerCase().includes(query) ||
                scan.project?.name?.toLowerCase().includes(query)
            );
        }
        
        // Status filter
        if (statusFilter) {
            scans = scans.filter((scan: any) => scan.status === statusFilter);
        }
        
        // Source filter
        if (sourceFilter) {
            scans = scans.filter((scan: any) => scan.sourceType === sourceFilter);
        }
        
        // Severity filter - filter scans that have vulnerabilities of that severity
        if (severityFilter) {
            scans = scans.filter((scan: any) => {
                const summary = scan.summary;
                if (!summary) return false;
                switch (severityFilter) {
                    case 'CRITICAL': return summary.critical > 0;
                    case 'HIGH': return summary.high > 0;
                    case 'MEDIUM': return summary.medium > 0;
                    case 'LOW': return summary.low > 0;
                    case 'CLEAN': return summary.critical === 0 && summary.high === 0 && summary.medium === 0 && summary.low === 0;
                    default: return true;
                }
            });
        }
        
        // Date filter
        if (dateFilter) {
            const now = new Date();
            scans = scans.filter((scan: any) => {
                const scanDate = new Date(scan.createdAt || scan.startedAt);
                const diffMs = now.getTime() - scanDate.getTime();
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                switch (dateFilter) {
                    case 'today': return diffDays < 1;
                    case 'week': return diffDays < 7;
                    case 'month': return diffDays < 30;
                    case 'quarter': return diffDays < 90;
                    default: return true;
                }
            });
        }
        
        // Sorting
        scans = [...scans].sort((a: any, b: any) => {
            let aVal, bVal;
            switch (sortField) {
                case 'createdAt':
                    aVal = new Date(a.createdAt || a.startedAt || 0).getTime();
                    bVal = new Date(b.createdAt || b.startedAt || 0).getTime();
                    break;
                case 'targetName':
                    aVal = a.targetName || a.imageRef || '';
                    bVal = b.targetName || b.imageRef || '';
                    break;
                case 'vulnerabilities':
                    aVal = (a.summary?.critical || 0) * 1000 + (a.summary?.high || 0) * 100 + (a.summary?.medium || 0) * 10 + (a.summary?.low || 0);
                    bVal = (b.summary?.critical || 0) * 1000 + (b.summary?.high || 0) * 100 + (b.summary?.medium || 0) * 10 + (b.summary?.low || 0);
                    break;
                default:
                    aVal = a[sortField];
                    bVal = b[sortField];
            }
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });
        
        return scans;
    }, [data?.results, searchQuery, statusFilter, sourceFilter, sortField, sortDirection]);

    // Paginated data
    const paginatedScans = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredScans.slice(start, start + pageSize);
    }, [filteredScans, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredScans.length / pageSize);

    // Statistics
    const statistics = useMemo(() => {
        const scans = data?.results || [];
        const completed = scans.filter((s: any) => s.status === 'COMPLETED').length;
        const failed = scans.filter((s: any) => s.status === 'FAILED').length;
        const running = scans.filter((s: any) => s.status === 'RUNNING').length;
        
        let totalCritical = 0, totalHigh = 0, totalMedium = 0, totalLow = 0;
        scans.forEach((scan: any) => {
            if (scan.summary) {
                totalCritical += scan.summary.critical || 0;
                totalHigh += scan.summary.high || 0;
                totalMedium += scan.summary.medium || 0;
                totalLow += scan.summary.low || 0;
            }
        });
        
        const lastScan = scans[0];
        
        return {
            total: scans.length,
            completed,
            failed,
            running,
            successRate: scans.length > 0 ? Math.round((completed / scans.length) * 100) : 0,
            vulnerabilities: { critical: totalCritical, high: totalHigh, medium: totalMedium, low: totalLow },
            lastScanAt: lastScan?.createdAt || lastScan?.startedAt,
        };
    }, [data?.results]);

    // Get unique source types for filter
    const sourceTypes = useMemo(() => {
        const types = new Set<string>();
        (data?.results || []).forEach((scan: any) => {
            if (scan.sourceType) types.add(scan.sourceType);
        });
        return Array.from(types);
    }, [data?.results]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleScanSelect = (scanId: string) => {
        if (selectedScans.includes(scanId)) {
            setSelectedScans(selectedScans.filter(id => id !== scanId));
        } else if (selectedScans.length < 2) {
            setSelectedScans([...selectedScans, scanId]);
        }
    };

    const handleAiScanDiff = () => {
        const context = {
            screen: 'scans',
            scans: data?.results?.slice(0, 10) || [],
            total: data?.total || 0,
            timestamp: new Date().toISOString(),
        };
        executeScanDiff(context);
    };

    const handleAiRegenerate = () => {
        handleAiScanDiff();
    };

    const estimatedTokens = estimateTokens({
        scans: data?.results?.slice(0, 5) || [],
    });

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setSourceFilter('');
        setSeverityFilter('');
        setDateFilter('');
    };

    const hasActiveFilters = searchQuery || statusFilter || sourceFilter || severityFilter || dateFilter;

    // Export function
    const handleExport = useCallback((format: 'csv' | 'json') => {
        const exportData = filteredScans.map((scan: any) => ({
            id: scan.id,
            target: scan.targetName || scan.imageRef || scan.artifactName || 'Unknown',
            project: scan.project?.name || '-',
            status: scan.status,
            critical: scan.summary?.critical || 0,
            high: scan.summary?.high || 0,
            medium: scan.summary?.medium || 0,
            low: scan.summary?.low || 0,
            source: scan.sourceType || 'UNKNOWN',
            date: scan.createdAt || scan.startedAt,
        }));

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scans_export_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const headers = ['ID', 'Target', 'Project', 'Status', 'Critical', 'High', 'Medium', 'Low', 'Source', 'Date'];
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => [
                    row.id,
                    `"${row.target}"`,
                    `"${row.project}"`,
                    row.status,
                    row.critical,
                    row.high,
                    row.medium,
                    row.low,
                    row.source,
                    row.date
                ].join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scans_export_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }, [filteredScans]);

    // Bulk selection handlers
    const handleBulkSelect = (scanId: string) => {
        if (bulkSelectedIds.includes(scanId)) {
            setBulkSelectedIds(bulkSelectedIds.filter(id => id !== scanId));
        } else {
            setBulkSelectedIds([...bulkSelectedIds, scanId]);
        }
    };

    const handleSelectAll = () => {
        if (bulkSelectedIds.length === paginatedScans.length) {
            setBulkSelectedIds([]);
        } else {
            setBulkSelectedIds(paginatedScans.map((scan: any) => scan.id));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-slate-600 dark:text-slate-400">스캔 결과를 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    다시 시도
                </button>
            </div>
        );
    }

    const scans = data?.results || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">스캔 결과</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        총 {data?.total || 0}개의 스캔 결과 {hasActiveFilters && `(필터됨: ${filteredScans.length}개)`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <AiButton
                        action="scan.changeAnalysis"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiScanDiff}
                        onCancel={cancelAi}
                    />
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Upload className="h-4 w-4" />
                        스캔 업로드
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Scans */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FileSearch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            statistics.successRate >= 90 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : statistics.successRate >= 70
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            성공률 {statistics.successRate}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{statistics.total}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">전체 스캔</p>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" /> {statistics.completed}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600">
                            <Clock className="h-3 w-3" /> {statistics.running}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" /> {statistics.failed}
                        </span>
                    </div>
                </div>

                {/* Vulnerabilities */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        {statistics.vulnerabilities.critical > 0 && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                                ⚠️ Critical {statistics.vulnerabilities.critical}
                            </span>
                        )}
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {statistics.vulnerabilities.critical + statistics.vulnerabilities.high + statistics.vulnerabilities.medium + statistics.vulnerabilities.low}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">전체 취약점</p>
                    </div>
                    <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                        {statistics.vulnerabilities.critical > 0 && (
                            <div className="bg-red-500" style={{ flex: statistics.vulnerabilities.critical }} />
                        )}
                        {statistics.vulnerabilities.high > 0 && (
                            <div className="bg-orange-500" style={{ flex: statistics.vulnerabilities.high }} />
                        )}
                        {statistics.vulnerabilities.medium > 0 && (
                            <div className="bg-yellow-500" style={{ flex: statistics.vulnerabilities.medium }} />
                        )}
                        {statistics.vulnerabilities.low > 0 && (
                            <div className="bg-blue-500" style={{ flex: statistics.vulnerabilities.low }} />
                        )}
                    </div>
                </div>

                {/* Last Scan */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatRelativeTime(statistics.lastScanAt)}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">마지막 스캔</p>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                        {formatDate(statistics.lastScanAt)}
                    </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                Critical
                            </span>
                            <span className="font-medium text-red-600">{statistics.vulnerabilities.critical}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                High
                            </span>
                            <span className="font-medium text-orange-600">{statistics.vulnerabilities.high}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                Medium
                            </span>
                            <span className="font-medium text-yellow-600">{statistics.vulnerabilities.medium}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                Low
                            </span>
                            <span className="font-medium text-blue-600">{statistics.vulnerabilities.low}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="스캔 대상, 프로젝트명 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">모든 상태</option>
                        <option value="COMPLETED">완료</option>
                        <option value="RUNNING">진행중</option>
                        <option value="FAILED">실패</option>
                    </select>

                    {/* Source Filter */}
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">모든 출처</option>
                        {sourceTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    {/* Severity Filter */}
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">모든 심각도</option>
                        <option value="CRITICAL">🔴 Critical</option>
                        <option value="HIGH">🟠 High</option>
                        <option value="MEDIUM">🟡 Medium</option>
                        <option value="LOW">🔵 Low</option>
                        <option value="CLEAN">✅ 취약점 없음</option>
                    </select>

                    {/* Date Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">전체 기간</option>
                        <option value="today">오늘</option>
                        <option value="week">최근 1주</option>
                        <option value="month">최근 1달</option>
                        <option value="quarter">최근 3달</option>
                    </select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            초기화
                        </button>
                    )}
                </div>

                {/* Second Row - Actions */}
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {/* Quick Severity Filters */}
                    <div className="flex items-center gap-1 mr-2">
                        <span className="text-xs text-slate-500 mr-1">빠른 필터:</span>
                        {[
                            { value: 'CRITICAL', label: 'C', color: 'bg-red-500', count: statistics.vulnerabilities.critical },
                            { value: 'HIGH', label: 'H', color: 'bg-orange-500', count: statistics.vulnerabilities.high },
                            { value: 'MEDIUM', label: 'M', color: 'bg-yellow-500', count: statistics.vulnerabilities.medium },
                            { value: 'LOW', label: 'L', color: 'bg-blue-500', count: statistics.vulnerabilities.low },
                        ].map(sev => (
                            <button
                                key={sev.value}
                                onClick={() => setSeverityFilter(severityFilter === sev.value ? '' : sev.value)}
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all ${
                                    severityFilter === sev.value
                                        ? `${sev.color} text-white scale-105`
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:scale-105'
                                }`}
                            >
                                {sev.label}
                                <span className="font-medium">{sev.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Auto Refresh Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                autoRefresh
                                    ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <RotateCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                            자동 새로고침
                        </button>
                        {autoRefresh && (
                            <select
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                            >
                                <option value={10}>10초</option>
                                <option value={30}>30초</option>
                                <option value={60}>1분</option>
                                <option value={300}>5분</option>
                            </select>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {/* Export Dropdown */}
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                                <Download className="h-3 w-3" />
                                내보내기
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-lg"
                                >
                                    📄 CSV 내보내기
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="w-full px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-lg"
                                >
                                    📋 JSON 내보내기
                                </button>
                            </div>
                        </div>

                        {/* Compare Mode Toggle */}
                        <button
                            onClick={() => {
                                setCompareMode(!compareMode);
                                setSelectedScans([]);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                compareMode
                                    ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400'
                                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <GitCompare className="h-3 w-3" />
                            비교 모드
                        </button>

                        {/* View Mode Toggle */}
                        <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 transition-colors ${
                                    viewMode === 'table'
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <LayoutList className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                className={`p-1.5 transition-colors ${
                                    viewMode === 'card'
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Compare Mode Banner */}
                {compareMode && (
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
                                <GitCompare className="h-4 w-4" />
                                <span>비교할 스캔을 2개 선택하세요 ({selectedScans.length}/2 선택됨)</span>
                            </div>
                            {selectedScans.length === 2 && (
                                <Link
                                    href={`/dashboard/scans/${selectedScans[0]}/diff?compare=${selectedScans[1]}`}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    비교하기
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Scans List */}
            {scans.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FileSearch className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        스캔 결과가 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        Trivy 스캔을 실행하고 결과를 업로드해주세요.
                    </p>
                </div>
            ) : viewMode === 'table' ? (
                /* Table View */
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                {compareMode && (
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">
                                        선택
                                    </th>
                                )}
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                    onClick={() => handleSort('targetName')}
                                >
                                    <div className="flex items-center gap-1">
                                        대상
                                        {sortField === 'targetName' && (
                                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    프로젝트
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                    onClick={() => handleSort('vulnerabilities')}
                                >
                                    <div className="flex items-center gap-1">
                                        취약점
                                        {sortField === 'vulnerabilities' && (
                                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    출처
                                </th>
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    <div className="flex items-center gap-1">
                                        스캔 일시
                                        {sortField === 'createdAt' && (
                                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedScans.map((scan: any) => (
                                <tr 
                                    key={scan.id} 
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                                        selectedScans.includes(scan.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                                    }`}
                                >
                                    {compareMode && (
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedScans.includes(scan.id)}
                                                onChange={() => handleScanSelect(scan.id)}
                                                disabled={selectedScans.length >= 2 && !selectedScans.includes(scan.id)}
                                                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <FileSearch className="h-5 w-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {scan.targetName || scan.imageRef || scan.artifactName || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {scan.scanType || scan.artifactType || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {scan.project?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(scan.status)}
                                            {getStatusBadge(scan.status)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <VulnerabilityBar summary={scan.summary} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-medium ${scan.sourceType === 'MANUAL'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : scan.sourceType?.startsWith('CI_')
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {scan.sourceType || 'UNKNOWN'}
                                            </span>
                                            {scan.uploaderIp && (
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {scan.uploaderIp}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(scan.createdAt || scan.startedAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/scans/${scan.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            상세보기
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedScans.map((scan: any) => (
                        <div 
                            key={scan.id}
                            className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all hover:-translate-y-1 ${
                                selectedScans.includes(scan.id) ? 'ring-2 ring-purple-500' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {compareMode && (
                                        <input
                                            type="checkbox"
                                            checked={selectedScans.includes(scan.id)}
                                            onChange={() => handleScanSelect(scan.id)}
                                            disabled={selectedScans.length >= 2 && !selectedScans.includes(scan.id)}
                                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                        />
                                    )}
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        <FileSearch className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">
                                            {scan.targetName || scan.imageRef || scan.artifactName || 'Unknown'}
                                        </h3>
                                        <p className="text-xs text-slate-500">{scan.project?.name || '-'}</p>
                                    </div>
                                </div>
                                {getStatusBadge(scan.status)}
                            </div>

                            <div className="space-y-3">
                                {/* Vulnerability Summary */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <VulnerabilityBar summary={scan.summary} />
                                </div>

                                {/* Meta Info */}
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className={`px-2 py-0.5 rounded font-medium ${scan.sourceType === 'MANUAL'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                        {scan.sourceType || 'UNKNOWN'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatRelativeTime(scan.createdAt || scan.startedAt)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Link
                                    href={`/dashboard/scans/${scan.id}`}
                                    className="flex items-center justify-center gap-2 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                    상세보기
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {filteredScans.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>
                            {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredScans.length)} / {filteredScans.length}개
                        </span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value={10}>10개씩</option>
                            <option value={20}>20개씩</option>
                            <option value={50}>50개씩</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page;
                            if (totalPages <= 5) {
                                page = i + 1;
                            } else if (currentPage <= 3) {
                                page = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                            } else {
                                page = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                                        currentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            <UploadScanModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
            />

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'scan.changeAnalysis'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="scan.changeAnalysis"
            />
        </div>
    );
}
