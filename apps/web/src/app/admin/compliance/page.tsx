'use client';

import {
    Scale,
    CheckCircle,
    AlertTriangle,
    XCircle,
    ExternalLink,
    FileText,
    Loader2,
} from 'lucide-react';
import { useComplianceReport, useViolationHistory } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

function getStatusBadge(status: string) {
    const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
        PASS: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '통과' },
        WARNING: { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: '주의' },
        FAIL: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: '실패' },
        NOT_APPLICABLE: { icon: <Scale className="h-4 w-4" />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400', label: '해당 없음' },
    };
    const { icon, color, label } = config[status] || config.WARNING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
            {icon}
            {label}
        </span>
    );
}

export default function CompliancePage() {
    const { data: report, isLoading, error, refetch } = useComplianceReport('GENERAL');
    const { data: violations } = useViolationHistory(30);

    // AI Execution for compliance mapping
    const {
        execute: executeComplianceMapping,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('admin.complianceMapping');

    const { activePanel, closePanel } = useAiStore();

    const handleAiMapping = () => {
        const context = {
            screen: 'compliance',
            report,
            violations,
            timestamp: new Date().toISOString(),
        };
        executeComplianceMapping(context);
    };

    const handleAiRegenerate = () => {
        handleAiMapping();
    };

    const estimatedTokens = estimateTokens({ report, violations });

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
                <p className="text-red-600 dark:text-red-300">컴플라이언스 데이터를 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    const complianceScore = report?.summary?.complianceScore || 0;
    const sections = report?.sections || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">컴플라이언스</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        규제 프레임워크 준수 현황을 확인합니다
                    </p>
                </div>
                <AiButton
                    action="admin.complianceMapping"
                    variant="primary"
                    size="md"
                    estimatedTokens={estimatedTokens}
                    loading={aiLoading}
                    onExecute={handleAiMapping}
                    onCancel={cancelAi}
                />
            </div>

            {/* Overall Score */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm">전체 컴플라이언스 점수</p>
                        <p className="text-5xl font-bold mt-2">{complianceScore}%</p>
                        <div className="flex gap-4 mt-3 text-sm text-blue-100">
                            <span>취약점: {report?.summary?.totalVulnerabilities || 0}개</span>
                            <span>Critical 미해결: {report?.summary?.criticalUnresolved || 0}개</span>
                            <span>High 미해결: {report?.summary?.highUnresolved || 0}개</span>
                        </div>
                    </div>
                    <div className="w-32 h-32 relative">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="12"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                fill="none"
                                stroke="white"
                                strokeWidth="12"
                                strokeDasharray={`${complianceScore * 3.52} 352`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <Scale className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10" />
                    </div>
                </div>
            </div>

            {/* Violation Summary */}
            {violations && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">정책 위반 현황 (30일)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{violations.total}</p>
                            <p className="text-sm text-slate-500">총 위반</p>
                        </div>
                        {Object.entries(violations.bySeverity || {}).map(([severity, count]) => (
                            <div key={severity} className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <p className={`text-3xl font-bold ${severity === 'CRITICAL' ? 'text-red-600' :
                                    severity === 'HIGH' ? 'text-orange-500' :
                                        severity === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                                    }`}>
                                    {count}
                                </p>
                                <p className="text-sm text-slate-500">{severity}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Compliance Sections */}
            {sections.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map((section, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="font-semibold text-slate-900 dark:text-white">{section.title}</h3>
                                {getStatusBadge(section.status)}
                            </div>

                            {section.findings.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">발견 사항</p>
                                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                        {section.findings.map((finding, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                {finding}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {section.recommendations.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">권장 사항</p>
                                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                        {section.recommendations.map((rec, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-blue-500">→</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Export */}
            <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <FileText className="h-4 w-4" />
                    컴플라이언스 리포트 다운로드
                </button>
            </div>

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'admin.complianceMapping'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="admin.complianceMapping"
            />
        </div>
    );
}
