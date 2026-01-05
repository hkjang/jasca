'use client';

import { useState } from 'react';
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
    Clock,
    Bell,
    FileSpreadsheet,
    FileType,
    Repeat,
    Settings,
} from 'lucide-react';
import { useReports, useCreateReport, useDeleteReport, useUpdateReport, type Report } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { useAuthStore } from '@/stores/auth-store';
import { ThemeToggle } from '@/components/theme-toggle';

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
    const { data: reports = [], isLoading, error } = useReports();
    const createMutation = useCreateReport();
    const deleteMutation = useDeleteReport();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
    const [reportName, setReportName] = useState('');
    const [enableSchedule, setEnableSchedule] = useState(false);
    const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [scheduleTime, setScheduleTime] = useState('09:00');
    const [notifyOnComplete, setNotifyOnComplete] = useState(true);

    // Edit state
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [editName, setEditName] = useState('');
    const [editFormat, setEditFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
    const updateMutation = useUpdateReport();

    // AI Execution for report generation
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

    const handleAiReportGenerate = () => {
        const context = {
            screen: 'reports',
            existingReports: reports?.slice(0, 5) || [],
            timestamp: new Date().toISOString(),
        };
        executeReportGenerate(context);
    };

    const handleAiRegenerate = () => {
        handleAiReportGenerate();
    };

    const estimatedTokens = estimateTokens({
        reports: reports?.slice(0, 5) || [],
    });

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
            await createMutation.mutateAsync({
                name: reportName,
                type: selectedType,
                format: selectedFormat,
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
        setEditFormat(report.format as 'pdf' | 'csv');
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

    if (isLoading) {
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
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiReportGenerate}
                        onCancel={cancelAi}
                    />
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        리포트 생성
                    </button>
                </div>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">새 리포트 생성</h3>
                    <div className="space-y-4">
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
                                <button
                                    onClick={() => setSelectedFormat('pdf')}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${selectedFormat === 'pdf'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    PDF
                                </button>
                                <button
                                    onClick={() => setSelectedFormat('csv')}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${selectedFormat === 'csv'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    CSV
                                </button>
                            </div>
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
                                    <button
                                        onClick={() => setEditFormat('pdf')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${editFormat === 'pdf'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => setEditFormat('csv')}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${editFormat === 'csv'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        CSV
                                    </button>
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        리포트가 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        새로운 보안 리포트를 생성해보세요.
                    </p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        첫 리포트 생성
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    리포트
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    유형
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    생성일
                                </th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.format === 'pdf' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                                                <File className={`h-5 w-5 ${report.format === 'pdf' ? 'text-red-600' : 'text-green-600'}`} />
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
                                                <button
                                                    onClick={() => handleDownload(report)}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    다운로드
                                                </button>
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
            )}

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'report.generation'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="report.generation"
            />
        </div>
    );
}
