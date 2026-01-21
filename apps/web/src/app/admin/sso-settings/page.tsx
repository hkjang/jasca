'use client';

import { useState, useEffect } from 'react';
import {
    KeyRound,
    Save,
    Loader2,
    Check,
    X,
    RefreshCw,
    Users,
    Clock,
    AlertCircle,
    CheckCircle,
    Settings,
    TestTube,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface SsoSettings {
    enabled: boolean;
    providers: {
        google: { enabled: boolean; clientId?: string; clientSecret?: string };
        github: { enabled: boolean; clientId?: string; clientSecret?: string };
        microsoft: { enabled: boolean; clientId?: string; clientSecret?: string; tenantId?: string };
        keycloak: { enabled: boolean };
    };
}

interface KeycloakSettings {
    enabled: boolean;
    serverUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    syncEnabled: boolean;
    syncInterval: number;
    autoCreateUsers: boolean;
    autoUpdateUsers: boolean;
    defaultRole: string;
    groupMapping: Record<string, string>;
    lastSyncAt: string | null;
    lastSyncResult: any;
}

const ROLE_OPTIONS = [
    { value: 'SYSTEM_ADMIN', label: '시스템 관리자' },
    { value: 'ORG_ADMIN', label: '조직 관리자' },
    { value: 'SECURITY_ADMIN', label: '보안 관리자' },
    { value: 'PROJECT_ADMIN', label: '프로젝트 관리자' },
    { value: 'DEVELOPER', label: '개발자' },
    { value: 'VIEWER', label: '뷰어' },
];

export default function SsoSettingsPage() {
    const { accessToken } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [ssoSettings, setSsoSettings] = useState<SsoSettings>({
        enabled: false,
        providers: {
            google: { enabled: false, clientId: '', clientSecret: '' },
            github: { enabled: false, clientId: '', clientSecret: '' },
            microsoft: { enabled: false, clientId: '', clientSecret: '', tenantId: '' },
            keycloak: { enabled: false },
        },
    });

    const [keycloakSettings, setKeycloakSettings] = useState<KeycloakSettings>({
        enabled: false,
        serverUrl: '',
        realm: '',
        clientId: '',
        clientSecret: '',
        syncEnabled: false,
        syncInterval: 3600,
        autoCreateUsers: false,
        autoUpdateUsers: true,
        defaultRole: 'VIEWER',
        groupMapping: {},
        lastSyncAt: null,
        lastSyncResult: null,
    });

    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupRole, setNewGroupRole] = useState('VIEWER');

    // Load settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [ssoRes, keycloakRes] = await Promise.all([
                    fetch('/api/settings/sso', {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    fetch('/api/settings/keycloak', {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                ]);

                if (ssoRes.ok) {
                    const data = await ssoRes.json();
                    setSsoSettings(data);
                }
                if (keycloakRes.ok) {
                    const data = await keycloakRes.json();
                    setKeycloakSettings(data);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        if (accessToken) {
            loadSettings();
        }
    }, [accessToken]);

    // Save SSO settings
    const saveSsoSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch('/api/settings/sso', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ value: ssoSettings }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'SSO 설정이 저장되었습니다.' });
            } else {
                throw new Error('저장 실패');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'SSO 설정 저장에 실패했습니다.' });
        } finally {
            setSaving(false);
        }
    };

    // Save Keycloak settings
    const saveKeycloakSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch('/api/settings/keycloak', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ value: keycloakSettings }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Keycloak 설정이 저장되었습니다.' });
            } else {
                throw new Error('저장 실패');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Keycloak 설정 저장에 실패했습니다.' });
        } finally {
            setSaving(false);
        }
    };

    // Test Keycloak connection
    const testKeycloakConnection = async () => {
        setTesting(true);
        setMessage(null);
        try {
            const response = await fetch('/api/settings/keycloak/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(keycloakSettings),
            });

            const result = await response.json();
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '연결 테스트에 실패했습니다.' });
        } finally {
            setTesting(false);
        }
    };

    // Sync Keycloak users
    const syncKeycloakUsers = async () => {
        setSyncing(true);
        setMessage(null);
        try {
            const response = await fetch('/api/settings/keycloak/sync', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const result = await response.json();
            if (result.success) {
                setMessage({
                    type: 'success',
                    text: `동기화 완료: 생성 ${result.result.created}, 업데이트 ${result.result.updated}, 스킵 ${result.result.skipped}`,
                });
                // Update lastSyncAt
                setKeycloakSettings(prev => ({
                    ...prev,
                    lastSyncAt: result.result.syncedAt,
                    lastSyncResult: result.result,
                }));
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '동기화에 실패했습니다.' });
        } finally {
            setSyncing(false);
        }
    };

    // Add group mapping
    const addGroupMapping = () => {
        if (newGroupName.trim()) {
            setKeycloakSettings(prev => ({
                ...prev,
                groupMapping: {
                    ...prev.groupMapping,
                    [newGroupName.trim()]: newGroupRole,
                },
            }));
            setNewGroupName('');
            setNewGroupRole('VIEWER');
        }
    };

    // Remove group mapping
    const removeGroupMapping = (groupName: string) => {
        setKeycloakSettings(prev => {
            const { [groupName]: _, ...rest } = prev.groupMapping;
            return { ...prev, groupMapping: rest };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <KeyRound className="h-7 w-7 text-blue-500" />
                        SSO 로그인 설정
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Single Sign-On 로그인 및 Keycloak 계정 동기화 설정
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`flex items-center gap-2 p-4 rounded-lg ${
                        message.type === 'success'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                    ) : (
                        <AlertCircle className="h-5 w-5" />
                    )}
                    {message.text}
                </div>
            )}

            {/* SSO Global Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        SSO 전역 설정
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* Global Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">SSO 로그인 활성화</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                비활성화시 로그인 페이지에서 SSO 버튼이 표시되지 않습니다
                            </p>
                        </div>
                        <button
                            onClick={() => setSsoSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                ssoSettings.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    ssoSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Provider Settings */}
                    {ssoSettings.enabled && (
                        <div className="space-y-4">
                            <h3 className="font-medium text-slate-900 dark:text-white">SSO Provider 설정</h3>

                            {/* Google */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🔵</span>
                                        <span className="font-medium text-slate-900 dark:text-white">Google</span>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setSsoSettings(prev => ({
                                                ...prev,
                                                providers: {
                                                    ...prev.providers,
                                                    google: { ...prev.providers.google, enabled: !prev.providers.google.enabled },
                                                },
                                            }))
                                        }
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            ssoSettings.providers.google.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                ssoSettings.providers.google.enabled ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {ssoSettings.providers.google.enabled && (
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <input
                                            type="text"
                                            placeholder="Client ID"
                                            value={ssoSettings.providers.google.clientId || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        google: { ...prev.providers.google, clientId: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Client Secret"
                                            value={ssoSettings.providers.google.clientSecret || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        google: { ...prev.providers.google, clientSecret: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* GitHub */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">⚫</span>
                                        <span className="font-medium text-slate-900 dark:text-white">GitHub</span>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setSsoSettings(prev => ({
                                                ...prev,
                                                providers: {
                                                    ...prev.providers,
                                                    github: { ...prev.providers.github, enabled: !prev.providers.github.enabled },
                                                },
                                            }))
                                        }
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            ssoSettings.providers.github.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                ssoSettings.providers.github.enabled ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {ssoSettings.providers.github.enabled && (
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <input
                                            type="text"
                                            placeholder="Client ID"
                                            value={ssoSettings.providers.github.clientId || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        github: { ...prev.providers.github, clientId: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Client Secret"
                                            value={ssoSettings.providers.github.clientSecret || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        github: { ...prev.providers.github, clientSecret: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Microsoft */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🟦</span>
                                        <span className="font-medium text-slate-900 dark:text-white">Microsoft</span>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setSsoSettings(prev => ({
                                                ...prev,
                                                providers: {
                                                    ...prev.providers,
                                                    microsoft: { ...prev.providers.microsoft, enabled: !prev.providers.microsoft.enabled },
                                                },
                                            }))
                                        }
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            ssoSettings.providers.microsoft.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                ssoSettings.providers.microsoft.enabled ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {ssoSettings.providers.microsoft.enabled && (
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                        <input
                                            type="text"
                                            placeholder="Client ID"
                                            value={ssoSettings.providers.microsoft.clientId || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        microsoft: { ...prev.providers.microsoft, clientId: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Client Secret"
                                            value={ssoSettings.providers.microsoft.clientSecret || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        microsoft: { ...prev.providers.microsoft, clientSecret: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Tenant ID"
                                            value={ssoSettings.providers.microsoft.tenantId || ''}
                                            onChange={e =>
                                                setSsoSettings(prev => ({
                                                    ...prev,
                                                    providers: {
                                                        ...prev.providers,
                                                        microsoft: { ...prev.providers.microsoft, tenantId: e.target.value },
                                                    },
                                                }))
                                            }
                                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Keycloak Toggle */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🔐</span>
                                        <span className="font-medium text-slate-900 dark:text-white">Keycloak</span>
                                        <span className="text-xs text-slate-500">(아래에서 상세 설정)</span>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setSsoSettings(prev => ({
                                                ...prev,
                                                providers: {
                                                    ...prev.providers,
                                                    keycloak: { enabled: !prev.providers.keycloak.enabled },
                                                },
                                            }))
                                        }
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            ssoSettings.providers.keycloak.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                ssoSettings.providers.keycloak.enabled ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={saveSsoSettings}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            SSO 설정 저장
                        </button>
                    </div>
                </div>
            </div>

            {/* Keycloak Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">🔐</span>
                        Keycloak 상세 설정
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Keycloak 연동 활성화</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Keycloak OIDC 인증 및 계정 동기화 활성화
                            </p>
                        </div>
                        <button
                            onClick={() => setKeycloakSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                keycloakSettings.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    keycloakSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {keycloakSettings.enabled && (
                        <>
                            {/* Connection Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white">서버 연결 설정</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            서버 URL
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="https://keycloak.example.com"
                                            value={keycloakSettings.serverUrl}
                                            onChange={e => setKeycloakSettings(prev => ({ ...prev, serverUrl: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Realm
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="master"
                                            value={keycloakSettings.realm}
                                            onChange={e => setKeycloakSettings(prev => ({ ...prev, realm: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Client ID
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="jasca-client"
                                            value={keycloakSettings.clientId}
                                            onChange={e => setKeycloakSettings(prev => ({ ...prev, clientId: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Client Secret
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={keycloakSettings.clientSecret}
                                            onChange={e => setKeycloakSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={testKeycloakConnection}
                                        disabled={testing}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                                    >
                                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                                        연결 테스트
                                    </button>
                                </div>
                            </div>

                            {/* Sync Settings */}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    계정 동기화 설정
                                </h3>

                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">계정 동기화 활성화</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Keycloak 사용자를 JASCA에 자동 동기화
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setKeycloakSettings(prev => ({ ...prev, syncEnabled: !prev.syncEnabled }))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            keycloakSettings.syncEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                keycloakSettings.syncEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {keycloakSettings.syncEnabled && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    동기화 주기 (초)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={keycloakSettings.syncInterval}
                                                    onChange={e =>
                                                        setKeycloakSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) || 3600 }))
                                                    }
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    기본 역할
                                                </label>
                                                <select
                                                    value={keycloakSettings.defaultRole}
                                                    onChange={e => setKeycloakSettings(prev => ({ ...prev, defaultRole: e.target.value }))}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                                >
                                                    {ROLE_OPTIONS.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-end gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={keycloakSettings.autoCreateUsers}
                                                        onChange={e =>
                                                            setKeycloakSettings(prev => ({ ...prev, autoCreateUsers: e.target.checked }))
                                                        }
                                                        className="w-4 h-4 rounded"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">자동 생성</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={keycloakSettings.autoUpdateUsers}
                                                        onChange={e =>
                                                            setKeycloakSettings(prev => ({ ...prev, autoUpdateUsers: e.target.checked }))
                                                        }
                                                        className="w-4 h-4 rounded"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">자동 업데이트</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Group Mapping */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                그룹 → 역할 매핑
                                            </h4>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Keycloak 그룹 이름"
                                                    value={newGroupName}
                                                    onChange={e => setNewGroupName(e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                                />
                                                <select
                                                    value={newGroupRole}
                                                    onChange={e => setNewGroupRole(e.target.value)}
                                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                                >
                                                    {ROLE_OPTIONS.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={addGroupMapping}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                                >
                                                    추가
                                                </button>
                                            </div>
                                            {Object.entries(keycloakSettings.groupMapping).length > 0 && (
                                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-slate-50 dark:bg-slate-900">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                    Keycloak 그룹
                                                                </th>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                    JASCA 역할
                                                                </th>
                                                                <th className="px-4 py-2 w-16"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.entries(keycloakSettings.groupMapping).map(([group, role]) => (
                                                                <tr key={group} className="border-t border-slate-200 dark:border-slate-700">
                                                                    <td className="px-4 py-2 text-slate-900 dark:text-white">{group}</td>
                                                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                                                        {ROLE_OPTIONS.find(r => r.value === role)?.label || role}
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <button
                                                                            onClick={() => removeGroupMapping(group)}
                                                                            className="text-red-500 hover:text-red-700"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sync Status */}
                                        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                            <div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                                    마지막 동기화:{' '}
                                                    {keycloakSettings.lastSyncAt
                                                        ? new Date(keycloakSettings.lastSyncAt).toLocaleString('ko-KR')
                                                        : '없음'}
                                                </p>
                                                {keycloakSettings.lastSyncResult && (
                                                    <p className="text-xs text-slate-500">
                                                        생성 {keycloakSettings.lastSyncResult.created} / 업데이트{' '}
                                                        {keycloakSettings.lastSyncResult.updated} / 스킵 {keycloakSettings.lastSyncResult.skipped}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={syncKeycloakUsers}
                                                disabled={syncing}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
                                            >
                                                {syncing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                수동 동기화
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 pt-6">
                        <button
                            onClick={saveKeycloakSettings}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Keycloak 설정 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
