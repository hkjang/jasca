'use client';

import { useState } from 'react';
import {
    Bell,
    Mail,
    MessageSquare,
    Webhook,
    Plus,
    Trash2,
    Loader2,
    AlertTriangle,
    Play,
    CheckCircle,
    XCircle,
    Settings,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    useNotificationChannels,
    useCreateNotificationChannel,
    useUpdateNotificationChannel,
    useDeleteNotificationChannel,
    useTestNotificationChannel,
    useAddNotificationRule,
    useUpdateNotificationRule,
    useDeleteNotificationRule,
    type NotificationChannel,
    type NotificationRule,
} from '@/lib/api-hooks';

const eventTypes = [
    { id: 'NEW_CRITICAL_VULN', label: 'Critical 취약점 발견' },
    { id: 'NEW_HIGH_VULN', label: 'High 취약점 발견' },
    { id: 'SCAN_COMPLETED', label: '스캔 완료' },
    { id: 'POLICY_VIOLATION', label: '정책 위반' },
    { id: 'EXCEPTION_REQUESTED', label: '예외 요청' },
    { id: 'EXCEPTION_APPROVED', label: '예외 승인' },
    { id: 'EXCEPTION_EXPIRING', label: '예외 만료 임박' },
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
    const testMutation = useTestNotificationChannel();
    const addRuleMutation = useAddNotificationRule();
    const updateRuleMutation = useUpdateNotificationRule();
    const deleteRuleMutation = useDeleteNotificationRule();

    const [showAddModal, setShowAddModal] = useState(false);
    const [newChannelType, setNewChannelType] = useState<'SLACK' | 'EMAIL' | 'WEBHOOK' | 'MATTERMOST'>('SLACK');
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelConfig, setNewChannelConfig] = useState('');
    
    // SMTP config for email
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPass, setSmtpPass] = useState('');

    const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
    const [testingChannels, setTestingChannels] = useState<Set<string>>(new Set());

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

    const handleTestChannel = async (channelId: string) => {
        setTestingChannels(prev => new Set(prev).add(channelId));
        setTestResults(prev => ({ ...prev, [channelId]: null }));
        try {
            const result = await testMutation.mutateAsync(channelId);
            setTestResults(prev => ({ ...prev, [channelId]: result }));
        } catch (err) {
            setTestResults(prev => ({
                ...prev,
                [channelId]: { success: false, message: err instanceof Error ? err.message : '테스트 실패' },
            }));
        } finally {
            setTestingChannels(prev => {
                const newSet = new Set(prev);
                newSet.delete(channelId);
                return newSet;
            });
        }
    };

    const handleToggleRule = async (channel: NotificationChannel, eventType: string, currentlyEnabled: boolean) => {
        const existingRule = channel.rules?.find(r => r.eventType === eventType);
        
        try {
            if (existingRule) {
                // Toggle existing rule
                await updateRuleMutation.mutateAsync({
                    channelId: channel.id,
                    ruleId: existingRule.id,
                    isActive: !currentlyEnabled,
                });
            } else {
                // Create new rule
                await addRuleMutation.mutateAsync({
                    channelId: channel.id,
                    eventType,
                    isActive: true,
                });
            }
            refetch();
        } catch (err) {
            console.error('Failed to toggle rule:', err);
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName) return;

        try {
            const config: Record<string, unknown> = {};
            if (newChannelType === 'SLACK' || newChannelType === 'MATTERMOST' || newChannelType === 'WEBHOOK') {
                config.webhookUrl = newChannelConfig;
            } else if (newChannelType === 'EMAIL') {
                config.recipients = newChannelConfig.split(',').map(s => s.trim());
                if (smtpHost) {
                    config.smtpHost = smtpHost;
                    config.smtpPort = parseInt(smtpPort, 10);
                    config.smtpUser = smtpUser || undefined;
                    config.smtpPass = smtpPass || undefined;
                }
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
            setSmtpHost('');
            setSmtpPort('587');
            setSmtpUser('');
            setSmtpPass('');
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    };

    const toggleExpanded = (channelId: string) => {
        setExpandedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            return newSet;
        });
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

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-200">알림 채널 설정</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            이메일, Slack, Mattermost, Webhook을 통해 보안 이벤트 알림을 받을 수 있습니다.
                            채널을 추가한 후 테스트 버튼으로 연결을 확인하세요.
                        </p>
                    </div>
                </div>
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
                    {channels.map((channel) => {
                        const isExpanded = expandedChannels.has(channel.id);
                        const testResult = testResults[channel.id];
                        const isTesting = testingChannels.has(channel.id);

                        return (
                            <div
                                key={channel.id}
                                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${!channel.isActive ? 'opacity-60' : ''}`}
                            >
                                {/* Channel Header */}
                                <div className="p-6">
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
                                            {/* Test Button */}
                                            <button
                                                onClick={() => handleTestChannel(channel.id)}
                                                disabled={isTesting || !channel.isActive}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                            >
                                                {isTesting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                                테스트
                                            </button>
                                            
                                            {/* Toggle */}
                                            <button
                                                onClick={() => handleToggleChannel(channel)}
                                                className={`relative w-12 h-6 rounded-full transition-colors ${channel.isActive ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span
                                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${channel.isActive ? 'translate-x-6' : ''}`}
                                                />
                                            </button>
                                            
                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDeleteChannel(channel.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Test Result */}
                                    {testResult && (
                                        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${testResult.success
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                            }`}>
                                            {testResult.success ? (
                                                <CheckCircle className="h-5 w-5" />
                                            ) : (
                                                <XCircle className="h-5 w-5" />
                                            )}
                                            <span className="text-sm">{testResult.message}</span>
                                        </div>
                                    )}

                                    {/* Expand/Collapse Button */}
                                    <button
                                        onClick={() => toggleExpanded(channel.id)}
                                        className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span>이벤트 규칙 설정</span>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Event Rules (Expanded) */}
                                {isExpanded && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                                            알림을 받을 이벤트를 선택하세요
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {eventTypes.map((event) => {
                                                const rule = channel.rules?.find(r => r.eventType === event.id);
                                                const isEnabled = rule?.isActive ?? false;
                                                const isLoading = updateRuleMutation.isPending || addRuleMutation.isPending;

                                                return (
                                                    <label
                                                        key={event.id}
                                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${isEnabled
                                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isEnabled}
                                                            onChange={() => handleToggleRule(channel, event.id, isEnabled)}
                                                            disabled={isLoading}
                                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                        />
                                                        <span className={`text-sm ${isEnabled ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                                            {event.label}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            알림 채널 추가
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    채널 유형
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { type: 'SLACK', label: 'Slack', icon: <MessageSquare className="h-5 w-5" /> },
                                        { type: 'EMAIL', label: '이메일', icon: <Mail className="h-5 w-5" /> },
                                        { type: 'WEBHOOK', label: 'Webhook', icon: <Webhook className="h-5 w-5" /> },
                                        { type: 'MATTERMOST', label: 'Mattermost', icon: <MessageSquare className="h-5 w-5" /> },
                                    ].map((item) => (
                                        <button
                                            key={item.type}
                                            onClick={() => setNewChannelType(item.type as 'SLACK' | 'EMAIL' | 'WEBHOOK' | 'MATTERMOST')}
                                            className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors ${newChannelType === item.type
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-red-500'
                                                }`}
                                        >
                                            {item.icon}
                                            <span className="text-xs">{item.label}</span>
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
                            
                            {/* SMTP Settings for Email */}
                            {newChannelType === 'EMAIL' && (
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                        SMTP 설정 (선택사항 - 환경 변수 사용 가능)
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">SMTP 호스트</label>
                                            <input
                                                type="text"
                                                value={smtpHost}
                                                onChange={(e) => setSmtpHost(e.target.value)}
                                                placeholder="smtp.example.com"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">포트</label>
                                            <input
                                                type="text"
                                                value={smtpPort}
                                                onChange={(e) => setSmtpPort(e.target.value)}
                                                placeholder="587"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">사용자명</label>
                                            <input
                                                type="text"
                                                value={smtpUser}
                                                onChange={(e) => setSmtpUser(e.target.value)}
                                                placeholder="username"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">비밀번호</label>
                                            <input
                                                type="password"
                                                value={smtpPass}
                                                onChange={(e) => setSmtpPass(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                        SMTP 설정을 비워두면 서버의 환경 변수 (SMTP_HOST 등)를 사용합니다.
                                    </p>
                                </div>
                            )}
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
