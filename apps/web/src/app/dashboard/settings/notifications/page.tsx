'use client';

import { useState, useEffect } from 'react';
import { 
    Bell, 
    Mail, 
    MessageSquare, 
    ArrowLeft, 
    Save, 
    CheckCircle,
    AlertTriangle,
    Shield,
    Loader2,
    Webhook,
    Clock,
    Volume2,
    VolumeX,
    Send,
    TestTube,
    Moon,
    Sun,
    Zap,
    Calendar,
    ChevronDown,
    Info,
} from 'lucide-react';
import Link from 'next/link';

interface NotificationSettings {
    email: {
        enabled: boolean;
        criticalVulnerabilities: boolean;
        highVulnerabilities: boolean;
        mediumVulnerabilities: boolean;
        scanComplete: boolean;
        policyViolations: boolean;
        weeklyDigest: boolean;
        frequency: 'instant' | 'daily' | 'weekly';
    };
    slack: {
        enabled: boolean;
        webhookUrl: string;
        channel: string;
        criticalOnly: boolean;
        mentionOnCritical: boolean;
    };
    webhook: {
        enabled: boolean;
        url: string;
        secret: string;
        events: string[];
    };
    inApp: {
        enabled: boolean;
        showBadge: boolean;
        playSound: boolean;
        desktopNotifications: boolean;
    };
    quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        timezone: string;
    };
}

const SEVERITY_OPTIONS = [
    { key: 'criticalVulnerabilities', label: 'Critical 취약점', icon: AlertTriangle, iconColor: 'text-red-400', description: '심각한 보안 위협' },
    { key: 'highVulnerabilities', label: 'High 취약점', icon: AlertTriangle, iconColor: 'text-orange-400', description: '높은 위험도' },
    { key: 'mediumVulnerabilities', label: 'Medium 취약점', icon: Shield, iconColor: 'text-yellow-400', description: '중간 위험도' },
    { key: 'scanComplete', label: '스캔 완료', icon: CheckCircle, iconColor: 'text-green-400', description: '스캔 작업 완료 시' },
    { key: 'policyViolations', label: '정책 위반', icon: Shield, iconColor: 'text-purple-400', description: '보안 정책 위반 감지' },
    { key: 'weeklyDigest', label: '주간 요약 리포트', icon: Calendar, iconColor: 'text-blue-400', description: '매주 취약점 현황 요약' },
];

const FREQUENCY_OPTIONS = [
    { value: 'instant' as const, label: '즉시', description: '이벤트 발생 즉시 알림', icon: Zap },
    { value: 'daily' as const, label: '일일 요약', description: '하루에 한 번 요약', icon: Sun },
    { value: 'weekly' as const, label: '주간 요약', description: '일주일에 한 번 요약', icon: Calendar },
];

export default function NotificationSettingsPage() {
    const [settings, setSettings] = useState<NotificationSettings>({
        email: {
            enabled: true,
            criticalVulnerabilities: true,
            highVulnerabilities: true,
            mediumVulnerabilities: false,
            scanComplete: true,
            policyViolations: true,
            weeklyDigest: true,
            frequency: 'instant',
        },
        slack: {
            enabled: false,
            webhookUrl: '',
            channel: '#security-alerts',
            criticalOnly: true,
            mentionOnCritical: true,
        },
        webhook: {
            enabled: false,
            url: '',
            secret: '',
            events: ['critical_vuln', 'policy_violation'],
        },
        inApp: {
            enabled: true,
            showBadge: true,
            playSound: false,
            desktopNotifications: false,
        },
        quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Seoul',
        },
    });
    
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('email');

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleTestNotification = async (channel: string) => {
        setTesting(channel);
        setTestResult(null);

        // Simulate sending test notification
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Random success/failure for demo
        if (Math.random() > 0.2) {
            setTestResult({ type: 'success', message: '테스트 알림이 성공적으로 전송되었습니다!' });
        } else {
            setTestResult({ type: 'error', message: '알림 전송에 실패했습니다. 설정을 확인해주세요.' });
        }
        
        setTesting(null);
    };

    const updateEmailSetting = (key: keyof NotificationSettings['email'], value: boolean | string) => {
        setSettings(prev => ({
            ...prev,
            email: { ...prev.email, [key]: value }
        }));
    };

    const updateSlackSetting = (key: keyof NotificationSettings['slack'], value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            slack: { ...prev.slack, [key]: value }
        }));
    };

    const updateWebhookSetting = (key: keyof NotificationSettings['webhook'], value: string | boolean | string[]) => {
        setSettings(prev => ({
            ...prev,
            webhook: { ...prev.webhook, [key]: value }
        }));
    };

    const updateInAppSetting = (key: keyof NotificationSettings['inApp'], value: boolean) => {
        setSettings(prev => ({
            ...prev,
            inApp: { ...prev.inApp, [key]: value }
        }));
    };

    const updateQuietHoursSetting = (key: keyof NotificationSettings['quietHours'], value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            quietHours: { ...prev.quietHours, [key]: value }
        }));
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        설정으로 돌아가기
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <Bell className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">알림 설정</h1>
                            <p className="text-slate-500 dark:text-slate-400">알림 채널과 이벤트 유형을 세부적으로 설정합니다.</p>
                        </div>
                    </div>
                </div>

                {/* Test Result Toast */}
                {testResult && (
                    <div className={`mb-6 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-200 ${
                        testResult.type === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                        <div className="flex items-center gap-3">
                            {testResult.type === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            )}
                            <p className={testResult.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                {testResult.message}
                            </p>
                            <button 
                                onClick={() => setTestResult(null)} 
                                className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {/* Email Notifications */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('email')}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">이메일 알림</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">이메일로 보안 알림을 받습니다</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={settings.email.enabled}
                                    onChange={(e) => updateEmailSetting('enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedSection === 'email' ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {expandedSection === 'email' && settings.email.enabled && (
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700">
                            {/* Frequency */}
                            <div className="py-4 border-b border-slate-100 dark:border-slate-700/50">
                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">알림 빈도</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {FREQUENCY_OPTIONS.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = settings.email.frequency === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => updateEmailSetting('frequency', option.value)}
                                                className={`p-4 rounded-xl border text-left transition-all ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <Icon className={`h-5 w-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                                                <p className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {option.label}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{option.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Event Types */}
                            <div className="py-4 space-y-3">
                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">이벤트 유형</h3>
                                {SEVERITY_OPTIONS.map(({ key, label, icon: Icon, iconColor, description }) => (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Icon className={`h-5 w-5 ${iconColor}`} />
                                            <div>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                                                <p className="text-xs text-slate-500 dark:text-slate-500">{description}</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.email[key as keyof typeof settings.email] as boolean}
                                                onChange={(e) => updateEmailSetting(key as keyof typeof settings.email, e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Test Button */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <button
                                    onClick={() => handleTestNotification('email')}
                                    disabled={testing === 'email'}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    {testing === 'email' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    테스트 알림 발송
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Slack Notifications */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('slack')}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Slack 알림</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Slack 채널로 알림을 전송합니다</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={settings.slack.enabled}
                                    onChange={(e) => updateSlackSetting('enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedSection === 'slack' ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {expandedSection === 'slack' && settings.slack.enabled && (
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700 space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Webhook URL
                                </label>
                                <input
                                    type="url"
                                    value={settings.slack.webhookUrl}
                                    onChange={(e) => updateSlackSetting('webhookUrl', e.target.value)}
                                    placeholder="https://hooks.slack.com/services/..."
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    채널
                                </label>
                                <input
                                    type="text"
                                    value={settings.slack.channel}
                                    onChange={(e) => updateSlackSetting('channel', e.target.value)}
                                    placeholder="#security-alerts"
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <div>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Critical 알림만 전송</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-500">Critical 취약점만 Slack으로 알림</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.slack.criticalOnly}
                                        onChange={(e) => updateSlackSetting('criticalOnly', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <div>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Critical 멘션</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-500">Critical 알림 시 @channel 멘션</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.slack.mentionOnCritical}
                                        onChange={(e) => updateSlackSetting('mentionOnCritical', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {/* Test Button */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <button
                                    onClick={() => handleTestNotification('slack')}
                                    disabled={testing === 'slack' || !settings.slack.webhookUrl}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    {testing === 'slack' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    테스트 알림 발송
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Webhook Notifications */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('webhook')}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Webhook className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Webhook</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">커스텀 웹훅으로 알림을 전송합니다</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={settings.webhook.enabled}
                                    onChange={(e) => updateWebhookSetting('enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedSection === 'webhook' ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {expandedSection === 'webhook' && settings.webhook.enabled && (
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700 space-y-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Webhook URL
                                </label>
                                <input
                                    type="url"
                                    value={settings.webhook.url}
                                    onChange={(e) => updateWebhookSetting('url', e.target.value)}
                                    placeholder="https://your-server.com/webhook"
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    시크릿 키 (선택)
                                </label>
                                <input
                                    type="password"
                                    value={settings.webhook.secret}
                                    onChange={(e) => updateWebhookSetting('secret', e.target.value)}
                                    placeholder="HMAC 서명용 시크릿"
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* In-App Notifications */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('inApp')}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">앱 내 알림</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">대시보드 내에서 알림을 받습니다</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={settings.inApp.enabled}
                                    onChange={(e) => updateInAppSetting('enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedSection === 'inApp' ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {expandedSection === 'inApp' && settings.inApp.enabled && (
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700 space-y-4 pt-4">
                            {[
                                { key: 'showBadge', label: '읽지 않은 알림 배지 표시', description: '헤더에 읽지 않은 알림 수 표시', icon: Bell },
                                { key: 'playSound', label: '알림 소리 재생', description: '새 알림 시 소리로 알림', icon: settings.inApp.playSound ? Volume2 : VolumeX },
                                { key: 'desktopNotifications', label: '데스크톱 알림', description: '브라우저 알림 사용', icon: Info },
                            ].map(({ key, label, description, icon: Icon }) => (
                                <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-500">{description}</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.inApp[key as keyof typeof settings.inApp] as boolean}
                                            onChange={(e) => updateInAppSetting(key as keyof typeof settings.inApp, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quiet Hours */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-6 overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('quietHours')}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">방해 금지 시간</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">특정 시간대에 알림을 끕니다</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={settings.quietHours.enabled}
                                    onChange={(e) => updateQuietHoursSetting('enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expandedSection === 'quietHours' ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {expandedSection === 'quietHours' && settings.quietHours.enabled && (
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        시작 시간
                                    </label>
                                    <input
                                        type="time"
                                        value={settings.quietHours.startTime}
                                        onChange={(e) => updateQuietHoursSetting('startTime', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        종료 시간
                                    </label>
                                    <input
                                        type="time"
                                        value={settings.quietHours.endTime}
                                        onChange={(e) => updateQuietHoursSetting('endTime', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                이 시간대에는 Critical 알림을 제외한 모든 알림이 음소거됩니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                    {saved && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-in fade-in duration-200">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">저장되었습니다</span>
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-600/50 disabled:to-indigo-600/50 text-white rounded-lg transition-all shadow-lg shadow-blue-500/25"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                설정 저장
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
