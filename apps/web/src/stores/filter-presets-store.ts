import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================
export interface FilterPreset {
    id: string;
    name: string;
    filters: FilterState;
    createdAt: number;
}

export interface FilterState {
    severity?: string[];
    status?: string[];
    project?: string;
    package?: string;
    search?: string;
    dateRange?: {
        from?: string;
        to?: string;
    };
}

interface FilterPresetsState {
    presets: FilterPreset[];
    activePresetId: string | null;
    currentFilters: FilterState;

    // Actions
    setCurrentFilters: (filters: FilterState) => void;
    clearFilters: () => void;
    savePreset: (name: string) => void;
    deletePreset: (id: string) => void;
    applyPreset: (id: string) => void;
    renamePreset: (id: string, name: string) => void;
}

// ============================================
// Store
// ============================================
export const useFilterPresetsStore = create<FilterPresetsState>()(
    persist(
        (set, get) => ({
            presets: [],
            activePresetId: null,
            currentFilters: {},

            setCurrentFilters: (filters) => {
                set({ currentFilters: filters, activePresetId: null });
            },

            clearFilters: () => {
                set({ currentFilters: {}, activePresetId: null });
            },

            savePreset: (name) => {
                const { currentFilters, presets } = get();
                const newPreset: FilterPreset = {
                    id: crypto.randomUUID(),
                    name,
                    filters: { ...currentFilters },
                    createdAt: Date.now(),
                };
                set({ presets: [...presets, newPreset] });
            },

            deletePreset: (id) => {
                const { presets, activePresetId } = get();
                set({
                    presets: presets.filter((p) => p.id !== id),
                    activePresetId: activePresetId === id ? null : activePresetId,
                });
            },

            applyPreset: (id) => {
                const { presets } = get();
                const preset = presets.find((p) => p.id === id);
                if (preset) {
                    set({
                        currentFilters: { ...preset.filters },
                        activePresetId: id,
                    });
                }
            },

            renamePreset: (id, name) => {
                const { presets } = get();
                set({
                    presets: presets.map((p) =>
                        p.id === id ? { ...p, name } : p
                    ),
                });
            },
        }),
        {
            name: 'jasca-filter-presets',
            partialize: (state) => ({
                presets: state.presets,
            }),
        }
    )
);

// ============================================
// URL Filter Sync Hook
// ============================================
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export function useFilterSync() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { currentFilters, setCurrentFilters } = useFilterPresetsStore();

    // Parse URL params to filters on mount
    useEffect(() => {
        const filters: FilterState = {};

        const severity = searchParams.get('severity');
        if (severity) filters.severity = severity.split(',');

        const status = searchParams.get('status');
        if (status) filters.status = status.split(',');

        const project = searchParams.get('project');
        if (project) filters.project = project;

        const pkg = searchParams.get('package');
        if (pkg) filters.package = pkg;

        const search = searchParams.get('search');
        if (search) filters.search = search;

        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from || to) filters.dateRange = { from: from || undefined, to: to || undefined };

        if (Object.keys(filters).length > 0) {
            setCurrentFilters(filters);
        }
    }, []);

    // Update URL when filters change
    const syncToUrl = useCallback((filters: FilterState) => {
        const params = new URLSearchParams();

        if (filters.severity?.length) params.set('severity', filters.severity.join(','));
        if (filters.status?.length) params.set('status', filters.status.join(','));
        if (filters.project) params.set('project', filters.project);
        if (filters.package) params.set('package', filters.package);
        if (filters.search) params.set('search', filters.search);
        if (filters.dateRange?.from) params.set('from', filters.dateRange.from);
        if (filters.dateRange?.to) params.set('to', filters.dateRange.to);

        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    const updateFilters = useCallback((filters: FilterState) => {
        setCurrentFilters(filters);
        syncToUrl(filters);
    }, [setCurrentFilters, syncToUrl]);

    return {
        filters: currentFilters,
        updateFilters,
    };
}

// ============================================
// Helper: Build API Query from Filters
// ============================================
export function buildQueryFromFilters(filters: FilterState): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.severity?.length) query.severity = filters.severity.join(',');
    if (filters.status?.length) query.status = filters.status.join(',');
    if (filters.project) query.projectId = filters.project;
    if (filters.package) query.package = filters.package;
    if (filters.search) query.search = filters.search;
    if (filters.dateRange?.from) query.from = filters.dateRange.from;
    if (filters.dateRange?.to) query.to = filters.dateRange.to;

    return query;
}
