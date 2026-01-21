'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowLeftRight,
    Plus,
    Minus,
    AlertTriangle,
    CheckCircle,
    Calendar,
    ChevronDown,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { useScanDiff, useScans } from '@/lib/api-hooks';

function getSeverityColor(severity: string) {
    const colors: Record<string, string> = {
        CRITICAL: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
        HIGH: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
        MEDIUM: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
        LOW: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[severity] || 'text-slate-600 bg-slate-100';
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

export default function ScanDiffPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const scanId = params.id as string;
    const compareId = searchParams.get('compare') || '';

    const [showUnchanged, setShowUnchanged] = useState(false);
    const [selectedCompareId, setSelectedCompareId] = useState(compareId);

    // Fetch available scans for comparison selection
    const { data: scansData } = useScans();
    const availableScans = (scansData?.results || []).filter(s => s.id !== scanId);

    // Fetch diff data
    const { data: diff, isLoading, error, refetch } = useScanDiff(scanId, selectedCompareId);

    const netChange = diff ? diff.added.length - diff.removed.length : 0;

    if (!selectedCompareId) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={`/dashboard/scans/${scanId}`}
                        className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">스캔 비교</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            비교할 스캔을 선택하세요
                        </p>
                    </div>
                </div>

                {/* Scan Selection */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        비교할 스캔 선택
                    </h3>
                    {availableScans.length === 0 ? (
                        <p className="text-slate-500">비교 가능한 다른 스캔이 없습니다.</p>
                    ) : (
                        <div className="space-y-2">
                            {availableScans.map(scan => (
                                <button
                                    key={scan.id}
                                    onClick={() => setSelectedCompareId(scan.id)}
                                    className="w-full flex items-center justify-between p-4 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {scan.targetName}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {scan.project?.name} • {formatDate(scan.startedAt)}
                                        </p>
                                    </div>
                                    <ArrowLeftRight className="h-5 w-5 text-slate-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !diff) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-slate-600 dark:text-slate-400">스캔 비교에 실패했습니다.</p>
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/dashboard/scans/${scanId}`}
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">스캔 비교</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        이전 스캔 대비 취약점 변화 분석
                    </p>
                </div>
                <button
                    onClick={() => setSelectedCompareId('')}
                    className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                    다른 스캔 선택
                </button>
            </div>

            {/* Scan Comparison Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                    {/* Base Scan */}
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 mb-1">이전 스캔</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{diff.baseScan.targetName}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(diff.baseScan.date)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            총 {diff.baseScan.totalVulnerabilities}개 취약점
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="px-8">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <ArrowLeftRight className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                        </div>
                    </div>

                    {/* Compare Scan */}
                    <div className="flex-1 text-right">
                        <p className="text-sm text-slate-500 mb-1">현재 스캔</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{diff.compareScan.targetName}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 justify-end">
                            <Calendar className="h-4 w-4" />
                            {formatDate(diff.compareScan.date)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            총 {diff.compareScan.totalVulnerabilities}개 취약점
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Plus className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">새로 추가됨</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">+{diff.added.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Minus className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">해결됨</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">-{diff.removed.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${netChange > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {netChange > 0 ? (
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            ) : (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">순 변화</p>
                            <p className={`text-2xl font-bold ${netChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {netChange > 0 ? '+' : ''}{netChange}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Added Vulnerabilities */}
            {diff.added.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <Plus className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            새로 추가된 취약점 ({diff.added.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {diff.added.map((vuln) => (
                            <div key={vuln.cveId} className="p-4 flex items-center gap-4 bg-red-50/50 dark:bg-red-900/10">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(vuln.severity)}`}>
                                    {vuln.severity}
                                </span>
                                <div className="flex-1">
                                    <Link
                                        href={`/dashboard/vulnerabilities/${vuln.cveId}`}
                                        className="font-medium text-slate-900 dark:text-white hover:text-blue-600"
                                    >
                                        {vuln.cveId}
                                    </Link>
                                    <p className="text-sm text-slate-500">{vuln.title}</p>
                                </div>
                                <span className="text-sm text-slate-500 font-mono">{vuln.pkgName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Removed Vulnerabilities */}
            {diff.removed.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Minus className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            해결된 취약점 ({diff.removed.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {diff.removed.map((vuln) => (
                            <div key={vuln.cveId} className="p-4 flex items-center gap-4 bg-green-50/50 dark:bg-green-900/10">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(vuln.severity)}`}>
                                    {vuln.severity}
                                </span>
                                <div className="flex-1">
                                    <span className="font-medium text-slate-900 dark:text-white line-through opacity-60">
                                        {vuln.cveId}
                                    </span>
                                    <p className="text-sm text-slate-500">{vuln.title}</p>
                                </div>
                                <span className="text-sm text-slate-500 font-mono">{vuln.pkgName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unchanged Toggle */}
            <button
                onClick={() => setShowUnchanged(!showUnchanged)}
                className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <ChevronDown className={`h-5 w-5 transition-transform ${showUnchanged ? 'rotate-180' : ''}`} />
                변경 없음 ({diff.unchanged}개 취약점)
            </button>
        </div>
    );
}
