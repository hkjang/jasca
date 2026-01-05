'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Shield,
    CheckCircle,
    Clock,
    XCircle,
    Filter,
    Loader2,
    RefreshCw,
    Package,
    CheckSquare,
    Square,
    Trash2,
    Edit,
    Download,
    MoreHorizontal,
    X,
} from 'lucide-react';
import { useVulnerabilities, useUpdateVulnerabilityStatus, Vulnerability } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { ThemeToggle } from '@/components/theme-toggle';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'FALSE_POSITIVE'];

function getSeverityBadge(severity: string) {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
        LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    };
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${colors[severity] || colors.UNKNOWN}`}>
            {severity}
        </span>
    );
}

function getStatusBadge(status: string) {
    const config: Record<string, { icon: React.ReactNode; color: string }> = {
        OPEN: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
        IN_PROGRESS: { icon: <Clock className="h-3 w-3" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
        RESOLVED: { icon: <CheckCircle className="h-3 w-3" />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        WONT_FIX: { icon: <XCircle className="h-3 w-3" />, color: 'text-slate-600 bg-slate-50 dark:bg-slate-700' },
        FALSE_POSITIVE: { icon: <Shield className="h-3 w-3" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    };
    const { icon, color } = config[status] || config.OPEN;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
            {icon}
            {status.replace('_', ' ')}
        </span>
    );
}

export default function VulnerabilitiesPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<{
        severity?: string[];
        status?: string[];
    }>({});
    const [showFilters, setShowFilters] = useState(false);
    const [editingStatus, setEditingStatus] = useState<string | null>(null);
    
    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    const { data, isLoading, error, refetch } = useVulnerabilities(filters);
    const updateStatus = useUpdateVulnerabilityStatus();

    // AI Execution for priority reorder
    const {
        execute: executePriorityReorder,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('vuln.priorityReorder');

    const { activePanel, closePanel } = useAiStore();

    const vulnerabilities = data?.data || [];

    // Selection handlers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === vulnerabilities.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(vulnerabilities.map((v: Vulnerability) => v.id)));
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    // Bulk action handlers
    const handleBulkStatusChange = async (status: string) => {
        if (selectedIds.size === 0) return;
        
        setBulkActionLoading(true);
        try {
            const promises = Array.from(selectedIds).map(id =>
                updateStatus.mutateAsync({ id, status })
            );
            await Promise.all(promises);
            clearSelection();
            refetch();
        } catch (error) {
            console.error('Bulk update failed:', error);
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleExportSelected = () => {
        const selected = vulnerabilities.filter((v: Vulnerability) => selectedIds.has(v.id));
        const csv = [
            ['CVE ID', 'Package', 'Severity', 'Status', 'Version', 'Project'].join(','),
            ...selected.map((v: Vulnerability) => [
                v.cveId,
                v.pkgName,
                v.severity,
                v.status,
                v.installedVersion,
                v.scanResult?.project?.name || '-'
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vulnerabilities-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleAiPriorityReorder = () => {
        const context = {
            screen: 'vulnerabilities',
            vulnerabilities: data?.data || [],
            total: data?.total || 0,
            filters,
            timestamp: new Date().toISOString(),
        };
        executePriorityReorder(context);
    };

    const handleRegenerate = () => {
        handleAiPriorityReorder();
    };

    const estimatedTokens = estimateTokens({
        vulnerabilities: data?.data?.slice(0, 10) || [],
        total: data?.total || 0,
    });

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await updateStatus.mutateAsync({ id, status });
            setEditingStatus(null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const toggleFilter = (type: 'severity' | 'status', value: string) => {
        setFilters(prev => {
            const current = prev[type] || [];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [type]: updated.length ? updated : undefined };
        });
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
                <p className="text-slate-600 dark:text-slate-400">취약점을 불러오는데 실패했습니다.</p>
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

    const isAllSelected = vulnerabilities.length > 0 && selectedIds.size === vulnerabilities.length;
    const isSomeSelected = selectedIds.size > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">취약점</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        총 {data?.total || 0}개의 취약점
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <AiButton
                        action="vuln.priorityReorder"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiPriorityReorder}
                        onCancel={cancelAi}
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${showFilters
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                            }`}
                    >
                        <Filter className="h-4 w-4" />
                        필터
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

            {/* Bulk Actions Bar */}
            {isSomeSelected && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-200">
                    <div className="flex items-center gap-4">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">
                            {selectedIds.size}개 선택됨
                        </span>
                        <button
                            onClick={clearSelection}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                            선택 해제
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Status Change Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowBulkActions(!showBulkActions)}
                                disabled={bulkActionLoading}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                                {bulkActionLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Edit className="h-4 w-4" />
                                )}
                                상태 변경
                            </button>
                            {showBulkActions && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowBulkActions(false)} />
                                    <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1">
                                        {STATUS_OPTIONS.map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    handleBulkStatusChange(status);
                                                    setShowBulkActions(false);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                            >
                                                {status.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleExportSelected}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Download className="h-4 w-4" />
                            CSV 내보내기
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            심각도
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SEVERITY_OPTIONS.map(severity => (
                                <button
                                    key={severity}
                                    onClick={() => toggleFilter('severity', severity)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${filters.severity?.includes(severity)
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    {severity}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            상태
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(status => (
                                <button
                                    key={status}
                                    onClick={() => toggleFilter('status', status)}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${filters.status?.includes(status)
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    {status.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Vulnerabilities List */}
            {vulnerabilities.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Shield className="h-16 w-16 mx-auto text-green-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        취약점이 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        현재 조건에 맞는 취약점이 발견되지 않았습니다.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <Square className="h-5 w-5 text-slate-400" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    CVE ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    패키지
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    심각도
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    버전
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    프로젝트
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {vulnerabilities.map((vuln: Vulnerability) => (
                                <tr 
                                    key={vuln.id} 
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                                        selectedIds.has(vuln.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                    }`}
                                >
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => toggleSelect(vuln.id)}
                                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                                        >
                                            {selectedIds.has(vuln.id) ? (
                                                <CheckSquare className="h-5 w-5 text-blue-600" />
                                            ) : (
                                                <Square className="h-5 w-5 text-slate-400" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            {vuln.cveId}
                                        </a>
                                        {vuln.title && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                                                {vuln.title}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-slate-400" />
                                            <span className="text-slate-900 dark:text-white font-medium">
                                                {vuln.pkgName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getSeverityBadge(vuln.severity)}
                                    </td>
                                    <td className="px-6 py-4 relative">
                                        {editingStatus === vuln.id ? (
                                            <select
                                                className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-700 dark:border-slate-600"
                                                value={vuln.status}
                                                onChange={(e) => handleStatusChange(vuln.id, e.target.value)}
                                                onBlur={() => setEditingStatus(null)}
                                                autoFocus
                                            >
                                                {STATUS_OPTIONS.map(s => (
                                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <button
                                                onClick={() => setEditingStatus(vuln.id)}
                                                className="cursor-pointer hover:opacity-80"
                                            >
                                                {getStatusBadge(vuln.status)}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {vuln.installedVersion}
                                            </span>
                                            {vuln.fixedVersion && (
                                                <>
                                                    <span className="mx-1 text-slate-400">→</span>
                                                    <span className="text-green-600 dark:text-green-400">
                                                        {vuln.fixedVersion}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {vuln.scanResult?.project?.name || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'vuln.priorityReorder'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleRegenerate}
                action="vuln.priorityReorder"
            />
        </div>
    );
}
