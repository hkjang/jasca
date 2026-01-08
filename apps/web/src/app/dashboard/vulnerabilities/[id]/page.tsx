'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    AlertTriangle,
    Package,
    Shield,
    Link as LinkIcon,
    User,
    Clock,
    Sparkles,
    History,
    Loader2,
    RefreshCw,
    ExternalLink,
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    X,
    UserPlus,
    FileWarning,
} from 'lucide-react';
import { useVulnerability, useVulnerabilityHistory, useUpdateVulnerabilityStatus, useAssignVulnerability, useUsers, useCreateException, useExceptions } from '@/lib/api-hooks';
import { AiButton, AiButtonGroup, AiResultPanel } from '@/components/ai';
import { useAiExecution, useVulnerabilityAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

function getSeverityBadge(severity: string) {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
        LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    };
    return (
        <span className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${colors[severity] || colors.UNKNOWN}`}>
            {severity}
        </span>
    );
}

function getStatusBadge(status: string) {
    const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
        OPEN: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', label: '미해결' },
        IN_PROGRESS: { icon: <Clock className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', label: '진행 중' },
        RESOLVED: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', label: '해결됨' },
        WONT_FIX: { icon: <XCircle className="h-4 w-4" />, color: 'text-slate-600 bg-slate-50 dark:bg-slate-700', label: '수정 안함' },
        FALSE_POSITIVE: { icon: <Shield className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', label: '오탐' },
    };
    const { icon, color, label } = config[status] || config.OPEN;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${color}`}>
            {icon}
            {label}
        </span>
    );
}

function formatHistoryDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function VulnerabilityDetailPage() {
    const params = useParams();
    const vulnId = params.id as string;

    const { data: vuln, isLoading, error, refetch } = useVulnerability(vulnId);
    const { data: historyData, isLoading: historyLoading } = useVulnerabilityHistory(vulnId);
    const { data: users } = useUsers();
    const { data: exceptionsData } = useExceptions('approved');
    const updateStatus = useUpdateVulnerabilityStatus();
    const assignVuln = useAssignVulnerability();
    const createException = useCreateException();
    
    // Check if this vulnerability has an approved exception
    const vulnException = React.useMemo(() => {
        if (!exceptionsData || !vuln) return null;
        return exceptionsData.find(e => 
            e.vulnerabilityId === vuln.cveId || 
            e.vulnerability?.cveId === vuln.cveId ||
            e.vulnerabilityId === vulnId
        );
    }, [exceptionsData, vuln, vulnId]);
    
    
    const [showHistory, setShowHistory] = useState(false);
    
    // Action modal states
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showExceptionModal, setShowExceptionModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
    
    // Exception request form states
    const [exceptionReason, setExceptionReason] = useState('false_positive');
    const [exceptionDescription, setExceptionDescription] = useState('');
    const [exceptionExpiry, setExceptionExpiry] = useState('');

    // AI Execution for Action Guide
    const collectVulnContext = useVulnerabilityAiContext();
    const {
        execute: executeActionGuide,
        isLoading: actionGuideLoading,
        result: actionGuideResult,
        previousResults: actionGuidePrevious,
        estimateTokens: estimateActionGuideTokens,
        cancel: cancelActionGuide,
        progress: actionGuideProgress,
    } = useAiExecution('vuln.actionGuide', { entityId: vulnId });

    // AI Execution for Impact Analysis
    const {
        execute: executeImpactAnalysis,
        isLoading: impactLoading,
        result: impactResult,
        previousResults: impactPrevious,
        estimateTokens: estimateImpactTokens,
        cancel: cancelImpact,
        progress: impactProgress,
    } = useAiExecution('vuln.impactAnalysis', { entityId: vulnId });

    const { activePanel, closePanel } = useAiStore();

    const handleActionGuide = () => {
        if (vuln) {
            const context = collectVulnContext(vuln);
            executeActionGuide(context);
        }
    };

    const handleImpactAnalysis = () => {
        if (vuln) {
            const context = collectVulnContext(vuln);
            executeImpactAnalysis(context);
        }
    };

    const estimatedActionGuideTokens = vuln ? estimateActionGuideTokens(collectVulnContext(vuln)) : 0;
    const estimatedImpactTokens = vuln ? estimateImpactTokens(collectVulnContext(vuln)) : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !vuln) {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/vulnerabilities"
                    className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{vuln.cveId}</h1>
                        {getSeverityBadge(vuln.severity)}
                        {getStatusBadge(vuln.status)}
                        {vulnException && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                                <Shield className="h-4 w-4" />
                                예외 승인됨
                            </span>
                        )}
                    </div>
                    {vuln.title && (
                        <p className="text-slate-500 mt-1">{vuln.title}</p>
                    )}
                    {vulnException && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">
                                <strong>예외 사유:</strong> {vulnException.reason}
                            </p>
                            {vulnException.expiresAt && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    만료일: {new Date(vulnException.expiresAt).toLocaleDateString('ko-KR')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <AiButtonGroup>
                    <AiButton
                        action="vuln.actionGuide"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedActionGuideTokens}
                        loading={actionGuideLoading}
                        onExecute={handleActionGuide}
                        onCancel={cancelActionGuide}
                    />
                    <AiButton
                        action="vuln.impactAnalysis"
                        variant="secondary"
                        size="md"
                        estimatedTokens={estimatedImpactTokens}
                        loading={impactLoading}
                        onExecute={handleImpactAnalysis}
                        onCancel={cancelImpact}
                    />
                </AiButtonGroup>
                <a
                    href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    NVD에서 보기
                    <ExternalLink className="h-4 w-4" />
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* CVE Description */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">CVE 설명</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {vuln.description || "이 취약점은 특정 조건에서 원격 공격자가 시스템에 접근할 수 있게 합니다. 영향을 받는 패키지를 최신 버전으로 업데이트하는 것이 권장됩니다."}
                        </p>
                    </div>

                    {/* Affected Package */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">영향 패키지</h3>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Package className="h-5 w-5 text-blue-600" />
                                <span className="font-mono font-medium text-slate-900 dark:text-white">{vuln.pkgName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500">설치된 버전</span>
                                    <p className="font-mono text-red-600 dark:text-red-400">{vuln.installedVersion}</p>
                                </div>
                                {vuln.fixedVersion && (
                                    <div>
                                        <span className="text-slate-500">수정된 버전</span>
                                        <p className="font-mono text-green-600 dark:text-green-400">{vuln.fixedVersion}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* History */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <History className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">수정 이력</h3>
                            </div>
                            {showHistory ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                        </button>
                        {showHistory && (
                            <div className="px-6 pb-6">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                    </div>
                                ) : historyData && historyData.length > 0 ? (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                                        <div className="space-y-4">
                                            {historyData.map((item) => (
                                                <div key={item.id} className="relative flex gap-4 pl-10">
                                                    <div className={`absolute left-2 w-4 h-4 bg-white dark:bg-slate-800 border-2 rounded-full ${item.type === 'status_change' ? 'border-blue-500' :
                                                            item.type === 'comment' ? 'border-green-500' : 'border-slate-400'
                                                        }`} />
                                                    <div className="flex-1 pb-4">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {item.action}
                                                            {item.from && item.to && (
                                                                <span className="font-normal text-slate-500"> ({item.from} → {item.to})</span>
                                                            )}
                                                        </p>
                                                        {item.content && (
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                                {item.content}
                                                            </p>
                                                        )}
                                                        {item.comment && (
                                                            <p className="text-sm text-slate-500 italic mt-1">
                                                                "{item.comment}"
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {item.user} • {formatHistoryDate(item.date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">이력이 없습니다.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">정보</h3>

                        <div>
                            <span className="text-xs text-slate-500">담당자</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-slate-900 dark:text-white">
                                    {vuln.assignee?.name || '미할당'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-slate-500">프로젝트</span>
                            <p className="text-slate-900 dark:text-white mt-1">
                                {vuln.scanResult?.project?.name || '-'}
                            </p>
                        </div>

                        <div>
                            <span className="text-xs text-slate-500">참조</span>
                            <div className="mt-1 space-y-1">
                                <a
                                    href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                    <LinkIcon className="h-3 w-3" />
                                    NVD
                                </a>
                                <a
                                    href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cveId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                    <LinkIcon className="h-3 w-3" />
                                    MITRE
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-3">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">작업</h3>
                        <button 
                            onClick={() => { setSelectedStatus(vuln.status); setShowStatusModal(true); }}
                            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            상태 변경
                        </button>
                        <button 
                            onClick={() => { setSelectedAssignee(vuln.assigneeId || null); setShowAssignModal(true); }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            담당자 할당
                        </button>
                        <button 
                            onClick={() => setShowExceptionModal(true)}
                            className="w-full px-4 py-2 text-sm border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <FileWarning className="h-4 w-4" />
                            예외 요청
                        </button>
                    </div>
                </div>
            </div>

            {/* Status Change Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowStatusModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">상태 변경</h3>
                            <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2 mb-6">
                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'FALSE_POSITIVE'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className={`w-full px-4 py-3 rounded-lg text-left text-sm transition-colors ${
                                        selectedStatus === status 
                                            ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500' 
                                            : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {status === 'OPEN' && '미해결 (OPEN)'}
                                    {status === 'IN_PROGRESS' && '진행 중 (IN_PROGRESS)'}
                                    {status === 'RESOLVED' && '해결됨 (RESOLVED)'}
                                    {status === 'WONT_FIX' && '수정 안함 (WONT_FIX)'}
                                    {status === 'FALSE_POSITIVE' && '오탐 (FALSE_POSITIVE)'}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    await updateStatus.mutateAsync({ id: vulnId, status: selectedStatus });
                                    setShowStatusModal(false);
                                }}
                                disabled={updateStatus.isPending || selectedStatus === vuln.status}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                변경
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign User Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">담당자 할당</h3>
                            <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                            <button
                                onClick={() => setSelectedAssignee(null)}
                                className={`w-full px-4 py-3 rounded-lg text-left text-sm transition-colors ${
                                    selectedAssignee === null 
                                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500' 
                                        : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className="text-slate-500">할당 해제</span>
                            </button>
                            {users?.data?.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedAssignee(user.id)}
                                    className={`w-full px-4 py-3 rounded-lg text-left text-sm transition-colors ${
                                        selectedAssignee === user.id 
                                            ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500' 
                                            : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    await assignVuln.mutateAsync({ id: vulnId, assigneeId: selectedAssignee });
                                    setShowAssignModal(false);
                                }}
                                disabled={assignVuln.isPending}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {assignVuln.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                할당
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exception Request Modal */}
            {showExceptionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowExceptionModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">예외 요청</h3>
                            <button onClick={() => setShowExceptionModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                                <strong>{vuln.cveId}</strong>에 대해 예외 처리를 요청합니다. 보안팀의 승인이 필요합니다.
                            </p>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">예외 사유</label>
                                <select 
                                    value={exceptionReason}
                                    onChange={(e) => setExceptionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                    <option value="false_positive">오탐 (False Positive)</option>
                                    <option value="accepted_risk">위험 수용 (Accepted Risk)</option>
                                    <option value="compensating_control">보상 조치 적용됨</option>
                                    <option value="not_applicable">해당 없음</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">상세 설명 *</label>
                                <textarea
                                    rows={3}
                                    value={exceptionDescription}
                                    onChange={(e) => setExceptionDescription(e.target.value)}
                                    placeholder="예외 요청에 대한 상세 설명을 입력하세요..."
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">만료일</label>
                                <input
                                    type="date"
                                    value={exceptionExpiry}
                                    onChange={(e) => setExceptionExpiry(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExceptionModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    if (!exceptionDescription.trim()) {
                                        alert('상세 설명을 입력해주세요.');
                                        return;
                                    }
                                    try {
                                        await createException.mutateAsync({
                                            cveId: vuln.cveId,
                                            scanVulnerabilityId: vulnId,
                                            reason: `[${exceptionReason}] ${exceptionDescription}`,
                                            expiresAt: exceptionExpiry || undefined,
                                            exceptionType: 'CVE',
                                        });
                                        alert('예외 요청이 제출되었습니다. 관리자 > 예외 승인 메뉴에서 확인할 수 있습니다.');
                                        setShowExceptionModal(false);
                                        setExceptionDescription('');
                                        setExceptionExpiry('');
                                    } catch (error) {
                                        alert('예외 요청 제출에 실패했습니다.');
                                    }
                                }}
                                disabled={createException.isPending || !exceptionDescription.trim()}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createException.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                요청 제출
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Result Panel - Action Guide */}
            <AiResultPanel
                isOpen={activePanel?.key === `vuln.actionGuide:${vulnId}`}
                onClose={closePanel}
                result={actionGuideResult}
                previousResults={actionGuidePrevious}
                loading={actionGuideLoading}
                loadingProgress={actionGuideProgress}
                onRegenerate={handleActionGuide}
                action="vuln.actionGuide"
            />

            {/* AI Result Panel - Impact Analysis */}
            <AiResultPanel
                isOpen={activePanel?.key === `vuln.impactAnalysis:${vulnId}`}
                onClose={closePanel}
                result={impactResult}
                previousResults={impactPrevious}
                loading={impactLoading}
                loadingProgress={impactProgress}
                onRegenerate={handleImpactAnalysis}
                action="vuln.impactAnalysis"
            />
        </div>
    );
}
