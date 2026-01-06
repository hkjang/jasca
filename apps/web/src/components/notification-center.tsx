'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    X,
    CheckCircle,
    AlertTriangle,
    Info,
    Trash2,
    Check,
    RefreshCw,
    Settings,
    ExternalLink,
    ChevronRight,
    Shield,
    Clock,
    FileWarning,
    Scan,
    Loader2,
    Volume2,
    VolumeX,
} from 'lucide-react';
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
    type Notification as ApiNotification
} from '@/lib/api-hooks';

// Legacy interface for localStorage-based notifications (fallback)
interface LocalNotification {
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
}

const STORAGE_KEY = 'jasca-notifications';

interface NotificationConfig {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
}

const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
    critical_vuln: {
        icon: Shield,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: 'Critical',
    },
    policy_violation: {
        icon: FileWarning,
        color: 'text-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        label: '정책 위반',
    },
    scan_complete: {
        icon: Scan,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: '스캔 완료',
    },
    exception: {
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        label: '예외',
    },
    success: {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: '성공',
    },
    warning: {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        label: '경고',
    },
    error: {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: '오류',
    },
    info: {
        icon: Info,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        label: '정보',
    },
    system: {
        icon: Info,
        color: 'text-slate-500',
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        label: '시스템',
    },
};

function getNotificationConfig(type: string): NotificationConfig {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.info;
}

function formatTimestamp(timestamp: number | string) {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function NotificationCenter() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [useApi, setUseApi] = useState(true);
    const panelRef = useRef<HTMLDivElement>(null);

    // API-based notifications
    const { data: apiNotifications = [], isLoading, refetch } = useNotifications();
    const markReadMutation = useMarkNotificationRead();
    const markAllReadMutation = useMarkAllNotificationsRead();

    // Fallback localStorage notifications
    const [localNotifications, setLocalNotifications] = useState<LocalNotification[]>([]);

    useEffect(() => {
        // Load from localStorage as fallback
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setLocalNotifications(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse notifications from localStorage');
            }
        }

        // Check if API is available
        if (apiNotifications.length === 0 && !isLoading) {
            setUseApi(false);
        } else if (apiNotifications.length > 0) {
            setUseApi(true);
        }
    }, [apiNotifications, isLoading]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Combined notifications
    const notifications = useApi
        ? apiNotifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt).getTime(),
            read: n.isRead,
            link: undefined as string | undefined,
        }))
        : localNotifications;

    const unreadCount = notifications.filter(n => !n.read).length;
    const criticalCount = notifications.filter(n => !n.read && (n.type === 'critical_vuln' || n.type === 'error')).length;

    const markAsRead = useCallback(async (id: string) => {
        if (useApi) {
            try {
                await markReadMutation.mutateAsync(id);
            } catch (e) {
                console.error('Failed to mark as read:', e);
            }
        } else {
            const updated = localNotifications.map(n =>
                n.id === id ? { ...n, read: true } : n
            );
            setLocalNotifications(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
    }, [useApi, localNotifications, markReadMutation]);

    const markAllAsRead = useCallback(async () => {
        if (useApi) {
            try {
                await markAllReadMutation.mutateAsync();
            } catch (e) {
                console.error('Failed to mark all as read:', e);
            }
        } else {
            const updated = localNotifications.map(n => ({ ...n, read: true }));
            setLocalNotifications(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
    }, [useApi, localNotifications, markAllReadMutation]);

    const deleteNotification = useCallback((id: string) => {
        const updated = localNotifications.filter(n => n.id !== id);
        setLocalNotifications(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }, [localNotifications]);

    const clearAll = useCallback(() => {
        setLocalNotifications([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const handleNotificationClick = useCallback(async (notification: typeof notifications[0]) => {
        await markAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
            setIsOpen(false);
        }
    }, [markAsRead, router]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                        {criticalCount > 0 && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white ${criticalCount > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-[400px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">알림</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                                    {unreadCount}개 new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={markAllReadMutation.isPending}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    title="모두 읽음 처리"
                                >
                                    {markAllReadMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => refetch()}
                                disabled={isLoading}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="새로고침"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/settings/notifications')}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="알림 설정"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="h-8 w-8 mx-auto text-blue-600 animate-spin mb-3" />
                                <p className="text-slate-500 dark:text-slate-400 text-sm">알림을 불러오는 중...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                    <Bell className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 font-medium">알림이 없습니다</p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                    새로운 알림이 오면 여기에 표시됩니다
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {notifications.slice(0, 10).map((notification) => {
                                    const config = getNotificationConfig(notification.type);
                                    const Icon = config.icon;
                                    const isCritical = notification.type === 'critical_vuln' || notification.type === 'error';

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`
                                                group flex items-start gap-3 px-4 py-3 cursor-pointer transition-all
                                                hover:bg-slate-50 dark:hover:bg-slate-700/30
                                                ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                                ${isCritical && !notification.read ? 'border-l-2 border-l-red-500' : ''}
                                            `}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className={`flex-shrink-0 p-2 rounded-lg ${config.bgColor}`}>
                                                <Icon className={`h-4 w-4 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-medium truncate ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimestamp(notification.timestamp)}
                                                    </span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {notification.link && (
                                                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                                )}
                                                {!useApi && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification.id);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => {
                                    router.push('/dashboard/notifications');
                                    setIsOpen(false);
                                }}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                모든 알림 보기
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            {!useApi && notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 transition-colors"
                                >
                                    모두 삭제
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Hook to add new notifications
export function useNotification() {
    const addNotification = (notification: Omit<LocalNotification, 'id' | 'timestamp' | 'read'>) => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const existing: LocalNotification[] = saved ? JSON.parse(saved) : [];
        
        const newNotification: LocalNotification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: Date.now(),
            read: false,
        };

        const updated = [newNotification, ...existing].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Trigger storage event for other tabs
        window.dispatchEvent(new Event('storage'));
    };

    return { addNotification };
}

// Compact notification button for header
export function NotificationBell({ className = '' }: { className?: string }) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const updateCount = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const notifications: LocalNotification[] = JSON.parse(saved);
                setUnreadCount(notifications.filter(n => !n.read).length);
            }
        };

        updateCount();
        window.addEventListener('storage', updateCount);
        return () => window.removeEventListener('storage', updateCount);
    }, []);

    return (
        <div className={`relative ${className}`}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </div>
    );
}
