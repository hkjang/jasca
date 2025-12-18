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
    createdAt: Date;
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
                        {/* Metadata Bar */}
                        {displayedResult.metadata && (
                            <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
                                {displayedResult.metadata.model && (
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {displayedResult.metadata.model}
                                    </span>
                                )}
                                {displayedResult.metadata.inputTokens && displayedResult.metadata.outputTokens && (
                                    <span className="flex items-center gap-1">
                                        <Coins className="h-3 w-3" />
                                        {displayedResult.metadata.inputTokens + displayedResult.metadata.outputTokens} tokens
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
                                    <div className="whitespace-pre-wrap">
                                        {displayedResult.content}
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
