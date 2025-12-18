'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useVulnerability } from '@/lib/api-hooks';
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

// Mock AI remediation guide
const mockAiGuide = {
    summary: "이 취약점은 인증되지 않은 원격 공격자가 임의의 코드를 실행할 수 있게 합니다. 패키지를 최신 버전으로 업데이트하는 것이 권장됩니다.",
    steps: [
        "package.json에서 해당 패키지 버전을 확인합니다.",
        "pnpm update lodash 또는 npm update lodash를 실행합니다.",
        "pnpm audit 또는 npm audit으로 취약점이 해결되었는지 확인합니다.",
        "변경사항을 테스트하고 배포합니다."
    ],
    confidence: 0.92,
    model: "GPT-4",
};

// Mock history data
const mockHistory = [
    { id: '1', action: '상태 변경', from: 'OPEN', to: 'IN_PROGRESS', user: '김보안', date: '2024-12-16 14:30' },
    { id: '2', action: '담당자 할당', user: '관리자', assignee: '김보안', date: '2024-12-16 10:00' },
    { id: '3', action: '취약점 발견', user: '시스템', date: '2024-12-15 09:22' },
];

export default function VulnerabilityDetailPage() {
    const params = useParams();
    const vulnId = params.id as string;

    const { data: vuln, isLoading, error, refetch } = useVulnerability(vulnId);
    const [showAiGuide, setShowAiGuide] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

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
                    </div>
                    {vuln.title && (
                        <p className="text-slate-500 mt-1">{vuln.title}</p>
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

                    {/* AI Remediation Guide */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            onClick={() => setShowAiGuide(!showAiGuide)}
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI 조치 가이드</h3>
                                    <p className="text-sm text-slate-500">모델: {mockAiGuide.model} | 신뢰도: {Math.round(mockAiGuide.confidence * 100)}%</p>
                                </div>
                            </div>
                            {showAiGuide ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                        </button>
                        {showAiGuide && (
                            <div className="px-6 pb-6 space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-slate-700 dark:text-slate-300">{mockAiGuide.summary}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">수정 단계</h4>
                                    <ol className="space-y-3">
                                        {mockAiGuide.steps.map((step, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-slate-600 dark:text-slate-400">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        )}
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
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                                    <div className="space-y-4">
                                        {mockHistory.map((item) => (
                                            <div key={item.id} className="relative flex gap-4 pl-10">
                                                <div className="absolute left-2 w-4 h-4 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-full" />
                                                <div className="flex-1 pb-4">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {item.action}
                                                        {item.from && item.to && (
                                                            <span className="font-normal text-slate-500"> ({item.from} → {item.to})</span>
                                                        )}
                                                        {item.assignee && (
                                                            <span className="font-normal text-slate-500"> → {item.assignee}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {item.user} • {item.date}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
                        <button className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            상태 변경
                        </button>
                        <button className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            담당자 할당
                        </button>
                        <button className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            예외 요청
                        </button>
                    </div>
                </div>
            </div>

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
