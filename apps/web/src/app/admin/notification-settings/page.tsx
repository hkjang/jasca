'use client';

import { useState, useMemo } from 'react';
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
    Copy,
    BarChart3,
    History,
    Filter,
    Search,
    Power,
    PowerOff,
    Zap,
    Clock,
    FileText,
    ExternalLink,
    RefreshCw,
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
    useCloneNotificationChannel,
    useBulkUpdateChannelStatus,
    type NotificationChannel,
    type NotificationRule,
} from '@/lib/api-hooks';

// Event types with categories
const eventTypes = [
    { id: 'NEW_CRITICAL_VULN', label: 'Critical 취약점 발견', category: '취약점', severity: 'critical' },
    { id: 'NEW_HIGH_VULN', label: 'High 취약점 발견', category: '취약점', severity: 'high' },
    { id: 'SCAN_COMPLETED', label: '스캔 완료', category: '스캔', severity: 'info' },
    { id: 'POLICY_VIOLATION', label: '정책 위반 (차단/경고)', category: '정책', severity: 'warning' },
    { id: 'POLICY_BLOCK', label: '정책 차단 발생', category: '정책', severity: 'critical' },
    { id: 'EXCEPTION_REQUESTED', label: '예외 요청', category: '예외', severity: 'info' },
    { id: 'EXCEPTION_APPROVED', label: '예외 승인', category: '예외', severity: 'success' },
    { id: 'EXCEPTION_EXPIRING', label: '예외 만료 임박', category: '예외', severity: 'warning' },
];

// Channel templates for quick setup
const channelTemplates = [
    {
        id: 'security-slack',
        name: '보안팀 Slack',
        type: 'SLACK' as const,
        description: 'Critical/High 취약점과 정책 위반 알림',
        rules: ['NEW_CRITICAL_VULN', 'NEW_HIGH_VULN', 'POLICY_VIOLATION', 'POLICY_BLOCK'],
    },
    {
        id: 'daily-digest',
        name: '일일 다이제스트',
        type: 'EMAIL' as const,
        description: '매일 스캔 결과 요약 이메일',
        rules: ['SCAN_COMPLETED'],
    },
    {
        id: 'cicd-webhook',
        name: 'CI/CD Webhook',
        type: 'WEBHOOK' as const,
        description: '빌드 파이프라인 연동용',
        rules: ['SCAN_COMPLETED', 'POLICY_BLOCK'],
    },
    {
        id: 'exception-mattermost',
        name: '예외 관리',
        type: 'MATTERMOST' as const,
        description: '예외 요청/승인/만료 알림',
        rules: ['EXCEPTION_REQUESTED', 'EXCEPTION_APPROVED', 'EXCEPTION_EXPIRING'],
    },
];

// Severity filter options
const severityOptions = [
    { value: 'CRITICAL', label: 'Critical', color: 'red' },
    { value: 'HIGH', label: 'High', color: 'orange' },
    { value: 'MEDIUM', label: 'Medium', color: 'yellow' },
    { value: 'LOW', label: 'Low', color: 'blue' },
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

function getChannelColor(type: string) {
    switch (type) {
        case 'EMAIL': return 'blue';
        case 'SLACK': return 'purple';
        case 'MATTERMOST': return 'indigo';
        case 'WEBHOOK': return 'orange';
        default: return 'slate';
    }
}

type TabType = 'channels' | 'settings';

export default function NotificationSettingsPage() {
    const { data: channels = [], isLoading, error, refetch } = useNotificationChannels();
    const createMutation = useCreateNotificationChannel();
    const updateMutation = useUpdateNotificationChannel();
    const deleteMutation = useDeleteNotificationChannel();
    const testMutation = useTestNotificationChannel();
    const addRuleMutation = useAddNotificationRule();
    const updateRuleMutation = useUpdateNotificationRule();
    const deleteRuleMutation = useDeleteNotificationRule();
    const cloneMutation = useCloneNotificationChannel();
    const bulkUpdateMutation = useBulkUpdateChannelStatus();

    const [activeTab, setActiveTab] = useState<TabType>('channels');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
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
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Statistics
    const stats = useMemo(() => {
        const active = channels.filter(c => c.isActive).length;
        const totalRules = channels.reduce((sum, c) => sum + (c.rules?.length || 0), 0);
        const byType = channels.reduce((acc, c) => {
            acc[c.type] = (acc[c.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return { total: channels.length, active, inactive: channels.length - active, totalRules, byType };
    }, [channels]);

    // Filtered channels
    const filteredChannels = useMemo(() => {
        return channels.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === 'all' || c.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && c.isActive) || 
                (statusFilter === 'inactive' && !c.isActive);
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [channels, searchQuery, typeFilter, statusFilter]);

    const handleToggleChannel = async (channel: NotificationChannel) => {
        try {
            await updateMutation.mutateAsync({ id: channel.id, isActive: !channel.isActive });
        } catch (err) {
            console.error('Failed to update channel:', err);
        }
    };

    const handleDeleteChannel = async (id: string) => {
        if (confirm('이 채널을 삭제하시겠습니까?')) {
            try {
                await deleteMutation.mutateAsync(id);
                setSelectedChannels(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            } catch (err) {
                console.error('Failed to delete channel:', err);
            }
        }
    };

    const handleCloneChannel = async (channel: NotificationChannel) => {
        const newName = prompt('복제할 채널 이름을 입력하세요:', `${channel.name} (복사본)`);
        if (newName) {
            try {
                await cloneMutation.mutateAsync({ channelId: channel.id, newName });
            } catch (err) {
                console.error('Failed to clone channel:', err);
            }
        }
    };

    const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
        const ids = Array.from(selectedChannels);
        if (ids.length === 0) return;
        
        if (action === 'delete') {
            if (!confirm(`선택한 ${ids.length}개 채널을 삭제하시겠습니까?`)) return;
            for (const id of ids) {
                await deleteMutation.mutateAsync(id);
            }
        } else {
            await bulkUpdateMutation.mutateAsync({ channelIds: ids, isActive: action === 'activate' });
        }
        setSelectedChannels(new Set());
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
                await updateRuleMutation.mutateAsync({
                    channelId: channel.id,
                    ruleId: existingRule.id,
                    isActive: !currentlyEnabled,
                });
            } else {
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

            resetForm();
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    };

    const handleApplyTemplate = async (template: typeof channelTemplates[0]) => {
        setNewChannelName(template.name);
        setNewChannelType(template.type);
        setShowTemplateModal(false);
        setShowAddModal(true);
    };

    const resetForm = () => {
        setNewChannelName('');
        setNewChannelConfig('');
        setSmtpHost('');
        setSmtpPort('587');
        setSmtpUser('');
        setSmtpPass('');
    };

    const toggleExpanded = (channelId: string) => {
        setExpandedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) newSet.delete(channelId);
            else newSet.add(channelId);
            return newSet;
        });
    };

    const toggleSelectChannel = (channelId: string) => {
        setSelectedChannels(prev => {
            const next = new Set(prev);
            if (next.has(channelId)) next.delete(channelId);
            else next.add(channelId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedChannels.size === filteredChannels.length) {
            setSelectedChannels(new Set());
        } else {
            setSelectedChannels(new Set(filteredChannels.map(c => c.id)));
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
                <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                        <Bell className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">알림 설정</h1>
                        <p className="text-sm text-slate-500">알림 채널 및 이벤트 규칙을 설정합니다</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <FileText className="h-4 w-4" />
                        템플릿
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        채널 추가
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
                {[
                    { id: 'channels', label: '채널', icon: Bell },
                    { id: 'settings', label: '설정', icon: Settings },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Channels Tab */}
            {activeTab === 'channels' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">총 채널</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 text-green-600 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <Power className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">활성</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                    <PowerOff className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">비활성</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.inactive}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 text-purple-600 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">총 규칙</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalRules}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Type Distribution */}
                    {Object.keys(stats.byType).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.byType).map(([type, count]) => (
                                <span 
                                    key={type} 
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                        type === 'SLACK' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        type === 'EMAIL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        type === 'WEBHOOK' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                    }`}
                                >
                                    {getChannelIcon(type)}
                                    {type}: {count}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Filters & Bulk Actions */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="채널 검색..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                        >
                            <option value="all">모든 유형</option>
                            <option value="SLACK">Slack</option>
                            <option value="EMAIL">Email</option>
                            <option value="WEBHOOK">Webhook</option>
                            <option value="MATTERMOST">Mattermost</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                        >
                            <option value="all">모든 상태</option>
                            <option value="active">활성</option>
                            <option value="inactive">비활성</option>
                        </select>
                        <button
                            onClick={() => refetch()}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title="새로고침"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Bulk Actions */}
                    {selectedChannels.size > 0 && (
                        <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <span className="text-sm text-blue-700 dark:text-blue-300">{selectedChannels.size}개 선택됨</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkAction('activate')}
                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    활성화
                                </button>
                                <button
                                    onClick={() => handleBulkAction('deactivate')}
                                    className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700"
                                >
                                    비활성화
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    삭제
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedChannels(new Set())}
                                className="ml-auto text-xs text-blue-600 hover:underline"
                            >
                                선택 해제
                            </button>
                        </div>
                    )}

                    {/* Policy Integration Info */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Settings className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-medium text-amber-900 dark:text-amber-200">정책 연동</h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    정책 규칙에서 알림을 활성화하면 정책 위반 시 이 채널로 알림이 발송됩니다.
                                </p>
                                <a
                                    href="/admin/policies"
                                    className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400 hover:underline mt-2"
                                >
                                    정책 관리 바로가기 <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Channel List */}
                    {filteredChannels.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                            <Bell className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                {channels.length === 0 ? '알림 채널이 없습니다' : '검색 결과가 없습니다'}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                {channels.length === 0 ? '이메일, Slack 또는 Webhook 채널을 추가하세요.' : '필터를 변경하거나 검색어를 수정해 보세요.'}
                            </p>
                            {channels.length === 0 && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    <Plus className="h-4 w-4" /> 첫 채널 추가
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Select All */}
                            <div className="flex items-center gap-2 px-2">
                                <input
                                    type="checkbox"
                                    checked={selectedChannels.size === filteredChannels.length && filteredChannels.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded text-red-600"
                                />
                                <span className="text-sm text-slate-500">전체 선택</span>
                            </div>

                            {filteredChannels.map(channel => {
                                const isExpanded = expandedChannels.has(channel.id);
                                const testResult = testResults[channel.id];
                                const isTesting = testingChannels.has(channel.id);
                                const isSelected = selectedChannels.has(channel.id);
                                const color = getChannelColor(channel.type);

                                return (
                                    <div
                                        key={channel.id}
                                        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden transition-all ${
                                            isSelected ? 'border-red-500 ring-1 ring-red-500' :
                                            channel.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'
                                        }`}
                                    >
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectChannel(channel.id)}
                                                        className="w-4 h-4 rounded text-red-600"
                                                    />
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                        color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                                        color === 'purple' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                                                        color === 'orange' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                                                        'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                                                    }`}>
                                                        {getChannelIcon(channel.type)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900 dark:text-white">{channel.name}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-sm text-slate-500 capitalize">{channel.type.toLowerCase()}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-sm text-slate-500">{channel.rules?.length || 0}개 규칙</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleTestChannel(channel.id)}
                                                        disabled={isTesting || !channel.isActive}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                                                    >
                                                        {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                        테스트
                                                    </button>
                                                    <button
                                                        onClick={() => handleCloneChannel(channel)}
                                                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                                                        title="복제"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleChannel(channel)}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${channel.isActive ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                    >
                                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${channel.isActive ? 'translate-x-6' : ''}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteChannel(channel.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {testResult && (
                                                <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                                                    testResult.success
                                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                                }`}>
                                                    {testResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                                    <span className="text-sm">{testResult.message}</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => toggleExpanded(channel.id)}
                                                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            >
                                                <Settings className="h-4 w-4" />
                                                <span>이벤트 규칙 설정</span>
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                                                    알림을 받을 이벤트를 선택하세요
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {eventTypes.map(event => {
                                                        const rule = channel.rules?.find(r => r.eventType === event.id);
                                                        const isEnabled = rule?.isActive ?? false;
                                                        const isUpdating = updateRuleMutation.isPending || addRuleMutation.isPending;

                                                        return (
                                                            <label
                                                                key={event.id}
                                                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                                                                    isEnabled
                                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isEnabled}
                                                                    onChange={() => handleToggleRule(channel, event.id, isEnabled)}
                                                                    disabled={isUpdating}
                                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                                />
                                                                <div>
                                                                    <span className={`text-sm ${isEnabled ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                        {event.label}
                                                                    </span>
                                                                    <span className="block text-xs text-slate-400">{event.category}</span>
                                                                </div>
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
                </>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            쓰로틀링 설정
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            동일한 알림이 반복적으로 발송되는 것을 방지합니다.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">중복 방지 시간</label>
                                <p className="text-xs text-slate-500 mb-2">같은 CVE에 대한 알림 최소 간격</p>
                                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                    <option value="0">중복 방지 안 함</option>
                                    <option value="5">5분</option>
                                    <option value="15">15분</option>
                                    <option value="60">1시간</option>
                                    <option value="1440">24시간</option>
                                </select>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">배치 모드</label>
                                <p className="text-xs text-slate-500 mb-2">여러 알림을 묶어서 발송</p>
                                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                    <option value="immediate">즉시 발송</option>
                                    <option value="hourly">시간별 다이제스트</option>
                                    <option value="daily">일별 다이제스트</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-amber-600" />
                            조용한 시간
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            특정 시간대에는 알림을 보류합니다 (Critical 제외).
                        </p>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 rounded text-amber-600" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">조용한 시간 활성화</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input type="time" defaultValue="22:00" className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                                <span className="text-slate-500">~</span>
                                <input type="time" defaultValue="08:00" className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">채널 템플릿</h3>
                            <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                <XCircle className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {channelTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleApplyTemplate(template)}
                                    className="p-4 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {getChannelIcon(template.type)}
                                        <span className="font-medium text-slate-900 dark:text-white">{template.name}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-2">{template.description}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {template.rules.map(rule => (
                                            <span key={rule} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                                                {eventTypes.find(e => e.id === rule)?.label || rule}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">알림 채널 추가</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">채널 유형</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { type: 'SLACK', label: 'Slack', icon: <MessageSquare className="h-5 w-5" /> },
                                        { type: 'EMAIL', label: '이메일', icon: <Mail className="h-5 w-5" /> },
                                        { type: 'WEBHOOK', label: 'Webhook', icon: <Webhook className="h-5 w-5" /> },
                                        { type: 'MATTERMOST', label: 'Mattermost', icon: <MessageSquare className="h-5 w-5" /> },
                                    ].map(item => (
                                        <button
                                            key={item.type}
                                            onClick={() => setNewChannelType(item.type as typeof newChannelType)}
                                            className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors ${
                                                newChannelType === item.type
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">채널 이름</label>
                                <input
                                    type="text"
                                    value={newChannelName}
                                    onChange={e => setNewChannelName(e.target.value)}
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
                                    onChange={e => setNewChannelConfig(e.target.value)}
                                    placeholder={newChannelType === 'EMAIL' ? 'security@example.com' : 'https://hooks.slack.com/...'}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>

                            {newChannelType === 'EMAIL' && (
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">SMTP 설정 (선택사항)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">SMTP 호스트</label>
                                            <input
                                                type="text"
                                                value={smtpHost}
                                                onChange={e => setSmtpHost(e.target.value)}
                                                placeholder="smtp.example.com"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">포트</label>
                                            <input
                                                type="text"
                                                value={smtpPort}
                                                onChange={e => setSmtpPort(e.target.value)}
                                                placeholder="587"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">사용자명</label>
                                            <input
                                                type="text"
                                                value={smtpUser}
                                                onChange={e => setSmtpUser(e.target.value)}
                                                placeholder="username"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">비밀번호</label>
                                            <input
                                                type="password"
                                                value={smtpPass}
                                                onChange={e => setSmtpPass(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateChannel}
                                disabled={!newChannelName || createMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                추가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
