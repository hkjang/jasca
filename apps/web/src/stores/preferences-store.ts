'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// Preferences Types
// ============================================

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'relative';
export type TimeFormat = '12h' | '24h';
export type ChartView = 'severity' | 'status';
export type TrendPeriod = 7 | 14 | 30;

export interface DashboardWidgetVisibility {
    riskScore: boolean;
    statsCards: boolean;
    summaryStats: boolean;
    distributionChart: boolean;
    trendChart: boolean;
    projectsChart: boolean;
    criticalList: boolean;
    quickLinks: boolean;
}

export interface DefaultFilters {
    severity: string[];
    status: string[];
    projectId?: string;
}

export interface QuickActionFavorite {
    id: string;
    label: string;
    href: string;
    usageCount: number;
    lastUsed: string;
}

export interface ActivityRecord {
    type: 'scan' | 'vulnerability_view' | 'project_view' | 'report';
    entityId: string;
    entityName: string;
    timestamp: string;
}

// ============================================
// Preferences State
// ============================================

interface PreferencesState {
    // Dashboard preferences
    dashboard: {
        chartView: ChartView;
        trendPeriod: TrendPeriod;
        widgetVisibility: DashboardWidgetVisibility;
        autoRefresh: boolean;
        autoRefreshInterval: number; // seconds
    };

    // Display preferences
    display: {
        dateFormat: DateFormat;
        timeFormat: TimeFormat;
        itemsPerPage: number;
        reducedMotion: boolean;
        compactMode: boolean;
    };

    // Default filter preferences
    defaultFilters: DefaultFilters;

    // Quick actions
    quickActionFavorites: QuickActionFavorite[];

    // Activity history (limited to recent 50)
    recentActivity: ActivityRecord[];
}

// ============================================
// Preferences Actions
// ============================================

interface PreferencesActions {
    // Dashboard
    setChartView: (view: ChartView) => void;
    setTrendPeriod: (period: TrendPeriod) => void;
    setWidgetVisibility: (widget: keyof DashboardWidgetVisibility, visible: boolean) => void;
    toggleWidgetVisibility: (widget: keyof DashboardWidgetVisibility) => void;
    setAutoRefresh: (enabled: boolean) => void;
    setAutoRefreshInterval: (interval: number) => void;
    resetDashboardDefaults: () => void;

    // Display
    setDateFormat: (format: DateFormat) => void;
    setTimeFormat: (format: TimeFormat) => void;
    setItemsPerPage: (count: number) => void;
    setReducedMotion: (enabled: boolean) => void;
    setCompactMode: (enabled: boolean) => void;

    // Filters
    setDefaultFilters: (filters: Partial<DefaultFilters>) => void;
    resetDefaultFilters: () => void;

    // Quick actions
    addQuickActionFavorite: (action: Omit<QuickActionFavorite, 'usageCount' | 'lastUsed'>) => void;
    removeQuickActionFavorite: (id: string) => void;
    recordQuickActionUsage: (id: string) => void;
    getTopQuickActions: (limit?: number) => QuickActionFavorite[];

    // Activity
    recordActivity: (activity: Omit<ActivityRecord, 'timestamp'>) => void;
    getRecentActivity: (limit?: number) => ActivityRecord[];
    clearActivityHistory: () => void;

    // Reset all
    resetAllPreferences: () => void;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_WIDGET_VISIBILITY: DashboardWidgetVisibility = {
    riskScore: true,
    statsCards: true,
    summaryStats: true,
    distributionChart: true,
    trendChart: true,
    projectsChart: true,
    criticalList: true,
    quickLinks: true,
};

const DEFAULT_PREFERENCES: PreferencesState = {
    dashboard: {
        chartView: 'severity',
        trendPeriod: 7,
        widgetVisibility: DEFAULT_WIDGET_VISIBILITY,
        autoRefresh: false,
        autoRefreshInterval: 60,
    },
    display: {
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        itemsPerPage: 20,
        reducedMotion: false,
        compactMode: false,
    },
    defaultFilters: {
        severity: [],
        status: [],
    },
    quickActionFavorites: [],
    recentActivity: [],
};

const MAX_ACTIVITY_RECORDS = 50;
const MAX_QUICK_ACTION_FAVORITES = 10;

// ============================================
// Preferences Store
// ============================================

export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
    persist(
        (set, get) => ({
            // Initial state
            ...DEFAULT_PREFERENCES,

            // Dashboard actions
            setChartView: (view) => {
                set((state) => ({
                    dashboard: { ...state.dashboard, chartView: view },
                }));
            },

            setTrendPeriod: (period) => {
                set((state) => ({
                    dashboard: { ...state.dashboard, trendPeriod: period },
                }));
            },

            setWidgetVisibility: (widget, visible) => {
                set((state) => ({
                    dashboard: {
                        ...state.dashboard,
                        widgetVisibility: {
                            ...state.dashboard.widgetVisibility,
                            [widget]: visible,
                        },
                    },
                }));
            },

            toggleWidgetVisibility: (widget) => {
                set((state) => ({
                    dashboard: {
                        ...state.dashboard,
                        widgetVisibility: {
                            ...state.dashboard.widgetVisibility,
                            [widget]: !state.dashboard.widgetVisibility[widget],
                        },
                    },
                }));
            },

            setAutoRefresh: (enabled) => {
                set((state) => ({
                    dashboard: { ...state.dashboard, autoRefresh: enabled },
                }));
            },

            setAutoRefreshInterval: (interval) => {
                set((state) => ({
                    dashboard: { ...state.dashboard, autoRefreshInterval: interval },
                }));
            },

            resetDashboardDefaults: () => {
                set((state) => ({
                    dashboard: { ...DEFAULT_PREFERENCES.dashboard },
                }));
            },

            // Display actions
            setDateFormat: (format) => {
                set((state) => ({
                    display: { ...state.display, dateFormat: format },
                }));
            },

            setTimeFormat: (format) => {
                set((state) => ({
                    display: { ...state.display, timeFormat: format },
                }));
            },

            setItemsPerPage: (count) => {
                set((state) => ({
                    display: { ...state.display, itemsPerPage: count },
                }));
            },

            setReducedMotion: (enabled) => {
                set((state) => ({
                    display: { ...state.display, reducedMotion: enabled },
                }));
            },

            setCompactMode: (enabled) => {
                set((state) => ({
                    display: { ...state.display, compactMode: enabled },
                }));
            },

            // Filter actions
            setDefaultFilters: (filters) => {
                set((state) => ({
                    defaultFilters: { ...state.defaultFilters, ...filters },
                }));
            },

            resetDefaultFilters: () => {
                set({ defaultFilters: DEFAULT_PREFERENCES.defaultFilters });
            },

            // Quick actions
            addQuickActionFavorite: (action) => {
                set((state) => {
                    const exists = state.quickActionFavorites.find((f) => f.id === action.id);
                    if (exists) return state;

                    const updated = [
                        ...state.quickActionFavorites,
                        {
                            ...action,
                            usageCount: 0,
                            lastUsed: new Date().toISOString(),
                        },
                    ].slice(0, MAX_QUICK_ACTION_FAVORITES);

                    return { quickActionFavorites: updated };
                });
            },

            removeQuickActionFavorite: (id) => {
                set((state) => ({
                    quickActionFavorites: state.quickActionFavorites.filter((f) => f.id !== id),
                }));
            },

            recordQuickActionUsage: (id) => {
                set((state) => ({
                    quickActionFavorites: state.quickActionFavorites.map((f) =>
                        f.id === id
                            ? { ...f, usageCount: f.usageCount + 1, lastUsed: new Date().toISOString() }
                            : f
                    ),
                }));
            },

            getTopQuickActions: (limit = 5) => {
                const favorites = get().quickActionFavorites;
                return [...favorites].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
            },

            // Activity tracking
            recordActivity: (activity) => {
                set((state) => {
                    const newRecord: ActivityRecord = {
                        ...activity,
                        timestamp: new Date().toISOString(),
                    };
                    const updated = [newRecord, ...state.recentActivity].slice(0, MAX_ACTIVITY_RECORDS);
                    return { recentActivity: updated };
                });
            },

            getRecentActivity: (limit = 10) => {
                return get().recentActivity.slice(0, limit);
            },

            clearActivityHistory: () => {
                set({ recentActivity: [] });
            },

            // Reset all
            resetAllPreferences: () => {
                set(DEFAULT_PREFERENCES);
            },
        }),
        {
            name: 'jasca-preferences',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ============================================
// Helper Hooks
// ============================================

export function useChartView() {
    const chartView = usePreferencesStore((state) => state.dashboard.chartView);
    const setChartView = usePreferencesStore((state) => state.setChartView);
    return [chartView, setChartView] as const;
}

export function useTrendPeriod() {
    const trendPeriod = usePreferencesStore((state) => state.dashboard.trendPeriod);
    const setTrendPeriod = usePreferencesStore((state) => state.setTrendPeriod);
    return [trendPeriod, setTrendPeriod] as const;
}

export function useWidgetVisibility() {
    const visibility = usePreferencesStore((state) => state.dashboard.widgetVisibility);
    const toggle = usePreferencesStore((state) => state.toggleWidgetVisibility);
    const setVisibility = usePreferencesStore((state) => state.setWidgetVisibility);
    return { visibility, toggle, setVisibility };
}

export function useDateFormat() {
    const dateFormat = usePreferencesStore((state) => state.display.dateFormat);
    const setDateFormat = usePreferencesStore((state) => state.setDateFormat);
    return [dateFormat, setDateFormat] as const;
}

export function useTimeFormat() {
    const timeFormat = usePreferencesStore((state) => state.display.timeFormat);
    const setTimeFormat = usePreferencesStore((state) => state.setTimeFormat);
    return [timeFormat, setTimeFormat] as const;
}

// ============================================
// Date/Time Formatting Utilities
// ============================================

export function formatDate(date: Date | string, format: DateFormat): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === 'relative') {
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

export function formatTime(date: Date | string, format: TimeFormat): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (format === '12h') {
        const period = hours >= 12 ? '오후' : '오전';
        const h12 = hours % 12 || 12;
        return `${period} ${h12}:${minutes}`;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function formatDateTime(date: Date | string, dateFormat: DateFormat, timeFormat: TimeFormat): string {
    return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
}
