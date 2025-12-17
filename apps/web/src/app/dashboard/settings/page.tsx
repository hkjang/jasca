'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/auth-api';

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
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

    const handleSaveNotifications = () => {
        setIsSaving(true);
        // Simulate saving
        setTimeout(() => {
            setIsSaving(false);
            setMessage({ type: 'success', text: '알림 설정이 저장되었습니다.' });
        }, 500);
    };

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
                </div>
            </div>
        </div>
    );
}
