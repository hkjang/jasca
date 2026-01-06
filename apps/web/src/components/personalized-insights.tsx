'use client';

import { useMemo } from 'react';
import {
    TrendingUp,
    History,
    Star,
    Zap,
    FolderOpen,
    Shield,
    ChevronRight,
    BarChart3,
    Clock,
} from 'lucide-react';
import { usePreferencesStore, formatDate, formatTime } from '@/stores/preferences-store';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function PersonalizedInsights() {
    const router = useRouter();
    const recentActivity = usePreferencesStore((state) => state.recentActivity);
    const quickActionFavorites = usePreferencesStore((state) => state.quickActionFavorites);
    const getTopQuickActions = usePreferencesStore((state) => state.getTopQuickActions);
    const dateFormat = usePreferencesStore((state) => state.display.dateFormat);
    const timeFormat = usePreferencesStore((state) => state.display.timeFormat);

    const topActions = getTopQuickActions(4);
    const recentItems = recentActivity.slice(0, 5);

    // Calculate activity stats
    const stats = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekActivity = recentActivity.filter(
            (a) => new Date(a.timestamp) >= weekAgo
        );

        const byType = weekActivity.reduce((acc, a) => {
            acc[a.type] = (acc[a.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalWeek: weekActivity.length,
            scans: byType['scan'] || 0,
            vulnerabilities: byType['vulnerability_view'] || 0,
            projects: byType['project_view'] || 0,
            reports: byType['report'] || 0,
        };
    }, [recentActivity]);

    // No data state
    if (recentActivity.length === 0 && quickActionFavorites.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        아직 활동 데이터가 없습니다
                    </h3>
                    <p className="text-sm text-slate-500">
                        앱을 사용하면 여기에 개인화된 인사이트가 표시됩니다
                    </p>
                </div>
            </Card>
        );
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'scan':
                return <Zap className="h-4 w-4 text-blue-500" />;
            case 'vulnerability_view':
                return <Shield className="h-4 w-4 text-red-500" />;
            case 'project_view':
                return <FolderOpen className="h-4 w-4 text-purple-500" />;
            case 'report':
                return <BarChart3 className="h-4 w-4 text-green-500" />;
            default:
                return <History className="h-4 w-4 text-slate-400" />;
        }
    };

    const getActivityLabel = (type: string) => {
        switch (type) {
            case 'scan':
                return '스캔';
            case 'vulnerability_view':
                return '취약점 확인';
            case 'project_view':
                return '프로젝트 조회';
            case 'report':
                return '리포트';
            default:
                return '활동';
        }
    };

    return (
        <div className="space-y-6">
            {/* Weekly Stats */}
            {stats.totalWeek > 0 && (
                <Card className="p-4">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        이번 주 활동
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.scans}</p>
                            <p className="text-xs text-slate-500">스캔</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.vulnerabilities}</p>
                            <p className="text-xs text-slate-500">취약점 확인</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.projects}</p>
                            <p className="text-xs text-slate-500">프로젝트</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.reports}</p>
                            <p className="text-xs text-slate-500">리포트</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Favorite Actions */}
            {topActions.length > 0 && (
                <Card className="p-4">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        자주 사용하는 기능
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {topActions.map((action) => (
                            <button
                                key={action.id}
                                onClick={() => router.push(action.href)}
                                className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                            >
                                <Zap className="h-4 w-4 text-blue-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                        {action.label}
                                    </p>
                                    <p className="text-xs text-slate-400">{action.usageCount}회 사용</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {/* Recent Activity */}
            {recentItems.length > 0 && (
                <Card className="p-4">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        최근 활동
                    </h4>
                    <div className="space-y-2">
                        {recentItems.map((activity, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                {getActivityIcon(activity.type)}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {activity.entityName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {getActivityLabel(activity.type)}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-slate-500">
                                        {formatDate(activity.timestamp, dateFormat)}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {formatTime(activity.timestamp, timeFormat)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

// Compact version for sidebar or small spaces
export function PersonalizedInsightsCompact() {
    const recentActivity = usePreferencesStore((state) => state.recentActivity);
    const getTopQuickActions = usePreferencesStore((state) => state.getTopQuickActions);
    const router = useRouter();

    const topActions = getTopQuickActions(3);
    const hasActivity = recentActivity.length > 0 || topActions.length > 0;

    if (!hasActivity) {
        return null;
    }

    return (
        <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                빠른 액세스
            </h4>
            <div className="space-y-1">
                {topActions.slice(0, 3).map((action) => (
                    <button
                        key={action.id}
                        onClick={() => router.push(action.href)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                    >
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
