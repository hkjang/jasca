'use client';

import { useState } from 'react';
import {
    Settings,
    X,
    Eye,
    EyeOff,
    RotateCcw,
    LayoutGrid,
    Activity,
    Shield,
    Package,
    BarChart3,
    PieChart,
    Clock,
    Zap,
    Bell,
} from 'lucide-react';
import {
    usePreferencesStore,
    useWidgetVisibility,
    DashboardWidgetVisibility,
} from '@/stores/preferences-store';

interface WidgetConfig {
    key: keyof DashboardWidgetVisibility;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const WIDGET_CONFIGS: WidgetConfig[] = [
    {
        key: 'riskScore',
        label: '위험도 점수',
        description: '전체 위험도 스코어 표시',
        icon: Activity,
    },
    {
        key: 'statsCards',
        label: '통계 카드',
        description: 'Critical, High, 해결됨, 진행 중 카드',
        icon: BarChart3,
    },
    {
        key: 'summaryStats',
        label: '요약 통계',
        description: '전체 취약점, 미해결, 프로젝트, 알림 카드',
        icon: LayoutGrid,
    },
    {
        key: 'distributionChart',
        label: '분포 차트',
        description: '심각도/상태별 파이 차트',
        icon: PieChart,
    },
    {
        key: 'trendChart',
        label: '추세 차트',
        description: '취약점 추세 영역 차트',
        icon: Activity,
    },
    {
        key: 'projectsChart',
        label: '프로젝트별 차트',
        description: '프로젝트별 취약점 막대 차트',
        icon: Package,
    },
    {
        key: 'criticalList',
        label: 'Critical 목록',
        description: '최근 Critical 취약점 목록',
        icon: Shield,
    },
    {
        key: 'quickLinks',
        label: '빠른 링크',
        description: '새 스캔, 취약점, 리포트, 설정 버튼',
        icon: Zap,
    },
];

interface DashboardSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DashboardSettings({ isOpen, onClose }: DashboardSettingsProps) {
    const { visibility, toggle, setVisibility } = useWidgetVisibility();
    const resetDashboardDefaults = usePreferencesStore((state) => state.resetDashboardDefaults);
    const autoRefresh = usePreferencesStore((state) => state.dashboard.autoRefresh);
    const autoRefreshInterval = usePreferencesStore((state) => state.dashboard.autoRefreshInterval);
    const setAutoRefresh = usePreferencesStore((state) => state.setAutoRefresh);
    const setAutoRefreshInterval = usePreferencesStore((state) => state.setAutoRefreshInterval);

    const [showConfirmReset, setShowConfirmReset] = useState(false);

    if (!isOpen) return null;

    const handleReset = () => {
        resetDashboardDefaults();
        setShowConfirmReset(false);
    };

    const visibleCount = Object.values(visibility).filter(Boolean).length;
    const allVisible = visibleCount === WIDGET_CONFIGS.length;
    const noneVisible = visibleCount === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                대시보드 설정
                            </h3>
                            <p className="text-sm text-slate-500">위젯 표시 및 설정 관리</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                WIDGET_CONFIGS.forEach((w) => setVisibility(w.key, true));
                            }}
                            disabled={allVisible}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Eye className="h-4 w-4" />
                            전체 표시
                        </button>
                        <button
                            onClick={() => {
                                WIDGET_CONFIGS.forEach((w) => setVisibility(w.key, false));
                            }}
                            disabled={noneVisible}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <EyeOff className="h-4 w-4" />
                            전체 숨김
                        </button>
                    </div>

                    {/* Widgets */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            위젯 표시 설정
                            <span className="text-xs text-slate-400">
                                ({visibleCount}/{WIDGET_CONFIGS.length})
                            </span>
                        </h4>
                        <div className="space-y-1">
                            {WIDGET_CONFIGS.map((widget) => {
                                const Icon = widget.icon;
                                const isVisible = visibility[widget.key];
                                return (
                                    <button
                                        key={widget.key}
                                        onClick={() => toggle(widget.key)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                            isVisible
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                                : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 opacity-60'
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                isVisible
                                                    ? 'bg-blue-100 dark:bg-blue-800'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                            }`}
                                        >
                                            <Icon
                                                className={`h-4 w-4 ${
                                                    isVisible
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : 'text-slate-400'
                                                }`}
                                            />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p
                                                className={`font-medium ${
                                                    isVisible
                                                        ? 'text-slate-900 dark:text-white'
                                                        : 'text-slate-500'
                                                }`}
                                            >
                                                {widget.label}
                                            </p>
                                            <p className="text-xs text-slate-500">{widget.description}</p>
                                        </div>
                                        {isVisible ? (
                                            <Eye className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <EyeOff className="h-4 w-4 text-slate-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Auto Refresh */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            자동 새로고침
                        </h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">자동 새로고침</p>
                                    <p className="text-xs text-slate-500">대시보드를 주기적으로 업데이트</p>
                                </div>
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`w-12 h-6 rounded-full transition-colors ${
                                        autoRefresh ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                >
                                    <span
                                        className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                            autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                            {autoRefresh && (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={autoRefreshInterval}
                                        onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={30}>30초</option>
                                        <option value={60}>1분</option>
                                        <option value={120}>2분</option>
                                        <option value={300}>5분</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    {!showConfirmReset ? (
                        <button
                            onClick={() => setShowConfirmReset(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <RotateCcw className="h-4 w-4" />
                            기본값으로 초기화
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-red-600">초기화할까요?</span>
                            <button
                                onClick={handleReset}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                확인
                            </button>
                            <button
                                onClick={() => setShowConfirmReset(false)}
                                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400"
                            >
                                취소
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        완료
                    </button>
                </div>
            </div>
        </div>
    );
}

// Dashboard Settings Button Component
export function DashboardSettingsButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="대시보드 설정"
            >
                <Settings className="h-5 w-5" />
            </button>
            <DashboardSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
