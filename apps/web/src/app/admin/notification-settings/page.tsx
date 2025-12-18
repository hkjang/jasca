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
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import {
    useNotificationChannels,
    useCreateNotificationChannel,
    useUpdateNotificationChannel,
    useDeleteNotificationChannel,
    type NotificationChannel,
} from '@/lib/api-hooks';

const eventTypes = [
    { id: 'CRITICAL_VULN', label: 'Critical 취약점 발견' },
    { id: 'HIGH_VULN', label: 'High 취약점 발견' },
    { id: 'SCAN_COMPLETE', label: '스캔 완료' },
    { id: 'POLICY_VIOLATION', label: '정책 위반' },
    { id: 'EXCEPTION_REQUEST', label: '예외 요청' },
];

function getChannelIcon(type: string) {
    switch (type) {
        case 'EMAIL':
            return <Mail className="h-5 w-5" />;
        case 'SLACK':
        case 'MATTERMOST':
            return <MessageSquare className="h-5 w-5" />;
        case 'WEBHOOK':
            return <Webhook className="h-5 w-5" />;
        default:
            return <Bell className="h-5 w-5" />;
    }
}

export default function NotificationSettingsPage() {
    const { data: channels = [], isLoading, error, refetch } = useNotificationChannels();
    const createMutation = useCreateNotificationChannel();
    const updateMutation = useUpdateNotificationChannel();
    const deleteMutation = useDeleteNotificationChannel();

    const [showAddModal, setShowAddModal] = useState(false);
    const [newChannelType, setNewChannelType] = useState<'SLACK' | 'EMAIL' | 'WEBHOOK'>('SLACK');
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelConfig, setNewChannelConfig] = useState('');

    const handleToggleChannel = async (channel: NotificationChannel) => {
        try {
            await updateMutation.mutateAsync({
                id: channel.id,
                isActive: !channel.isActive,
            });
        } catch (err) {
            console.error('Failed to update channel:', err);
        }
    };

    const handleDeleteChannel = async (id: string) => {
        if (confirm('이 채널을 삭제하시겠습니까?')) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err) {
                console.error('Failed to delete channel:', err);
            }
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName) return;

        try {
            const config: Record<string, unknown> = {};
            if (newChannelType === 'SLACK' || newChannelType === 'WEBHOOK') {
                config.webhookUrl = newChannelConfig;
            } else if (newChannelType === 'EMAIL') {
                config.recipients = newChannelConfig.split(',').map(s => s.trim());
            }

            await createMutation.mutateAsync({
                name: newChannelName,
                type: newChannelType,
                config,
                isActive: true,
            });

            setShowAddModal(false);
            setNewChannelName('');
            setNewChannelConfig('');
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">오류 발생</h3>
                <p className="text-red-600 dark:text-red-300">알림 채널을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    다시 시도
                </button>
            </div>
        );
    }

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
            {channels.length === 0 ? (
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
            ) : (
                <div className="space-y-4">
                    {channels.map((channel) => (
                        <div
                            key={channel.id}
                            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 ${!channel.isActive ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${channel.type === 'EMAIL' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                        channel.type === 'SLACK' || channel.type === 'MATTERMOST' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                                            'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                                        }`}>
                                        {getChannelIcon(channel.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{channel.name}</h3>
                                        <p className="text-sm text-slate-500 capitalize">{channel.type.toLowerCase()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleChannel(channel)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${channel.isActive ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${channel.isActive ? 'translate-x-6' : ''}`}
                                        />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteChannel(channel.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">알림 이벤트</p>
                                <div className="flex flex-wrap gap-2">
                                    {eventTypes.map((event) => {
                                        const isEnabled = channel.rules?.some(r => r.eventType === event.id && r.isActive);
                                        return (
                                            <span
                                                key={event.id}
                                                className={`px-3 py-1 rounded-lg border text-sm ${isEnabled
                                                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                                    }`}
                                            >
                                                {event.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                        { type: 'SLACK', label: 'Slack', icon: <MessageSquare className="h-5 w-5" /> },
                                        { type: 'EMAIL', label: '이메일', icon: <Mail className="h-5 w-5" /> },
                                        { type: 'WEBHOOK', label: 'Webhook', icon: <Webhook className="h-5 w-5" /> },
                                    ].map((item) => (
                                        <button
                                            key={item.type}
                                            onClick={() => setNewChannelType(item.type as 'SLACK' | 'EMAIL' | 'WEBHOOK')}
                                            className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${newChannelType === item.type
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-red-500'
                                                }`}
                                        >
                                            {item.icon}
                                            <span className="text-sm">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    채널 이름
                                </label>
                                <input
                                    type="text"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    placeholder="예: 보안팀 알림"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {newChannelType === 'EMAIL' ? '수신자 이메일 (쉼표로 구분)' : 'Webhook URL'}
                                </label>
                                <input
                                    type="text"
                                    value={newChannelConfig}
                                    onChange={(e) => setNewChannelConfig(e.target.value)}
                                    placeholder={newChannelType === 'EMAIL' ? 'security@example.com' : 'https://hooks.slack.com/...'}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
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
                                onClick={handleCreateChannel}
                                disabled={!newChannelName || createMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                추가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
