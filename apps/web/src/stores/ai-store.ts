'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AiResult } from '@/components/ai/ai-result-panel';
import { AiActionType } from '@/components/ai/ai-button';

// ============================================
// AI Store State
// ============================================
interface AiState {
    // Results history per context key
    results: Record<string, AiResult[]>;

    // Active panel state
    activePanel: {
        key: string;
        action: AiActionType;
    } | null;

    // Loading state per context key
    loadingStates: Record<string, boolean>;

    // Execution progress per context key
    progressStates: Record<string, number>;

    // Abort controllers for cancellation
    abortControllers: Record<string, AbortController>;
}

// ============================================
// AI Store Actions
// ============================================
interface AiActions {
    // Result management
    addResult: (key: string, result: AiResult) => void;
    getHistory: (key: string) => AiResult[];
    clearHistory: (key: string) => void;

    // Panel management
    openPanel: (key: string, action: AiActionType) => void;
    closePanel: () => void;

    // Loading state
    setLoading: (key: string, loading: boolean) => void;
    isLoading: (key: string) => boolean;

    // Progress state
    setProgress: (key: string, progress: number) => void;
    getProgress: (key: string) => number;

    // Execution control
    registerAbortController: (key: string, controller: AbortController) => void;
    cancelExecution: (key: string) => void;

    // Get latest result
    getLatestResult: (key: string) => AiResult | null;

    // Get previous results (excluding latest)
    getPreviousResults: (key: string) => AiResult[];
}

// ============================================
// Maximum results to keep per context
// ============================================
const MAX_RESULTS_PER_CONTEXT = 10;

// ============================================
// AI Store
// ============================================
export const useAiStore = create<AiState & AiActions>()(
    persist(
        (set, get) => ({
            // Initial state
            results: {},
            activePanel: null,
            loadingStates: {},
            progressStates: {},
            abortControllers: {},

            // Add result to history
            addResult: (key, result) => {
                set((state) => {
                    const existing = state.results[key] || [];
                    const updated = [result, ...existing].slice(0, MAX_RESULTS_PER_CONTEXT);
                    return {
                        results: {
                            ...state.results,
                            [key]: updated,
                        },
                    };
                });
            },

            // Get history for a key
            getHistory: (key) => {
                return get().results[key] || [];
            },

            // Clear history for a key
            clearHistory: (key) => {
                set((state) => {
                    const { [key]: _, ...rest } = state.results;
                    return { results: rest };
                });
            },

            // Open result panel
            openPanel: (key, action) => {
                set({ activePanel: { key, action } });
            },

            // Close result panel
            closePanel: () => {
                set({ activePanel: null });
            },

            // Set loading state
            setLoading: (key, loading) => {
                set((state) => ({
                    loadingStates: {
                        ...state.loadingStates,
                        [key]: loading,
                    },
                }));
            },

            // Check if loading
            isLoading: (key) => {
                return get().loadingStates[key] || false;
            },

            // Set progress
            setProgress: (key, progress) => {
                set((state) => ({
                    progressStates: {
                        ...state.progressStates,
                        [key]: progress,
                    },
                }));
            },

            // Get progress
            getProgress: (key) => {
                return get().progressStates[key] || 0;
            },

            // Register abort controller
            registerAbortController: (key, controller) => {
                set((state) => ({
                    abortControllers: {
                        ...state.abortControllers,
                        [key]: controller,
                    },
                }));
            },

            // Cancel execution
            cancelExecution: (key) => {
                const controller = get().abortControllers[key];
                if (controller) {
                    controller.abort();
                    set((state) => {
                        const { [key]: _, ...rest } = state.abortControllers;
                        return {
                            abortControllers: rest,
                            loadingStates: {
                                ...state.loadingStates,
                                [key]: false,
                            },
                            progressStates: {
                                ...state.progressStates,
                                [key]: 0,
                            },
                        };
                    });
                }
            },

            // Get latest result
            getLatestResult: (key) => {
                const history = get().results[key];
                return history?.[0] || null;
            },

            // Get previous results
            getPreviousResults: (key) => {
                const history = get().results[key] || [];
                return history.slice(1);
            },
        }),
        {
            name: 'ai-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist results, not loading states or controllers
                results: state.results,
            }),
        }
    )
);

// ============================================
// Helper to generate context key
// ============================================
export function generateAiContextKey(action: AiActionType, entityId?: string): string {
    if (entityId) {
        return `${action}:${entityId}`;
    }
    return action;
}
