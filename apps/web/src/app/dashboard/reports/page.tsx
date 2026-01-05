'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FileText,
    Download,
    Plus,
    Calendar,
    CheckCircle,
    AlertTriangle,
    Loader2,
    File,
    Trash2,
    Edit,
    Eye,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    Square,
    MinusSquare,
    Clock,
    Repeat,
    LayoutGrid,
    List,
    Copy,
    RefreshCw,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Sparkles,
} from 'lucide-react';
import { useReports, useCreateReport, useDeleteReport, useUpdateReport, type Report, type ReportFilters as FiltersType } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { useAuthStore } from '@/stores/auth-store';
import { ReportStatistics } from '@/components/reports/report-statistics';
import { ReportFilters } from '@/components/reports/report-filters';
import { ReportPreviewModal } from '@/components/reports/report-preview-modal';

const reportTypes = [
    { id: 'vulnerability_summary', name: '취약점 요약', description: '프로젝트별 취약점 현황 요약' },
    { id: 'trend_analysis', name: '트렌드 분석', description: '시간별 취약점 추이 분석' },
    { id: 'compliance_audit', name: '컴플라이언스 감사', description: '규제 준수 현황 리포트' },
    { id: 'project_status', name: '프로젝트 현황', description: '개별 프로젝트 상세 리포트' },
];

function getStatusBadge(status: string) {
    switch (status) {
        case 'completed':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    완료
                </span>
            );
        case 'generating':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    생성 중
                </span>
            );
        case 'pending':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                    대기 중
                </span>
            );
        case 'failed':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    실패
                </span>
            );
        default:
            return null;
    }
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ReportsPage() {
    const [filters, setFilters] = useState<FiltersType>({ page: 1, limit: 25, sortBy: 'createdAt', sortOrder: 'desc' });
    const { data: reportsData, isLoading, error } = useReports(filters);
    const createMutation = useCreateReport();
    const deleteMutation = useDeleteReport();
    const updateMutation = useUpdateReport();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
    const [reportName, setReportName] = useState('');

    // Schedule state
    const [enableSchedule, setEnableSchedule] = useState(false);
    const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [scheduleTime, setScheduleTime] = useState('09:00');
    const [scheduleDay, setScheduleDay] = useState<number>(1); // Day of week (1-7) or day of month (1-31)

    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [editName, setEditName] = useState('');
    const [editFormat, setEditFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');

    const [previewReport, setPreviewReport] = useState<Report | null>(null);

    // Batch selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isBatchDownloading, setIsBatchDownloading] = useState(false);

    // View mode state
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [showStats, setShowStats] = useState(true);

    // Quick filter helpers
    const applyQuickFilter = (range: 'today' | 'week' | 'month') => {
        const now = new Date();
        let dateFrom: string;
        
        if (range === 'today') {
            dateFrom = now.toISOString().split('T')[0];
        } else if (range === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFrom = weekAgo.toISOString().split('T')[0];
        } else {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFrom = monthAgo.toISOString().split('T')[0];
        }
        
        setFilters({ ...filters, dateFrom, dateTo: now.toISOString().split('T')[0], page: 1 });
    };

    // Sort handler
    const handleSort = (field: string) => {
        if (filters.sortBy === field) {
            setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
        } else {
            setFilters({ ...filters, sortBy: field, sortOrder: 'desc' });
        }
    };

    const getSortIcon = (field: string) => {
        if (filters.sortBy !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
        return filters.sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    // AI Execution
    const {
        execute: executeReportGenerate,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('report.generation');

    const { activePanel, closePanel } = useAiStore();

    const reports = reportsData?.data || [];
    const pagination = reportsData?.pagination;

    const handleAiReportGenerate = () => {
        const context = {
            screen: 'reports',
            existingReports: reports.slice(0, 5),
            timestamp: new Date().toISOString(),
        };
        executeReportGenerate(context);
    };

    const handleDownload = async (report: Report) => {
        if (report.downloadUrl) {
            try {
                const token = useAuthStore.getState().accessToken;
                const response = await fetch(report.downloadUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Download failed');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${report.name.replace(/\s+/g, '_')}.${report.format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (err) {
                console.error('Failed to download report:', err);
                alert('다운로드에 실패했습니다.');
            }
        }
    };

    const handleCreate = async () => {
        if (!selectedType || !reportName) return;
        try {
            const scheduleConfig = enableSchedule ? {
                schedule: {
                    enabled: true,
                    frequency: scheduleFrequency,
                    time: scheduleTime,
                    day: scheduleDay,
                }
            } : {};

            await createMutation.mutateAsync({
                name: reportName,
                type: selectedType,
                format: selectedFormat,
                parameters: scheduleConfig,
            });
            setShowCreateForm(false);
            setSelectedType('');
            setReportName('');
            setEnableSchedule(false);
        } catch (err) {
            console.error('Failed to create report:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('이 리포트를 삭제하시겠습니까?')) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err) {
                console.error('Failed to delete report:', err);
            }
        }
    };

    const handleEdit = (report: Report) => {
        setEditingReport(report);
        setEditName(report.name);
        setEditFormat(report.format as 'pdf' | 'csv' | 'xlsx');
    };

    const handleUpdate = async () => {
        if (!editingReport || !editName) return;
        try {
            await updateMutation.mutateAsync({
                id: editingReport.id,
                name: editName,
                format: editFormat,
            });
            setEditingReport(null);
        } catch (err) {
            console.error('Failed to update report:', err);
        }
    };

    // Batch selection handlers
    const toggleSelection = (id: string) => {
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

    const toggleAllSelection = () => {
        if (selectedIds.size === reports.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(reports.map(r => r.id)));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`선택한 ${selectedIds.size}개의 리포트를 삭제하시겠습니까?`)) return;

        setIsBatchDeleting(true);
        try {
            for (const id of selectedIds) {
                await deleteMutation.mutateAsync(id);
            }
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to batch delete reports:', err);
            alert('일부 리포트 삭제에 실패했습니다.');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleBatchDownload = async () => {
        if (selectedIds.size === 0) return;

        const downloadableReports = reports.filter(
            r => selectedIds.has(r.id) && r.status === 'completed' && r.downloadUrl
        );

        if (downloadableReports.length === 0) {
            alert('다운로드 가능한 리포트가 없습니다.');
            return;
        }

        setIsBatchDownloading(true);
        try {
            for (const report of downloadableReports) {
                await handleDownload(report);
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (err) {
            console.error('Failed to batch download:', err);
        } finally {
            setIsBatchDownloading(false);
        }
    };

    const selectedCount = selectedIds.size;
    const allSelected = reports.length > 0 && selectedIds.size === reports.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < reports.length;

    if (isLoading && !reportsData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">오류 발생</h3>
                <p className="text-red-600 dark:text-red-300">리포트 목록을 불러오는데 실패했습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">리포트</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        보안 리포트를 생성하고 다운로드합니다
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AiButton
                        action="report.generation"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimateTokens({ reports: reports.slice(0, 5) })}
                        loading={aiLoading}
                        onExecute={handleAiReportGenerate}
                        onCancel={cancelAi}
                    />
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                        <Plus className="h-4 w-4" />
                        리포트 생성
                    </button>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">빠른 필터:</span>
                    <button
                        onClick={() => applyQuickFilter('today')}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        오늘
                    </button>
                    <button
                        onClick={() => applyQuickFilter('week')}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                        이번 주
                    </button>
                    <button
                        onClick={() => applyQuickFilter('month')}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                        이번 달
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${showStats ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        통계
                    </button>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="테이블 뷰"
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="카드 뷰"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Dashboard */}
            {showStats && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <ReportStatistics />
                </div>
            )}

            {/* Filters */}
            <ReportFilters filters={filters} onFilterChange={setFilters} />

            {/* Create Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">✨ 새 리포트 생성</h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                리포트 이름
                            </label>
                            <input
                                type="text"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                placeholder="예: 12월 취약점 현황 리포트"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                리포트 유형
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {reportTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={`p-4 rounded-lg border text-left transition-colors ${selectedType === type.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <p className="font-medium text-slate-900 dark:text-white">{type.name}</p>
                                        <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                출력 형식
                            </label>
                            <div className="flex gap-3">
                                {(['pdf', 'csv', 'xlsx'] as const).map((format) => (
                                    <button
                                        key={format}
                                        onClick={() => setSelectedFormat(format)}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${selectedFormat === format
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        {format.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Schedule Options */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Repeat className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                    <span className="font-medium text-slate-900 dark:text-white">정기 생성 스케줄</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEnableSchedule(!enableSchedule)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableSchedule ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableSchedule ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            {enableSchedule && (
                                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            반복 주기
                                        </label>
                                        <div className="flex gap-3">
                                            {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                                                <button
                                                    key={freq}
                                                    type="button"
                                                    onClick={() => setScheduleFrequency(freq)}
                                                    className={`px-4 py-2 rounded-lg border transition-colors ${scheduleFrequency === freq
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    {freq === 'daily' ? '매일' : freq === 'weekly' ? '매주' : '매월'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {scheduleFrequency === 'weekly' && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    요일
                                                </label>
                                                <select
                                                    value={scheduleDay}
                                                    onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                >
                                                    <option value={1}>월요일</option>
                                                    <option value={2}>화요일</option>
                                                    <option value={3}>수요일</option>
                                                    <option value={4}>목요일</option>
                                                    <option value={5}>금요일</option>
                                                    <option value={6}>토요일</option>
                                                    <option value={0}>일요일</option>
                                                </select>
                                            </div>
                                        )}
                                        {scheduleFrequency === 'monthly' && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    일
                                                </label>
                                                <select
                                                    value={scheduleDay}
                                                    onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                >
                                                    {Array.from({ length: 28 }, (_, i) => (
                                                        <option key={i + 1} value={i + 1}>{i + 1}일</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className={scheduleFrequency === 'daily' ? 'col-span-2' : ''}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                <Clock className="h-4 w-4 inline mr-1" />
                                                시간
                                            </label>
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        ℹ️ 스케줄이 설정되면 지정된 시간에 자동으로 리포트가 생성됩니다.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!selectedType || !reportName || createMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        생성 중...
                                    </>
                                ) : (
                                    '생성'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingReport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">리포트 수정</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    리포트 이름
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    출력 형식
                                </label>
                                <div className="flex gap-3">
                                    {(['pdf', 'csv', 'xlsx'] as const).map((format) => (
                                        <button
                                            key={format}
                                            onClick={() => setEditFormat(format)}
                                            className={`px-4 py-2 rounded-lg border transition-colors ${editFormat === format
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}
                                        >
                                            {format.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setEditingReport(null)}
                                    className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={!editName || updateMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updateMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            저장 중...
                                        </>
                                    ) : (
                                        '저장'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports List */}
            {reports.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-2xl flex items-center justify-center">
                        <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                        리포트가 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        프로젝트의 보안 현황을 파악할 수 있는 리포트를 생성해보세요.<br />
                        PDF, CSV, Excel 형식으로 내보낼 수 있습니다.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
                        >
                            <Plus className="h-5 w-5" />
                            첫 리포트 생성
                        </button>
                        <button
                            onClick={handleAiReportGenerate}
                            disabled={aiLoading}
                            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                            <Sparkles className="h-5 w-5" />
                            AI로 자동 생성
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Batch Action Toolbar */}
                    {selectedCount > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                {selectedCount}개 선택됨
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleBatchDownload}
                                    disabled={isBatchDownloading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                                >
                                    {isBatchDownloading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    다운로드
                                </button>
                                <button
                                    onClick={handleBatchDelete}
                                    disabled={isBatchDeleting}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                                >
                                    {isBatchDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                    삭제
                                </button>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                >
                                    선택 해제
                                </button>
                            </div>
                        </div>
                    )}

                    {viewMode === 'table' ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-4 py-3 w-12">
                                        <button
                                            onClick={toggleAllSelection}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                                        >
                                            {allSelected ? (
                                                <CheckSquare className="h-5 w-5 text-blue-600" />
                                            ) : someSelected ? (
                                                <MinusSquare className="h-5 w-5 text-blue-600" />
                                            ) : (
                                                <Square className="h-5 w-5 text-slate-400" />
                                            )}
                                        </button>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('name')}
                                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            리포트
                                            {getSortIcon('name')}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('type')}
                                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            유형
                                            {getSortIcon('type')}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('status')}
                                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            상태
                                            {getSortIcon('status')}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('createdAt')}
                                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            생성일
                                            {getSortIcon('createdAt')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {reports.map((report) => (
                                    <tr key={report.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${selectedIds.has(report.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-4 py-4 w-12">
                                            <button
                                                onClick={() => toggleSelection(report.id)}
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                                            >
                                                {selectedIds.has(report.id) ? (
                                                    <CheckSquare className="h-5 w-5 text-blue-600" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-slate-400" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.format === 'pdf' ? 'bg-red-100 dark:bg-red-900/30' : report.format === 'csv' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                                    <File className={`h-5 w-5 ${report.format === 'pdf' ? 'text-red-600' : report.format === 'csv' ? 'text-green-600' : 'text-blue-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{report.name}</p>
                                                    <p className="text-sm text-slate-500">{report.format.toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {reportTypes.find(t => t.id === report.type)?.name || report.type}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(report.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(report.createdAt)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {report.status === 'completed' && (
                                                    <>
                                                        <button
                                                            onClick={() => setPreviewReport(report)}
                                                            className="p-2 text-slate-400 hover:text-green-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                            title="미리보기"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(report)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                            title="다운로드"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(report)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="수정"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    ) : (
                    /* Card View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className={`group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 ${selectedIds.has(report.id) ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            >
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleSelection(report.id)}
                                    className="absolute top-3 left-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                >
                                    {selectedIds.has(report.id) ? (
                                        <CheckSquare className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <Square className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                                    )}
                                </button>

                                {/* Format Icon */}
                                <div className="flex justify-center mb-4 pt-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${report.format === 'pdf' ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40' : report.format === 'csv' ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40' : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40'}`}>
                                        <File className={`h-7 w-7 ${report.format === 'pdf' ? 'text-red-600' : report.format === 'csv' ? 'text-green-600' : 'text-blue-600'}`} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-center mb-4">
                                    <h3 className="font-semibold text-slate-900 dark:text-white truncate mb-1" title={report.name}>
                                        {report.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        {reportTypes.find(t => t.id === report.type)?.name || report.type}
                                    </p>
                                    <div className="flex justify-center">
                                        {getStatusBadge(report.status)}
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(report.createdAt)}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    {report.status === 'completed' && (
                                        <>
                                            <button
                                                onClick={() => setPreviewReport(report)}
                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                title="미리보기"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(report)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="다운로드"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleEdit(report)}
                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                        title="수정"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(report.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Format Badge */}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${report.format === 'pdf' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : report.format === 'csv' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                        {report.format}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {pagination.total}개 중 {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page! - 1) })}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {pagination.page} / {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, filters.page! + 1) })}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Preview Modal */}
            <ReportPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'report.generation'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiReportGenerate}
                action="report.generation"
            />
        </div>
    );
}
