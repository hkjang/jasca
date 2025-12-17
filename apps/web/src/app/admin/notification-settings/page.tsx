'use client';

import { useState } from 'react';
import {
    Bell,
    Mail,
    MessageSquare,
    Webhook,
    Save,
    Plus,
    Trash2,
    CheckCircle,
    Settings,
} from 'lucide-react';

interface NotificationChannel {
    id: string;
    type: 'email' | 'slack' | 'webhook';
    name: string;
    config: Record<string, string>;
    enabled: boolean;
    events: string[];
}

const mockChannels: NotificationChannel[] = [
    {
        id: '1',
        type: 'email',
        name: '보안팀 이메일',
        config: { recipients: 'security@acme.com' },
        enabled: true,
        events: ['CRITICAL_VULN', 'POLICY_VIOLATION'],
    },
    {
        id: '2',
        type: 'slack',
        name: '#security-alerts',
        config: { webhookUrl: 'https://hooks.slack.com/...' },
        enabled: true,
        events: ['CRITICAL_VULN', 'HIGH_VULN', 'SCAN_COMPLETE'],
    },
];

const eventTypes = [
    { id: 'CRITICAL_VULN', label: 'Critical 취약점 발견' },
    { id: 'HIGH_VULN', label: 'High 취약점 발견' },
    { id: 'SCAN_COMPLETE', label: '스캔 완료' },
    { id: 'POLICY_VIOLATION', label: '정책 위반' },
    { id: 'EXCEPTION_REQUEST', label: '예외 요청' },
];

function getChannelIcon(type: string) {
    switch (type) {
        case 'email':
            return <Mail className="h-5 w-5" />;
        case 'slack':
            return <MessageSquare className="h-5 w-5" />;
        case 'webhook':
            return <Webhook className="h-5 w-5" />;
        default:
            return <Bell className="h-5 w-5" />;
    }
}

export default function NotificationSettingsPage() {
    const [channels, setChannels] = useState<NotificationChannel[]>(mockChannels);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saved, setSaved] = useState(false);

    const toggleChannel = (id: string) => {
        setChannels(prev =>
            prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
        );
    };

    const deleteChannel = (id: string) => {
        if (confirm('이 채널을 삭제하시겠습니까?')) {
            setChannels(prev => prev.filter(c => c.id !== id));
        }
    };

    const toggleEvent = (channelId: string, eventId: string) => {
        setChannels(prev =>
            prev.map(c => {
                if (c.id !== channelId) return c;
                return {
                    ...c,
                    events: c.events.includes(eventId)
                        ? c.events.filter(e => e !== eventId)
                        : [...c.events, eventId]
                };
            })
        );
    };

    const handleSave = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">알림 설정</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        알림 채널과 이벤트를 설정합니다
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    채널 추가
                </button>
            </div>

            {/* Channels */}
            <div className="space-y-4">
                {channels.map((channel) => (
                    <div
                        key={channel.id}
                        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 ${!channel.enabled ? 'opacity-60' : ''
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${channel.type === 'email' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                        channel.type === 'slack' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                                            'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                                    }`}>
                                    {getChannelIcon(channel.type)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{channel.name}</h3>
                                    <p className="text-sm text-slate-500 capitalize">{channel.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleChannel(channel.id)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${channel.enabled ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${channel.enabled ? 'translate-x-6' : ''
                                            }`}
                                    />
                                </button>
                                <button
                                    onClick={() => deleteChannel(channel.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">알림 이벤트</p>
                            <div className="flex flex-wrap gap-2">
                                {eventTypes.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => toggleEvent(channel.id, event.id)}
                                        className={`px-3 py-1 rounded-lg border text-sm transition-colors ${channel.events.includes(event.id)
                                                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                            }`}
                                    >
                                        {event.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {channels.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Bell className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        알림 채널이 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        이메일, Slack 또는 Webhook 채널을 추가하세요.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        첫 채널 추가
                    </button>
                </div>
            )}

            {/* Save */}
            <div className="flex justify-end gap-4">
                {saved && (
                    <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        저장됨
                    </span>
                )}
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Save className="h-5 w-5" />
                    저장
                </button>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            알림 채널 추가
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    채널 유형
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'email', label: '이메일', icon: <Mail className="h-5 w-5" /> },
                                        { type: 'slack', label: 'Slack', icon: <MessageSquare className="h-5 w-5" /> },
                                        { type: 'webhook', label: 'Webhook', icon: <Webhook className="h-5 w-5" /> },
                                    ].map((item) => (
                                        <button
                                            key={item.type}
                                            className="flex flex-col items-center gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-red-500 transition-colors"
                                        >
                                            {item.icon}
                                            <span className="text-sm">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
