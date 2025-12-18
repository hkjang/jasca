'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    FileSearch,
    Calendar,
    Package,
    AlertCircle,
    CheckCircle,
    ChevronRight,
    Loader2,
    RefreshCw,
    ExternalLink,
} from 'lucide-react';
import { useScan } from '@/lib/api-hooks';

function getSeverityColor(severity: string) {
    switch (severity?.toUpperCase()) {
        case 'CRITICAL':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
        case 'HIGH':
            return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
        case 'MEDIUM':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        case 'LOW':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        default:
            return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
}

function getSeverityBgOnly(severity: string) {
    switch (severity?.toUpperCase()) {
        case 'CRITICAL': return 'bg-red-500';
        case 'HIGH': return 'bg-orange-500';
        case 'MEDIUM': return 'bg-yellow-500';
        case 'LOW': return 'bg-blue-500';
        default: return 'bg-slate-400';
    }
}

function formatDate(dateString?: string | null) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ScanDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const { data: scan, isLoading, error, refetch } = useScan(id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !scan) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
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

    const summary = (scan as any).summary || {};
    const vulnerabilities = (scan as any).vulnerabilities || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/scans"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        스캔 상세 정보
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {(scan as any).artifactName || (scan as any).imageRef || 'Unknown'}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Critical</span>
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                        {summary.critical || 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">High</span>
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                        {summary.high || 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Medium</span>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                        {summary.medium || 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Low</span>
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                        {summary.low || 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
                        <FileSearch className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                        {summary.totalVulns || vulnerabilities.length || 0}
                    </p>
                </div>
            </div>

            {/* Scan Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    스캔 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">프로젝트</span>
                        <p className="font-medium text-slate-900 dark:text-white">
                            {(scan as any).project?.name || '-'}
                        </p>
                    </div>
                    <div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">이미지</span>
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                            {(scan as any).imageRef || '-'}
                        </p>
                    </div>
                    <div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">태그</span>
                        <p className="font-medium text-slate-900 dark:text-white">
                            {(scan as any).tag || '-'}
                        </p>
                    </div>
                    <div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">스캔 일시</span>
                        <p className="font-medium text-slate-900 dark:text-white">
                            {formatDate((scan as any).createdAt)}
                        </p>
                    </div>
                </div>
                {/* Source Information */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">업로드 출처</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">소스 타입</span>
                            <p className="font-medium text-slate-900 dark:text-white">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${(scan as any).sourceType === 'MANUAL'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                        : (scan as any).sourceType?.startsWith('CI_')
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    }`}>
                                    {(scan as any).sourceType || 'UNKNOWN'}
                                </span>
                            </p>
                        </div>
                        <div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">업로더 IP</span>
                            <p className="font-mono text-sm text-slate-900 dark:text-white">
                                {(scan as any).uploaderIp || '-'}
                            </p>
                        </div>
                        <div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">User-Agent</span>
                            <p className="font-medium text-slate-900 dark:text-white text-sm truncate" title={(scan as any).userAgent}>
                                {(scan as any).userAgent
                                    ? ((scan as any).userAgent.length > 40
                                        ? (scan as any).userAgent.substring(0, 40) + '...'
                                        : (scan as any).userAgent)
                                    : '-'}
                            </p>
                        </div>
                        <div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">CI 파이프라인</span>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {(scan as any).ciPipeline || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vulnerabilities List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        취약점 목록 ({vulnerabilities.length}개)
                    </h3>
                </div>

                {vulnerabilities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">
                            취약점이 발견되지 않았습니다.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {vulnerabilities.map((vuln: any, index: number) => (
                            <div key={vuln.id || index} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(vuln.vulnerability?.severity || 'UNKNOWN')}`}>
                                        {vuln.vulnerability?.severity || 'UNKNOWN'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                {vuln.vulnerability?.cveId || 'N/A'}
                                            </span>
                                            {vuln.vulnerability?.cvssV3Score && (
                                                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                    CVSS: {vuln.vulnerability.cvssV3Score}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                            {vuln.vulnerability?.title || vuln.vulnerability?.description || '-'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Package className="h-3 w-3" />
                                                {vuln.pkgName}@{vuln.pkgVersion}
                                            </span>
                                            {vuln.fixedVersion && (
                                                <span className="text-green-600 dark:text-green-400">
                                                    Fixed: {vuln.fixedVersion}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {vuln.vulnerability?.cveId && (
                                        <a
                                            href={`https://nvd.nist.gov/vuln/detail/${vuln.vulnerability.cveId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
