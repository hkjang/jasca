'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    User,
    Lock,
    Bell,
    Moon,
    Sun,
    Globe,
    Save,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Link2,
    Shield,
    ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/auth-api';

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'integrations'>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Notification settings state
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        criticalOnly: false,
        weeklyDigest: true,
    });

    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            setMessage({ type: 'error', text: '비밀번호는 8자 이상이어야 합니다.' });
            return;
        }

        setIsSaving(true);
        try {
            await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!profileForm.name.trim()) {
            setMessage({ type: 'error', text: '이름을 입력해주세요.' });
            return;
        }

        setIsSaving(true);
        try {
            await authApi.updateProfile({ name: profileForm.name });
            setMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '프로필 저장에 실패했습니다.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        setIsSaving(true);
        try {
            await authApi.updateNotificationSettings(notifications);
            setMessage({ type: 'success', text: '알림 설정이 저장되었습니다.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '알림 설정 저장에 실패했습니다.' });
        } finally {
            setIsSaving(false);
        }
    };

    // Load notification settings on mount
    useEffect(() => {
        const loadNotificationSettings = async () => {
            try {
                const settings = await authApi.getNotificationSettings();
                setNotifications(settings);
            } catch (error) {
                console.error('Failed to load notification settings:', error);
            }
        };
        loadNotificationSettings();
    }, []);

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        // Apply theme
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    const tabs = [
        { id: 'profile', label: '프로필', icon: User },
        { id: 'security', label: '보안', icon: Lock },
        { id: 'notifications', label: '알림', icon: Bell },
        { id: 'integrations', label: '연동 가이드', icon: Link2 },
    ] as const;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">설정</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    계정 설정 및 환경설정을 관리합니다.
                </p>
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                    ) : (
                        <AlertTriangle className="h-5 w-5" />
                    )}
                    {message.text}
                    <button
                        onClick={() => setMessage(null)}
                        className="ml-auto text-current opacity-60 hover:opacity-100"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    이름
                                </label>
                                <input
                                    type="text"
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    value={profileForm.email}
                                    disabled
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                                />
                                <p className="text-sm text-slate-500 mt-1">이메일은 변경할 수 없습니다.</p>
                            </div>

                            {/* Theme */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    테마
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'light', label: '라이트', icon: Sun },
                                        { id: 'dark', label: '다크', icon: Moon },
                                        { id: 'system', label: '시스템', icon: Globe },
                                    ].map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleThemeChange(option.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${theme === option.id
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <option.icon className="h-4 w-4" />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                프로필 저장
                            </button>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                비밀번호 변경
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    현재 비밀번호
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    새 비밀번호
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    새 비밀번호 확인
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                onClick={handlePasswordChange}
                                disabled={isSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                비밀번호 변경
                            </button>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                알림 설정
                            </h3>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">이메일 알림</p>
                                        <p className="text-sm text-slate-500">새로운 취약점 발견 시 이메일로 알림을 받습니다.</p>
                                    </div>
                                    <button
                                        onClick={() => setNotifications(prev => ({ ...prev, emailAlerts: !prev.emailAlerts }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${notifications.emailAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                    >
                                        <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${notifications.emailAlerts ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">Critical만 알림</p>
                                        <p className="text-sm text-slate-500">Critical 심각도 취약점만 알림을 받습니다.</p>
                                    </div>
                                    <button
                                        onClick={() => setNotifications(prev => ({ ...prev, criticalOnly: !prev.criticalOnly }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${notifications.criticalOnly ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                    >
                                        <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${notifications.criticalOnly ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">주간 요약</p>
                                        <p className="text-sm text-slate-500">매주 취약점 현황 요약 이메일을 받습니다.</p>
                                    </div>
                                    <button
                                        onClick={() => setNotifications(prev => ({ ...prev, weeklyDigest: !prev.weeklyDigest }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${notifications.weeklyDigest ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                    >
                                        <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${notifications.weeklyDigest ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </label>
                            </div>
                            <button
                                onClick={handleSaveNotifications}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                설정 저장
                            </button>
                        </div>
                    )}

                    {/* Integrations Tab */}
                    {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                연동 가이드
                            </h3>
                            <p className="text-sm text-slate-500">
                                외부 도구와 JASCA를 연동하는 방법을 안내합니다.
                            </p>

                            {/* Trivy Integration Card */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Shield className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                                            Trivy 결과 전송 가이드
                                        </h4>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Trivy 취약점 스캐너 결과를 JASCA로 전송하는 방법을 안내합니다.
                                            이미지 스캔, 파일 시스템 스캔, Config 스캔 등 다양한 스캔 유형을 지원합니다.
                                        </p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                CI/CD 연동
                                            </span>
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                JSON/SARIF 지원
                                            </span>
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                GitLab CI
                                            </span>
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                Bitbucket
                                            </span>
                                        </div>
                                        <Link
                                            href="/dashboard/settings/trivy-guide"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            가이드 보기
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Future Integrations Placeholder */}
                            <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    더 많은 연동 가이드가 곧 추가될 예정입니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
