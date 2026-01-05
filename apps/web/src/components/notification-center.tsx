'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface Notification {
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
}

const STORAGE_KEY = 'jasca-notifications';

// Mock notifications for demo
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'error',
        title: '신규 Critical 취약점 발견',
        message: 'backend-api 프로젝트에서 CVE-2024-1234 발견',
        timestamp: Date.now() - 1000 * 60 * 5,
        read: false,
        link: '/dashboard/vulnerabilities?severity=CRITICAL',
    },
    {
        id: '2',
        type: 'warning',
        title: '스캔 스케줄 실패',
        message: 'frontend-web 프로젝트 스캔이 네트워크 오류로 실패했습니다',
        timestamp: Date.now() - 1000 * 60 * 30,
        read: false,
        link: '/dashboard/scans',
    },
    {
        id: '3',
        type: 'success',
        title: '리포트 생성 완료',
        message: '12월 취약점 요약 리포트가 생성되었습니다',
        timestamp: Date.now() - 1000 * 60 * 60,
        read: true,
        link: '/dashboard/reports',
    },
    {
        id: '4',
        type: 'info',
        title: '정책 업데이트',
        message: '새로운 보안 정책이 적용되었습니다',
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
        read: true,
    },
];

function getNotificationIcon(type: Notification['type']) {
    switch (type) {
        case 'success':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'warning':
            return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        case 'error':
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case 'info':
            return <Info className="h-5 w-5 text-blue-500" />;
    }
}

function formatTimestamp(timestamp: number) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
}

export function NotificationCenter() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Load from localStorage or use mock data
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setNotifications(JSON.parse(saved));
        } else {
            setNotifications(mockNotifications);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mockNotifications));
        }
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        const updated = notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        setNotifications(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const deleteNotification = (id: string) => {
        const updated = notifications.filter(n => n.id !== id);
        setNotifications(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="font-semibold text-slate-900 dark:text-white">알림</h3>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="모두 읽음 처리"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push('/dashboard/settings/notifications')}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="알림 설정"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">알림이 없습니다</p>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`
                                                group flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50
                                                hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors
                                                ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                            `}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400">
                                                        {formatTimestamp(notification.timestamp)}
                                                    </span>
                                                    {notification.link && (
                                                        <ExternalLink className="h-3 w-3 text-slate-400" />
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <button
                                    onClick={clearAll}
                                    className="w-full text-center text-sm text-slate-500 hover:text-red-600 dark:text-slate-400"
                                >
                                    모든 알림 삭제
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// Hook to add new notifications
export function useNotification() {
    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const existing: Notification[] = saved ? JSON.parse(saved) : [];
        
        const newNotification: Notification = {
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
                const notifications: Notification[] = JSON.parse(saved);
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
