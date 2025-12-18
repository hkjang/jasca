'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useScans, Scan } from '@/lib/api-hooks';
import { UploadScanModal } from '@/components/upload-scan-modal';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

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

export default function ScansPage() {
    const { data, isLoading, error, refetch } = useScans();
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
                        총 {data?.total || 0}개의 스캔 결과
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
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    대상
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    프로젝트
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    취약점
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    출처
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    스캔 일시
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">

                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {scans.map((scan: Scan) => (
                                <tr key={scan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <FileSearch className="h-5 w-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {scan.targetName}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {scan.scanType}
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
                                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                                {scan.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {scan.summary ? (
                                            <div className="flex items-center gap-1.5">
                                                {scan.summary.critical > 0 && getSeverityBadge('critical', scan.summary.critical)}
                                                {scan.summary.high > 0 && getSeverityBadge('high', scan.summary.high)}
                                                {scan.summary.medium > 0 && getSeverityBadge('medium', scan.summary.medium)}
                                                {scan.summary.low > 0 && getSeverityBadge('low', scan.summary.low)}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-medium ${(scan as any).sourceType === 'MANUAL'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : (scan as any).sourceType?.startsWith('CI_')
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {(scan as any).sourceType || 'UNKNOWN'}
                                            </span>
                                            {(scan as any).uploaderIp && (
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {(scan as any).uploaderIp}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate((scan as any).createdAt || scan.startedAt)}
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
