'use client';

import { useReportStatistics } from '@/lib/api-hooks';
import { BarChart3, CheckCircle, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';

export function ReportStatistics() {
    const { data: stats, isLoading } = useReportStatistics();

    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="animate-pulse">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
                            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const maxTrendCount = Math.max(...stats.dailyTrend.map(d => d.count), 1);

    return (
        <div className="space-y-6 mb-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Reports */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">총 리포트</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">최근 30일: {stats.recentCount}개</p>
                </div>

                {/* Completion Rate */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">완료율</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completionRate}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">완료: {stats.statusCounts.completed}개</p>
                </div>

                {/* Generating */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">생성 중</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.statusCounts.generating}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">대기: {stats.statusCounts.pending}개</p>
                </div>

                {/* Failed */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">실패</p>
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.statusCounts.failed}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">평균 생성 시간: {stats.avgGenerationTime}초</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">최근 30일 생성 트렌드</h3>
                    </div>
                    <div className="h-64 flex items-end gap-1 px-2">
                        {stats.dailyTrend.slice(-30).map((day, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end group">
                                <div
                                    className="w-full bg-blue-500/80 hover:bg-blue-600 rounded-t transition-colors relative"
                                    style={{ height: `${(day.count / maxTrendCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                                >
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        {day.count}
                                    </span>
                                </div>
                                {idx % 5 === 0 && (
                                    <span className="text-[10px] text-slate-500 mt-2 -rotate-45">
                                        {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Type Distribution */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">유형별 분포</h3>
                    <div className="space-y-3">
                        {stats.typeDistribution.map((type, idx) => {
                            const total = stats.typeDistribution.reduce((sum, t) => sum + t.count, 0);
                            const percentage = total > 0 ? Math.round((type.count / total) * 100) : 0;
                            const colors = [
                                'bg-red-500',
                                'bg-blue-500',
                                'bg-green-500',
                                'bg-yellow-500',
                            ];
                            return (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{type.name}</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{type.count}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                            className={`${colors[idx % colors.length]} h-2 rounded-full transition-all`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {stats.typeDistribution.length === 0 && (
                            <p className="text-center text-slate-500 py-8">데이터 없음</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
