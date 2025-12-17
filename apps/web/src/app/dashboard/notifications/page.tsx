'use client';

import { useState } from 'react';
import {
    Bell,
    AlertTriangle,
    Shield,
    CheckCircle,
    Clock,
    Filter,
    RefreshCw,
    Check,
    Trash2,
} from 'lucide-react';

// Mock notifications
const mockNotifications = [
    {
        id: '1',
        type: 'CRITICAL_VULN',
        title: '새로운 Critical 취약점 발견',
        message: 'backend-api 프로젝트에서 CVE-2024-1234(Log4j)가 발견되었습니다.',
        read: false,
        createdAt: '2024-12-17T10:30:00Z',
    },
    {
        id: '2',
        type: 'POLICY_VIOLATION',
        title: '정책 위반 알림',
        message: 'frontend-web 프로젝트가 Critical 차단 정책을 위반했습니다.',
        read: false,
        createdAt: '2024-12-17T09:15:00Z',
    },
    {
        id: '3',
        type: 'SCAN_COMPLETE',
        title: '스캔 완료',
        message: 'auth-service:v2.3.0 이미지 스캔이 완료되었습니다. 취약점 12개 발견.',
        read: true,
        createdAt: '2024-12-16T18:45:00Z',
    },
    {
        id: '4',
        type: 'CRITICAL_VULN',
        title: 'Zero-Day 취약점 경고',
        message: 'CVE-2024-5678이 Zero-Day로 식별되었습니다. 즉시 조치가 필요합니다.',
        read: true,
        createdAt: '2024-12-16T14:20:00Z',
    },
    {
        id: '5',
        type: 'EXCEPTION_APPROVED',
        title: '예외 승인됨',
        message: 'CVE-2024-9999에 대한 예외 요청이 승인되었습니다.',
        read: true,
        createdAt: '2024-12-15T11:00:00Z',
    },
];

function getNotificationIcon(type: string) {
    switch (type) {
        case 'CRITICAL_VULN':
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case 'POLICY_VIOLATION':
            return <Shield className="h-5 w-5 text-orange-500" />;
        case 'SCAN_COMPLETE':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'EXCEPTION_APPROVED':
            return <Check className="h-5 w-5 text-blue-500" />;
        default:
            return <Bell className="h-5 w-5 text-slate-500" />;
    }
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    return '방금 전';
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">알림 센터</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림` : '모든 알림을 확인했습니다'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Check className="h-4 w-4" />
                        모두 읽음
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === 'all'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    전체
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${filter === 'unread'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    읽지 않음
                    {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Bell className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        알림이 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        {filter === 'unread' ? '읽지 않은 알림이 없습니다.' : '새로운 알림이 없습니다.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                }`}
                        >
                            <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-medium ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {notification.title}
                                    </h4>
                                    {!notification.read && (
                                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {notification.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {formatTimeAgo(notification.createdAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                {!notification.read && (
                                    <button
                                        onClick={() => markAsRead(notification.id)}
                                        className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        title="읽음 표시"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteNotification(notification.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="삭제"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
