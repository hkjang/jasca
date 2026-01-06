'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    Bell,
    AlertTriangle,
    Shield,
    CheckCircle,
    Check,
    Trash2,
    Loader2,
    Filter,
    ArrowUpDown,
    ChevronDown,
    ExternalLink,
    X,
    Clock,
    ShieldAlert,
    FileWarning,
    Scan,
    CheckSquare,
    Square,
} from 'lucide-react';
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
    type Notification
} from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution, useNotificationsAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import Link from 'next/link';

type NotificationType = 'all' | 'critical_vuln' | 'policy_violation' | 'scan_complete' | 'exception';
type SortOption = 'newest' | 'oldest' | 'priority';
type FilterStatus = 'all' | 'unread' | 'read';

interface NotificationTypeConfig {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
}

const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeConfig> = {
    all: {
        label: '전체',
        icon: Bell,
        color: 'text-slate-500',
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        borderColor: 'border-slate-300 dark:border-slate-600',
    },
    critical_vuln: {
        label: '취약점',
        icon: ShieldAlert,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-300 dark:border-red-800',
    },
    policy_violation: {
        label: '정책 위반',
        icon: FileWarning,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-300 dark:border-orange-800',
    },
    scan_complete: {
        label: '스캔 완료',
        icon: Scan,
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-300 dark:border-green-800',
    },
    exception: {
        label: '예외',
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-300 dark:border-blue-800',
    },
};

const PRIORITY_ORDER: Record<string, number> = {
    critical_vuln: 1,
    policy_violation: 2,
    exception: 3,
    scan_complete: 4,
    system: 5,
};

function getNotificationIcon(type: string) {
    const config = NOTIFICATION_TYPES[type as NotificationType] || NOTIFICATION_TYPES.all;
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
}

function getNotificationBadge(type: string) {
    const config = NOTIFICATION_TYPES[type as NotificationType];
    if (!config) return null;
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
            {config.label}
        </span>
    );
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
    const { data: notifications = [], isLoading, error, refetch } = useNotifications();
    const markReadMutation = useMarkNotificationRead();
    const markAllReadMutation = useMarkAllNotificationsRead();

    // Filter & Sort State
    const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // AI Integration
    const collectNotificationsContext = useNotificationsAiContext();
    const {
        execute: executeNotificationSummary,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('notification.summary');

    const { activePanel, closePanel } = useAiStore();

    // Filtered & Sorted Notifications
    const filteredNotifications = useMemo(() => {
        let result = [...notifications];

        // Type filter
        if (typeFilter !== 'all') {
            result = result.filter(n => n.type === typeFilter);
        }

        // Status filter
        if (statusFilter === 'unread') {
            result = result.filter(n => !n.isRead);
        } else if (statusFilter === 'read') {
            result = result.filter(n => n.isRead);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'oldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'priority':
                    const priorityA = PRIORITY_ORDER[a.type] || 99;
                    const priorityB = PRIORITY_ORDER[b.type] || 99;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'newest':
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return result;
    }, [notifications, typeFilter, statusFilter, sortOption]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Selection handlers
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === filteredNotifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
        }
    }, [filteredNotifications, selectedIds.size]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    // Action handlers
    const handleMarkAsRead = async (id: string) => {
        try {
            await markReadMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllReadMutation.mutateAsync();
            clearSelection();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleMarkSelectedAsRead = async () => {
        for (const id of selectedIds) {
            await handleMarkAsRead(id);
        }
        clearSelection();
    };

    // AI handlers
    const handleAiSummary = () => {
        const context = collectNotificationsContext(notifications);
        executeNotificationSummary(context);
    };

    const handleAiRegenerate = () => {
        handleAiSummary();
    };

    const estimatedTokens = notifications.length > 0
        ? estimateTokens(collectNotificationsContext(notifications.slice(0, 10)))
        : 0;

    // Type counts for badges
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: notifications.length,
            critical_vuln: 0,
            policy_violation: 0,
            scan_complete: 0,
            exception: 0,
        };
        notifications.forEach(n => {
            if (counts[n.type] !== undefined) {
                counts[n.type]++;
            }
        });
        return counts;
    }, [notifications]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-slate-500 dark:text-slate-400">알림을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
                <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">오류 발생</h3>
                <p className="text-red-600 dark:text-red-300 mb-4">알림 목록을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                            <Bell className="h-6 w-6 text-white" />
                        </div>
                        알림 센터
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {unreadCount > 0 
                            ? <span className="flex items-center gap-2">
                                <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                {unreadCount}개의 읽지 않은 알림
                              </span>
                            : '모든 알림을 확인했습니다'
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AiButton
                        action="notification.summary"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiSummary}
                        onCancel={cancelAi}
                        disabled={notifications.length === 0}
                    />
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0 || markAllReadMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        {markAllReadMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        모두 읽음
                    </button>
                </div>
            </div>

            {/* Type Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(NOTIFICATION_TYPES) as NotificationType[]).map((type) => {
                    const config = NOTIFICATION_TYPES[type];
                    const Icon = config.icon;
                    const count = typeCounts[type] || 0;
                    const isActive = typeFilter === type;

                    return (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`
                                flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all
                                ${isActive
                                    ? `${config.bgColor} ${config.color} border ${config.borderColor} shadow-sm`
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                }
                            `}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{config.label}</span>
                            {count > 0 && (
                                <span className={`
                                    ml-1 px-1.5 py-0.5 text-xs rounded-full
                                    ${isActive 
                                        ? 'bg-white/50 dark:bg-black/20' 
                                        : 'bg-slate-200 dark:bg-slate-700'
                                    }
                                `}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filters & Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">상태:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        {(['all', 'unread', 'read'] as FilterStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`
                                    px-3 py-1 text-sm rounded-md transition-colors
                                    ${statusFilter === status
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }
                                `}
                            >
                                {status === 'all' ? '전체' : status === 'unread' ? '읽지 않음' : '읽음'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowUpDown className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300">
                            {sortOption === 'newest' ? '최신순' : sortOption === 'oldest' ? '오래된순' : '우선순위순'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                    {showSortDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                                {[
                                    { value: 'newest' as SortOption, label: '최신순' },
                                    { value: 'oldest' as SortOption, label: '오래된순' },
                                    { value: 'priority' as SortOption, label: '우선순위순' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setSortOption(option.value);
                                            setShowSortDropdown(false);
                                        }}
                                        className={`
                                            w-full px-4 py-2 text-left text-sm transition-colors
                                            ${sortOption === option.value
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }
                                        `}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar (when items selected) */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {selectedIds.size}개 선택됨
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMarkSelectedAsRead}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <Check className="h-4 w-4" />
                            읽음 처리
                        </button>
                        <button
                            onClick={clearSelection}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                        <Bell className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        알림이 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                        {statusFilter === 'unread' 
                            ? '읽지 않은 알림이 없습니다. 모든 알림을 확인했네요!' 
                            : typeFilter !== 'all'
                                ? `${NOTIFICATION_TYPES[typeFilter].label} 유형의 알림이 없습니다.`
                                : '새로운 알림이 없습니다. 잠시 후 다시 확인해주세요.'
                        }
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* List Header */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={toggleSelectAll}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            {selectedIds.size === filteredNotifications.length ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                                <Square className="h-5 w-5" />
                            )}
                        </button>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {filteredNotifications.length}개의 알림
                        </span>
                    </div>

                    {/* List Items */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredNotifications.map((notification: Notification) => (
                            <div
                                key={notification.id}
                                className={`
                                    group flex items-start gap-4 p-4 transition-colors
                                    ${!notification.isRead 
                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                    }
                                    ${selectedIds.has(notification.id) ? 'bg-blue-100/50 dark:bg-blue-900/30' : ''}
                                `}
                            >
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleSelect(notification.id)}
                                    className="mt-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {selectedIds.has(notification.id) ? (
                                        <CheckSquare className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <Square className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </button>

                                {/* Icon */}
                                <div className={`
                                    flex-shrink-0 p-2 rounded-lg mt-0.5
                                    ${NOTIFICATION_TYPES[notification.type as NotificationType]?.bgColor || 'bg-slate-100 dark:bg-slate-800'}
                                `}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h4 className={`font-medium ${!notification.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {notification.title}
                                        </h4>
                                        {!notification.isRead && (
                                            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        )}
                                        {getNotificationBadge(notification.type)}
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTimeAgo(notification.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            disabled={markReadMutation.isPending}
                                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                            title="읽음 표시"
                                        >
                                            {markReadMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                    <Link
                                        href={`/dashboard/vulnerabilities`}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        title="상세 보기"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'notification.summary'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="notification.summary"
            />
        </div>
    );
}
