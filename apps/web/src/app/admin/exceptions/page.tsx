'use client';

import { useState } from 'react';
import {
    ShieldCheck,
    Clock,
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertTriangle,
    HelpCircle,
    GitBranch,
    ArrowRight,
    Info,
    Link2,
    Settings,
} from 'lucide-react';
import { useExceptions, useApproveException, useRejectException, type Exception } from '@/lib/api-hooks';

function getSeverityBadge(severity: string) {
    const styles: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${styles[severity] || ''}`}>
            {severity}
        </span>
    );
}

function getStatusBadge(status: string) {
    const config: Record<string, { icon: React.ReactNode; style: string; label: string }> = {
        PENDING: { icon: <Clock className="h-3 w-3" />, style: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: '대기 중' },
        APPROVED: { icon: <CheckCircle className="h-3 w-3" />, style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '승인됨' },
        REJECTED: { icon: <XCircle className="h-3 w-3" />, style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: '반려됨' },
    };
    const { icon, style, label } = config[status] || config.PENDING;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style}`}>
            {icon}
            {label}
        </span>
    );
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

export default function ExceptionsPage() {
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'list' | 'help'>('list');

    const { data: exceptions = [], isLoading, error, refetch } = useExceptions(
        filter === 'all' ? undefined : filter
    );
    const approveMutation = useApproveException();
    const rejectMutation = useRejectException();

    const pendingCount = exceptions.filter(e => e.status === 'PENDING').length;

    const handleApprove = async (id: string) => {
        try {
            await approveMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to approve exception:', err);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('반려 사유를 입력하세요:');
        if (reason) {
            try {
                await rejectMutation.mutateAsync({ id, reason });
            } catch (err) {
                console.error('Failed to reject exception:', err);
            }
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
                <p className="text-red-600 dark:text-red-300">예외 요청 목록을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">예외 승인</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    취약점 예외 요청을 검토하고 승인/반려합니다
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'list'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <ShieldCheck className="h-4 w-4" />
                    예외 목록
                    {pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingCount}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('help')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'help'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <HelpCircle className="h-4 w-4" />
                    사용법 안내
                </button>
            </div>

            {/* Help Content */}
            {activeTab === 'help' && (
                <div className="space-y-6">
                    {/* Overview */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-lg">
                                <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                    예외 승인이란?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    예외 승인은 특정 취약점이나 패키지를 정책에서 예외 처리하는 메커니즘입니다.
                                    예외가 승인되면 해당 취약점이 자동으로 &quot;오탐&quot; 상태로 변경되어 더 이상 알림이 발생하지 않습니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Workflow Integration */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Link2 className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                워크플로우 연동
                            </h3>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    예외 승인 시스템은 <strong>워크플로우 관리</strong>와 자동으로 연동됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">승인 시</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        CVE 또는 패키지에 대한 예외가 승인되면:
                                    </p>
                                    <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                        <li className="flex items-center gap-2">
                                            <ArrowRight className="h-3 w-3" />
                                            관련 취약점이 자동으로 <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 rounded text-xs">오탐</span> 상태로 변경
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <ArrowRight className="h-3 w-3" />
                                            워크플로우 히스토리에 예외 승인 기록 저장
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">반려 시</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        취약점 상태는 변경되지 않으며, 요청자가 다시 예외 요청을 할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exception Types */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Settings className="h-5 w-5 text-orange-600" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                예외 유형
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">CVE 예외</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    특정 CVE ID에 대한 예외입니다. 승인 시 해당 CVE를 포함한 모든 취약점이 자동으로 &quot;오탐&quot; 처리됩니다.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">패키지 예외</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    특정 패키지에 대한 예외입니다. 해당 패키지의 모든 취약점이 자동으로 예외 처리됩니다.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">이미지 예외</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    특정 컨테이너 이미지에 대한 예외입니다.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">심각도 예외</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    특정 심각도 이하의 취약점을 예외 처리합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Flow Diagram */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                        <h3 className="text-lg font-semibold mb-4">예외 처리 흐름</h3>
                        <div className="flex items-center justify-center gap-4 flex-wrap py-4">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <Clock className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-sm mt-2">예외 요청</span>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-sm mt-2">관리자 검토</span>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-sm mt-2">승인</span>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                                    <GitBranch className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-sm mt-2">상태 자동 변경</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Content */}
            {activeTab === 'list' && (
            <>
            {/* Filters */}
            <div className="flex items-center gap-2">
                {[
                    { value: 'pending', label: '대기 중', showCount: true },
                    { value: 'approved', label: '승인됨' },
                    { value: 'rejected', label: '반려됨' },
                    { value: 'all', label: '전체' },
                ].map((item) => (
                    <button
                        key={item.value}
                        onClick={() => setFilter(item.value as typeof filter)}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${filter === item.value
                            ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        {item.label}
                        {item.showCount && pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Exceptions List */}
            {exceptions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <ShieldCheck className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        예외 요청이 없습니다
                    </h3>
                </div>
            ) : (
                <div className="space-y-4">
                    {exceptions.map((exception: Exception) => (
                        <div
                            key={exception.id}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                            <div
                                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                onClick={() => setExpandedId(expandedId === exception.id ? null : exception.id)}
                            >
                                <div className="flex-1 flex items-center gap-4">
                                    {getSeverityBadge(exception.vulnerability?.severity || 'UNKNOWN')}
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">
                                            {exception.vulnerability?.cveId || exception.vulnerabilityId}
                                        </p>
                                        <p className="text-sm text-slate-500">{exception.project?.name || exception.projectId}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{exception.requestedBy}</p>
                                        <p className="text-xs text-slate-400">{formatDate(exception.requestedAt)}</p>
                                    </div>
                                    {getStatusBadge(exception.status)}
                                    {expandedId === exception.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                            </div>

                            {expandedId === exception.id && (
                                <div className="px-4 pb-4 space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">예외 요청 사유:</p>
                                        <p className="text-slate-600 dark:text-slate-400">{exception.reason}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-slate-500">만료일</span>
                                            <p className="text-slate-700 dark:text-slate-300">{formatDate(exception.expiresAt)}</p>
                                        </div>
                                    </div>

                                    {exception.status === 'APPROVED' && exception.approvedBy && (
                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                                            <p className="text-green-700 dark:text-green-400">
                                                {exception.approvedBy}님이 {formatDate(exception.approvedAt || '')}에 승인함
                                            </p>
                                        </div>
                                    )}

                                    {exception.status === 'REJECTED' && exception.rejectedBy && (
                                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-sm">
                                            <p className="text-red-700 dark:text-red-400 mb-1">
                                                {exception.rejectedBy}님이 {formatDate(exception.rejectedAt || '')}에 반려함
                                            </p>
                                            {exception.rejectReason && (
                                                <p className="text-red-600 dark:text-red-300">사유: {exception.rejectReason}</p>
                                            )}
                                        </div>
                                    )}

                                    {exception.status === 'PENDING' && (
                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleReject(exception.id); }}
                                                disabled={rejectMutation.isPending}
                                                className="flex items-center gap-2 px-4 py-2 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                            >
                                                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                                반려
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleApprove(exception.id); }}
                                                disabled={approveMutation.isPending}
                                                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                                승인
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </>
            )}
        </div>
    );
}
