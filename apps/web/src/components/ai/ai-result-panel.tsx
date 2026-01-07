'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
    X,
    RefreshCw,
    Save,
    Sparkles,
    Clock,
    Coins,
    ChevronLeft,
    ChevronRight,
    Copy,
    Check,
    FileText,
    GitCompare,
    MessageSquare,
    AlertTriangle,
    Settings,
    History,
    Cpu,
    Zap,
} from 'lucide-react';
import { AiActionType, AI_ACTION_CONFIG } from './ai-button';

// ============================================
// AI Result Interface
// ============================================
export interface AiResult {
    id: string;
    action: AiActionType;
    content: string;
    summary?: string;
    metadata?: {
        model?: string;
        inputTokens?: number;
        outputTokens?: number;
        durationMs?: number;
    };
    usedPrompt?: string;
    createdAt: Date;
    /** Whether mock data was used instead of real AI */
    isMock?: boolean;
    /** Reason for using mock data (if applicable) */
    mockReason?: string;
}

// ============================================
// AI Result Panel Props
// ============================================
export interface AiResultPanelProps {
    isOpen: boolean;
    onClose: () => void;
    result: AiResult | null;
    previousResults?: AiResult[];
    loading?: boolean;
    loadingProgress?: number;
    onRegenerate?: () => void;
    onSaveSnapshot?: (result: AiResult) => void;
    action?: AiActionType;
}

// ============================================
// AI Result Panel Component
// ============================================
export function AiResultPanel({
    isOpen,
    onClose,
    result,
    previousResults = [],
    loading = false,
    loadingProgress,
    onRegenerate,
    onSaveSnapshot,
    action,
}: AiResultPanelProps) {
    const [showDiff, setShowDiff] = useState(false);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'result' | 'history' | 'info'>('result');

    // Reset state when panel opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowDiff(false);
            setCurrentResultIndex(0);
        }
    }, [isOpen]);

    const handleCopy = useCallback(async () => {
        if (result?.content) {
            await navigator.clipboard.writeText(result.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [result]);

    const handleSave = useCallback(() => {
        if (result && onSaveSnapshot) {
            onSaveSnapshot(result);
        }
    }, [result, onSaveSnapshot]);

    const allResults = result ? [result, ...previousResults] : previousResults;
    const displayedResult = allResults[currentResultIndex];

    const config = action ? AI_ACTION_CONFIG[action] : null;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">
                                {config?.label || 'AI 결과'}
                            </h2>
                            {displayedResult && (
                                <p className="text-xs text-slate-500">
                                    {new Date(displayedResult.createdAt).toLocaleString('ko-KR')}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="px-6 py-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-violet-200 dark:border-violet-800 rounded-full animate-pulse" />
                                <div
                                    className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-violet-600 rounded-full animate-spin"
                                />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-slate-900 dark:text-white">
                                    AI가 분석 중입니다...
                                </p>
                                {loadingProgress !== undefined && (
                                    <div className="mt-2 w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-300"
                                            style={{ width: `${loadingProgress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Result Content */}
                {!loading && displayedResult && (
                    <div className="flex flex-col h-[calc(100vh-5rem)]">
                        {/* Tab Navigation */}
                        <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={() => setActiveTab('result')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    activeTab === 'result'
                                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                결과
                            </button>
                            {allResults.length > 1 && (
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        activeTab === 'history'
                                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <History className="h-3.5 w-3.5" />
                                    기록 ({allResults.length})
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    activeTab === 'info'
                                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Cpu className="h-3.5 w-3.5" />
                                정보
                            </button>
                            
                            {/* Quick metadata badges */}
                            <div className="flex-1" />
                            {displayedResult.metadata && (
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    {displayedResult.metadata.model && !displayedResult.isMock && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                            <Zap className="h-3 w-3" />
                                            실제 AI
                                        </span>
                                    )}
                                    {displayedResult.metadata.durationMs && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {(displayedResult.metadata.durationMs / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Navigation (if multiple results) */}
                        {allResults.length > 1 && (
                            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setCurrentResultIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentResultIndex === 0}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-slate-500">
                                    {currentResultIndex + 1} / {allResults.length}
                                </span>
                                <button
                                    onClick={() => setCurrentResultIndex(prev => Math.min(allResults.length - 1, prev + 1))}
                                    disabled={currentResultIndex === allResults.length - 1}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {/* Result Tab */}
                            {activeTab === 'result' && (
                                <>
                                    {/* Mock Data Warning Banner */}
                                    {displayedResult.isMock && (
                                        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold text-amber-800 dark:text-amber-300">
                                                            Mock 데이터 사용 중
                                                        </p>
                                                        {onRegenerate && (
                                                            <button
                                                                onClick={onRegenerate}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors font-medium"
                                                            >
                                                                <RefreshCw className="h-3.5 w-3.5" />
                                                                재시도
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1.5">
                                                        {displayedResult.mockReason || '실제 AI 응답 대신 샘플 데이터가 표시되고 있습니다.'}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                                        <a
                                                            href="/admin/ai-settings"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-medium"
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                            AI 설정
                                                        </a>
                                                        <a
                                                            href="/admin/ai-prompts"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            프롬프트 관리
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {showDiff && previousResults.length > 0 ? (
                                        <AiDiffView
                                            current={displayedResult}
                                            previous={previousResults[0]}
                                        />
                                    ) : (
                                        <div className="prose dark:prose-invert prose-sm max-w-none">
                                            {displayedResult.summary && (
                                                <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                                                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300 m-0">
                                                        {displayedResult.summary}
                                                    </p>
                                                </div>
                                            )}
                                            <MarkdownContent content={displayedResult.content} />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* History Tab */}
                            {activeTab === 'history' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-500 mb-4">
                                        이번 세션에서 실행된 AI 결과 기록입니다.
                                    </p>
                                    {allResults.map((r, index) => (
                                        <button
                                            key={r.id}
                                            onClick={() => {
                                                setCurrentResultIndex(index);
                                                setActiveTab('result');
                                            }}
                                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                                index === currentResultIndex
                                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                    실행 #{allResults.length - index}
                                                    {index === 0 && (
                                                        <span className="ml-2 px-2 py-0.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full">
                                                            최신
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(r.createdAt).toLocaleTimeString('ko-KR')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                                {r.summary || r.content.substring(0, 100)}...
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                {r.metadata?.model && (
                                                    <span className="flex items-center gap-1">
                                                        <Cpu className="h-3 w-3" />
                                                        {r.metadata.model}
                                                    </span>
                                                )}
                                                {r.isMock && (
                                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Mock
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Info Tab */}
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Cpu className="h-4 w-4 text-violet-500" />
                                        실행 정보
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">모델</p>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {displayedResult.metadata?.model || '알 수 없음'}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">입력 토큰</p>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {displayedResult.metadata?.inputTokens?.toLocaleString() || '-'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">출력 토큰</p>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {displayedResult.metadata?.outputTokens?.toLocaleString() || '-'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">실행 시간</p>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {displayedResult.metadata?.durationMs
                                                    ? `${(displayedResult.metadata.durationMs / 1000).toFixed(2)}초`
                                                    : '-'}
                                            </p>
                                        </div>
                                        
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">상태</p>
                                            <div className="flex items-center gap-2">
                                                {displayedResult.isMock ? (
                                                    <>
                                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                                        <span className="font-medium text-amber-600 dark:text-amber-400">Mock 데이터</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                                                        <span className="font-medium text-green-600 dark:text-green-400">실제 AI 응답</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {displayedResult.isMock && displayedResult.mockReason && (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Mock 사유</p>
                                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                                    {displayedResult.mockReason}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">액션</p>
                                            <code className="text-sm font-mono text-violet-600 dark:text-violet-400">
                                                {displayedResult.action}
                                            </code>
                                        </div>
                                        
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">실행 시간</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {new Date(displayedResult.createdAt).toLocaleString('ko-KR')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Quick Actions */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">빠른 작업</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <a
                                                href="/admin/ai-settings"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <Settings className="h-4 w-4" />
                                                AI 설정
                                            </a>
                                            <a
                                                href="/admin/ai-prompts"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <FileText className="h-4 w-4" />
                                                프롬프트 관리
                                            </a>
                                            <a
                                                href="/admin/ai-history"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <History className="h-4 w-4" />
                                                실행 기록
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                {previousResults.length > 0 && (
                                    <button
                                        onClick={() => setShowDiff(!showDiff)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${showDiff
                                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <GitCompare className="h-4 w-4" />
                                        비교
                                    </button>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-500" />
                                            복사됨
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            복사
                                        </>
                                    )}
                                </button>
                                {displayedResult.usedPrompt && (
                                    <button
                                        onClick={() => setShowPromptModal(true)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        프롬프트
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {onSaveSnapshot && (
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <Save className="h-4 w-4" />
                                        저장
                                    </button>
                                )}
                                {onRegenerate && (
                                    <button
                                        onClick={onRegenerate}
                                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        재생성
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !displayedResult && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Sparkles className="h-12 w-12 mb-4" />
                        <p>결과가 없습니다</p>
                    </div>
                )}
            </div>

            {/* Prompt Modal */}
            {showPromptModal && displayedResult?.usedPrompt && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-[60]"
                        onClick={() => setShowPromptModal(false)}
                    />
                    <div className="fixed inset-4 md:inset-10 lg:inset-20 bg-white dark:bg-slate-900 rounded-xl shadow-2xl z-[70] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg">
                                    <MessageSquare className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-900 dark:text-white">
                                        사용된 프롬프트
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {config?.label || displayedResult.action}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPromptModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                                {displayedResult.usedPrompt}
                            </pre>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowPromptModal(false)}
                                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

// ============================================
// AI Diff View Component
// ============================================
interface AiDiffViewProps {
    current: AiResult;
    previous: AiResult;
}

function AiDiffView({ current, previous }: AiDiffViewProps) {
    const currentLines = current.content.split('\n');
    const previousLines = previous.content.split('\n');

    // Simple line-by-line diff
    const maxLines = Math.max(currentLines.length, previousLines.length);
    const diffLines: { type: 'added' | 'removed' | 'unchanged'; line: string }[] = [];

    for (let i = 0; i < maxLines; i++) {
        const prevLine = previousLines[i] || '';
        const currLine = currentLines[i] || '';

        if (prevLine === currLine) {
            diffLines.push({ type: 'unchanged', line: currLine });
        } else if (!prevLine && currLine) {
            diffLines.push({ type: 'added', line: currLine });
        } else if (prevLine && !currLine) {
            diffLines.push({ type: 'removed', line: prevLine });
        } else {
            diffLines.push({ type: 'removed', line: prevLine });
            diffLines.push({ type: 'added', line: currLine });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-100 dark:bg-red-900/30 rounded" />
                    이전 결과 ({new Date(previous.createdAt).toLocaleString('ko-KR')})
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded" />
                    현재 결과
                </span>
            </div>
            <div className="font-mono text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                {diffLines.map((diff, index) => (
                    <div
                        key={index}
                        className={`px-4 py-1 ${diff.type === 'added'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : diff.type === 'removed'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                    >
                        <span className="select-none mr-2">
                            {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : ' '}
                        </span>
                        {diff.line || ' '}
                    </div>
                ))}
            </div>
        </div>
    );
}

export { AiDiffView };

// ============================================
// Markdown Content Renderer
// ============================================
interface MarkdownContentProps {
    content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
    // Parse markdown content into React elements
    const renderMarkdown = (text: string): React.ReactNode[] => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        let codeBlockLang = '';
        let listItems: string[] = [];
        let isOrderedList = false;

        const flushList = () => {
            if (listItems.length > 0) {
                const ListTag = isOrderedList ? 'ol' : 'ul';
                elements.push(
                    <ListTag key={`list-${elements.length}`} className={isOrderedList ? 'list-decimal pl-6 my-2' : 'list-disc pl-6 my-2'}>
                        {listItems.map((item, i) => (
                            <li key={i} className="my-1">{renderInline(item)}</li>
                        ))}
                    </ListTag>
                );
                listItems = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Code block handling
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    flushList();
                    inCodeBlock = true;
                    codeBlockLang = line.slice(3).trim();
                    codeBlockContent = [];
                } else {
                    elements.push(
                        <pre key={`code-${i}`} className="bg-slate-800 dark:bg-slate-900 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm">
                            <code className={codeBlockLang ? `language-${codeBlockLang}` : ''}>
                                {codeBlockContent.join('\n')}
                            </code>
                        </pre>
                    );
                    inCodeBlock = false;
                    codeBlockContent = [];
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Headers
            if (line.startsWith('### ')) {
                flushList();
                elements.push(<h3 key={`h3-${i}`} className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">{renderInline(line.slice(4))}</h3>);
                continue;
            }
            if (line.startsWith('## ')) {
                flushList();
                elements.push(<h2 key={`h2-${i}`} className="text-xl font-bold text-slate-900 dark:text-white mt-5 mb-3">{renderInline(line.slice(3))}</h2>);
                continue;
            }
            if (line.startsWith('# ')) {
                flushList();
                elements.push(<h1 key={`h1-${i}`} className="text-2xl font-bold text-slate-900 dark:text-white mt-6 mb-4">{renderInline(line.slice(2))}</h1>);
                continue;
            }

            // Ordered list
            const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
            if (orderedMatch) {
                if (!isOrderedList && listItems.length > 0) flushList();
                isOrderedList = true;
                listItems.push(orderedMatch[1]);
                continue;
            }

            // Unordered list
            if (line.startsWith('- ') || line.startsWith('* ')) {
                if (isOrderedList && listItems.length > 0) flushList();
                isOrderedList = false;
                listItems.push(line.slice(2));
                continue;
            }

            // Horizontal rule
            if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
                flushList();
                elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200 dark:border-slate-700" />);
                continue;
            }

            // Table handling - check if this line looks like a table row
            if (line.includes('|') && line.trim().startsWith('|')) {
                flushList();
                // Collect all table rows
                const tableRows: string[] = [line];
                let j = i + 1;
                while (j < lines.length && lines[j].includes('|') && lines[j].trim().startsWith('|')) {
                    tableRows.push(lines[j]);
                    j++;
                }

                if (tableRows.length >= 2) {
                    // Parse table
                    const parseRow = (row: string): string[] => {
                        return row.split('|').slice(1, -1).map(cell => cell.trim());
                    };

                    const headerRow = parseRow(tableRows[0]);
                    // Skip separator row (contains ---)
                    const dataRows = tableRows.slice(2).map(parseRow);

                    elements.push(
                        <div key={`table-${i}`} className="my-4 overflow-x-auto">
                            <table className="min-w-full border-collapse border border-slate-200 dark:border-slate-700 text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        {headerRow.map((cell, cellIdx) => (
                                            <th key={cellIdx} className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-left font-semibold text-slate-900 dark:text-white">
                                                {renderInline(cell)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataRows.map((row, rowIdx) => (
                                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}>
                                            {row.map((cell, cellIdx) => (
                                                <td key={cellIdx} className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-300">
                                                    {renderInline(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                    // Skip processed rows
                    i = j - 1;
                    continue;
                }
            }

            // Regular paragraph
            flushList();
            if (line.trim()) {
                elements.push(<p key={`p-${i}`} className="my-2 text-slate-700 dark:text-slate-300">{renderInline(line)}</p>);
            } else if (elements.length > 0) {
                // Empty line - add spacing
                elements.push(<div key={`br-${i}`} className="h-2" />);
            }
        }

        flushList();

        // Close unclosed code block
        if (inCodeBlock && codeBlockContent.length > 0) {
            elements.push(
                <pre key="code-final" className="bg-slate-800 dark:bg-slate-900 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-sm">
                    <code>{codeBlockContent.join('\n')}</code>
                </pre>
            );
        }

        return elements;
    };

    // Render inline markdown (bold, italic, code, links)
    const renderInline = (text: string): React.ReactNode => {
        const parts: React.ReactNode[] = [];
        let remaining = text;
        let key = 0;

        while (remaining.length > 0) {
            // Bold **text**
            const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
            if (boldMatch) {
                parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
                remaining = remaining.slice(boldMatch[0].length);
                continue;
            }

            // Italic *text*
            const italicMatch = remaining.match(/^\*(.+?)\*/);
            if (italicMatch) {
                parts.push(<em key={key++}>{italicMatch[1]}</em>);
                remaining = remaining.slice(italicMatch[0].length);
                continue;
            }

            // Inline code `code`
            const codeMatch = remaining.match(/^`([^`]+)`/);
            if (codeMatch) {
                parts.push(<code key={key++} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-violet-600 dark:text-violet-400">{codeMatch[1]}</code>);
                remaining = remaining.slice(codeMatch[0].length);
                continue;
            }

            // Link [text](url)
            const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                parts.push(<a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">{linkMatch[1]}</a>);
                remaining = remaining.slice(linkMatch[0].length);
                continue;
            }

            // Regular character
            const nextSpecial = remaining.search(/[\*`\[]/);
            if (nextSpecial === -1) {
                parts.push(remaining);
                break;
            } else if (nextSpecial === 0) {
                parts.push(remaining[0]);
                remaining = remaining.slice(1);
            } else {
                parts.push(remaining.slice(0, nextSpecial));
                remaining = remaining.slice(nextSpecial);
            }
        }

        return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    return <div className="markdown-content">{renderMarkdown(content)}</div>;
}

export { MarkdownContent };
