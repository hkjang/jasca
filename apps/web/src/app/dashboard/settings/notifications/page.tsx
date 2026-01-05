'use client';

import { useState } from 'react';
import { 
    Bell, 
    Mail, 
    MessageSquare, 
    ArrowLeft, 
    Save, 
    CheckCircle,
    AlertTriangle,
    Shield,
    Loader2 
} from 'lucide-react';
import Link from 'next/link';

interface NotificationSettings {
    email: {
        enabled: boolean;
        criticalVulnerabilities: boolean;
        highVulnerabilities: boolean;
        scanComplete: boolean;
        policyViolations: boolean;
        weeklyDigest: boolean;
    };
    slack: {
        enabled: boolean;
        webhookUrl: string;
        channel: string;
        criticalOnly: boolean;
    };
    inApp: {
        enabled: boolean;
        showBadge: boolean;
        playSound: boolean;
    };
}

export default function NotificationSettingsPage() {
    const [settings, setSettings] = useState<NotificationSettings>({
        email: {
            enabled: true,
            criticalVulnerabilities: true,
            highVulnerabilities: true,
            scanComplete: true,
            policyViolations: true,
            weeklyDigest: true,
        },
        slack: {
            enabled: false,
            webhookUrl: '',
            channel: '#security-alerts',
            criticalOnly: true,
        },
        inApp: {
            enabled: true,
            showBadge: true,
            playSound: false,
        },
    });
    
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const updateEmailSetting = (key: keyof NotificationSettings['email'], value: boolean) => {
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

    const updateInAppSetting = (key: keyof NotificationSettings['inApp'], value: boolean) => {
        setSettings(prev => ({
            ...prev,
            inApp: { ...prev.inApp, [key]: value }
        }));
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        설정으로 돌아가기
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Bell className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">알림 설정</h1>
                            <p className="text-slate-400">알림 채널과 이벤트 유형을 설정합니다.</p>
                        </div>
                    </div>
                </div>

                {/* Email Notifications */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">이메일 알림</h2>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.email.enabled}
                                onChange={(e) => updateEmailSetting('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {settings.email.enabled && (
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            {[
                                { key: 'criticalVulnerabilities', label: 'Critical 취약점 발견', icon: AlertTriangle, iconColor: 'text-red-400' },
                                { key: 'highVulnerabilities', label: 'High 취약점 발견', icon: AlertTriangle, iconColor: 'text-orange-400' },
                                { key: 'scanComplete', label: '스캔 완료', icon: CheckCircle, iconColor: 'text-green-400' },
                                { key: 'policyViolations', label: '정책 위반', icon: Shield, iconColor: 'text-yellow-400' },
                                { key: 'weeklyDigest', label: '주간 요약 리포트', icon: Mail, iconColor: 'text-blue-400' },
                            ].map(({ key, label, icon: Icon, iconColor }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Icon className={`h-4 w-4 ${iconColor}`} />
                                        <span className="text-slate-300">{label}</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.email[key as keyof typeof settings.email] as boolean}
                                            onChange={(e) => updateEmailSetting(key as keyof typeof settings.email, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Slack Notifications */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">Slack 알림</h2>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.slack.enabled}
                                onChange={(e) => updateSlackSetting('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {settings.slack.enabled && (
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Webhook URL
                                </label>
                                <input
                                    type="url"
                                    value={settings.slack.webhookUrl}
                                    onChange={(e) => updateSlackSetting('webhookUrl', e.target.value)}
                                    placeholder="https://hooks.slack.com/services/..."
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    채널
                                </label>
                                <input
                                    type="text"
                                    value={settings.slack.channel}
                                    onChange={(e) => updateSlackSetting('channel', e.target.value)}
                                    placeholder="#security-alerts"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">Critical 알림만 전송</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.slack.criticalOnly}
                                        onChange={(e) => updateSlackSetting('criticalOnly', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* In-App Notifications */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">앱 내 알림</h2>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.inApp.enabled}
                                onChange={(e) => updateInAppSetting('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {settings.inApp.enabled && (
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">읽지 않은 알림 배지 표시</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.inApp.showBadge}
                                        onChange={(e) => updateInAppSetting('showBadge', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">알림 소리 재생</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.inApp.playSound}
                                        onChange={(e) => updateInAppSetting('playSound', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                    {saved && (
                        <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="h-5 w-5" />
                            <span>저장되었습니다</span>
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
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
