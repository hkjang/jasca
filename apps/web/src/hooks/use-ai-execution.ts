'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAiStore, generateAiContextKey } from '@/stores/ai-store';
import { AiActionType } from '@/components/ai/ai-button';
import { AiResult } from '@/components/ai/ai-result-panel';

// ============================================
// AI Context Interface
// ============================================
export interface AiContext {
    [key: string]: unknown;
}

// ============================================
// AI Execution Options
// ============================================
export interface AiExecutionOptions {
    /** Custom context key (default: action + entityId) */
    contextKey?: string;
    /** Entity ID for context key generation */
    entityId?: string;
    /** Show result panel on completion */
    showPanel?: boolean;
    /** Callback on success */
    onSuccess?: (result: AiResult) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}

// ============================================
// AI Execution Hook Return Type
// ============================================
export interface UseAiExecutionReturn {
    /** Execute AI action */
    execute: (context: AiContext) => Promise<AiResult | null>;
    /** Cancel ongoing execution */
    cancel: () => void;
    /** Current loading state */
    isLoading: boolean;
    /** Current progress (0-100) */
    progress: number;
    /** Latest result */
    result: AiResult | null;
    /** Previous results */
    previousResults: AiResult[];
    /** Estimated tokens for context */
    estimateTokens: (context: AiContext) => number;
    /** Open result panel */
    openPanel: () => void;
    /** Close result panel */
    closePanel: () => void;
    /** Is panel open */
    isPanelOpen: boolean;
    /** Error state */
    error: Error | null;
}

// ============================================
// Token Estimation Constants
// ============================================
const TOKENS_PER_CHAR = 0.25; // Rough estimate: 4 chars per token
const BASE_PROMPT_TOKENS: Record<AiActionType, number> = {
    'dashboard.summary': 500,
    'dashboard.riskAnalysis': 800,
    'project.analysis': 600,
    'scan.changeAnalysis': 700,
    'vuln.priorityReorder': 400,
    'vuln.actionGuide': 500,
    'vuln.impactAnalysis': 600,
    'policy.interpretation': 400,
    'policy.recommendation': 700,
    'workflow.fixVerification': 500,
    'report.generation': 1000,
    'notification.summary': 300,
    'guide.trivyCommand': 200,
    'admin.permissionRecommendation': 500,
    'admin.complianceMapping': 800,
};

// ============================================
// AI Execution Hook
// ============================================
export function useAiExecution(
    action: AiActionType,
    options: AiExecutionOptions = {}
): UseAiExecutionReturn {
    const {
        contextKey: customContextKey,
        entityId,
        showPanel = true,
        onSuccess,
        onError,
    } = options;

    const contextKey = customContextKey || generateAiContextKey(action, entityId);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Store access
    const {
        addResult,
        getLatestResult,
        getPreviousResults,
        setLoading,
        isLoading: checkLoading,
        setProgress,
        getProgress,
        registerAbortController,
        cancelExecution,
        openPanel: storeOpenPanel,
        closePanel: storeClosePanel,
        activePanel,
    } = useAiStore();

    const isLoading = checkLoading(contextKey);
    const progress = getProgress(contextKey);
    const result = getLatestResult(contextKey);
    const previousResults = getPreviousResults(contextKey);
    const isPanelOpen = activePanel?.key === contextKey;

    // Estimate tokens for context
    const estimateTokens = useCallback((context: AiContext): number => {
        const contextStr = JSON.stringify(context);
        const contextTokens = Math.ceil(contextStr.length * TOKENS_PER_CHAR);
        const baseTokens = BASE_PROMPT_TOKENS[action] || 500;
        return baseTokens + contextTokens;
    }, [action]);

    // Execute AI action
    const execute = useCallback(async (context: AiContext): Promise<AiResult | null> => {
        const token = useAuthStore.getState().accessToken;

        // Create abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;
        registerAbortController(contextKey, controller);

        setLoading(contextKey, true);
        setProgress(contextKey, 0);
        setError(null);

        try {
            // Simulate progress (in real implementation, use streaming)
            let currentProgress = 0;
            const progressInterval = setInterval(() => {
                currentProgress = Math.min(currentProgress + 10, 90);
                setProgress(contextKey, currentProgress);
            }, 500);

            const response = await fetch('/api/ai/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    action,
                    context,
                    estimatedTokens: estimateTokens(context),
                }),
                signal: controller.signal,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `AI 실행 실패: ${response.status}`);
            }

            const data = await response.json();

            const aiResult: AiResult = {
                id: data.id || crypto.randomUUID(),
                action,
                content: data.content || data.result || '',
                summary: data.summary,
                metadata: {
                    model: data.model,
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    durationMs: data.durationMs,
                },
                createdAt: new Date(),
            };

            setProgress(contextKey, 100);
            addResult(contextKey, aiResult);

            if (showPanel) {
                storeOpenPanel(contextKey, action);
            }

            onSuccess?.(aiResult);
            return aiResult;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Cancelled by user
                return null;
            }

            const error = err instanceof Error ? err : new Error('AI 실행 중 오류가 발생했습니다');
            setError(error);
            onError?.(error);
            return null;
        } finally {
            setLoading(contextKey, false);
            abortControllerRef.current = null;
        }
    }, [action, contextKey, estimateTokens, addResult, setLoading, setProgress, registerAbortController, storeOpenPanel, showPanel, onSuccess, onError]);

    // Cancel execution
    const cancel = useCallback(() => {
        cancelExecution(contextKey);
    }, [cancelExecution, contextKey]);

    // Panel controls
    const openPanel = useCallback(() => {
        storeOpenPanel(contextKey, action);
    }, [storeOpenPanel, contextKey, action]);

    const closePanel = useCallback(() => {
        storeClosePanel();
    }, [storeClosePanel]);

    return {
        execute,
        cancel,
        isLoading,
        progress,
        result,
        previousResults,
        estimateTokens,
        openPanel,
        closePanel,
        isPanelOpen,
        error,
    };
}

// ============================================
// Context Collectors for Different Screens
// ============================================

/** Collect dashboard context */
export function useDashboardAiContext() {
    return useCallback((overviewData: unknown, projectStats: unknown): AiContext => {
        return {
            screen: 'dashboard',
            overview: overviewData,
            projectStats,
            timestamp: new Date().toISOString(),
        };
    }, []);
}

/** Collect project context */
export function useProjectAiContext() {
    return useCallback((projectData: unknown, scanHistory: unknown): AiContext => {
        return {
            screen: 'project',
            project: projectData,
            scans: scanHistory,
            timestamp: new Date().toISOString(),
        };
    }, []);
}

/** Collect vulnerability context */
export function useVulnerabilityAiContext() {
    return useCallback((vulnerability: unknown, relatedScans?: unknown): AiContext => {
        return {
            screen: 'vulnerability',
            vulnerability,
            relatedScans,
            timestamp: new Date().toISOString(),
        };
    }, []);
}

/** Collect policy context */
export function usePolicyAiContext() {
    return useCallback((policy: unknown, violations?: unknown): AiContext => {
        return {
            screen: 'policy',
            policy,
            violations,
            timestamp: new Date().toISOString(),
        };
    }, []);
}

/** Collect notifications context */
export function useNotificationsAiContext() {
    return useCallback((notifications: unknown[]): AiContext => {
        return {
            screen: 'notifications',
            notifications,
            count: notifications.length,
            timestamp: new Date().toISOString(),
        };
    }, []);
}
