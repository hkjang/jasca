'use client';

import { useState, useEffect } from 'react';
import {
    KeyRound,
    Save,
    Loader2,
    X,
    RefreshCw,
    Users,
    AlertCircle,
    CheckCircle,
    Settings,
    TestTube,
    Server,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface SsoSettings {
    enabled: boolean;
    providers: {
        google: { enabled: boolean; clientId?: string; clientSecret?: string };
        github: { enabled: boolean; clientId?: string; clientSecret?: string };
        microsoft: { enabled: boolean; clientId?: string; clientSecret?: string; tenantId?: string };
        keycloak: { enabled: boolean };
        ldap: { enabled: boolean };
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

interface LdapSettings {
    enabled: boolean;
    serverUrl: string;
    bindDn: string;
    bindPassword: string;
    baseDn: string;
    userSearchBase: string;
    userSearchFilter: string;
    usernameAttribute: string;
    emailAttribute: string;
    nameAttribute: string;
    groupSearchBase: string;
    groupSearchFilter: string;
    groupMemberAttribute: string;
    useTls: boolean;
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

const DEFAULT_SSO_SETTINGS: SsoSettings = {
    enabled: false,
    providers: {
        google: { enabled: false, clientId: '', clientSecret: '' },
        github: { enabled: false, clientId: '', clientSecret: '' },
        microsoft: { enabled: false, clientId: '', clientSecret: '', tenantId: '' },
        keycloak: { enabled: false },
        ldap: { enabled: false },
    },
};

const DEFAULT_KEYCLOAK_SETTINGS: KeycloakSettings = {
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
};

const DEFAULT_LDAP_SETTINGS: LdapSettings = {
    enabled: false,
    serverUrl: '',
    bindDn: '',
    bindPassword: '',
    baseDn: '',
    userSearchBase: '',
    userSearchFilter: '(objectClass=inetOrgPerson)',
    usernameAttribute: 'uid',
    emailAttribute: 'mail',
    nameAttribute: 'cn',
    groupSearchBase: '',
    groupSearchFilter: '(objectClass=groupOfNames)',
    groupMemberAttribute: 'member',
    useTls: false,
    syncEnabled: false,
    syncInterval: 3600,
    autoCreateUsers: false,
    autoUpdateUsers: true,
    defaultRole: 'VIEWER',
    groupMapping: {},
    lastSyncAt: null,
    lastSyncResult: null,
};

export default function SsoSettingsPage() {
    const { accessToken } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingKeycloak, setTestingKeycloak] = useState(false);
    const [testingLdap, setTestingLdap] = useState(false);
    const [syncingKeycloak, setSyncingKeycloak] = useState(false);
    const [syncingLdap, setSyncingLdap] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [ssoSettings, setSsoSettings] = useState<SsoSettings>(DEFAULT_SSO_SETTINGS);
    const [keycloakSettings, setKeycloakSettings] = useState<KeycloakSettings>(DEFAULT_KEYCLOAK_SETTINGS);
    const [ldapSettings, setLdapSettings] = useState<LdapSettings>(DEFAULT_LDAP_SETTINGS);

    // Group mapping inputs
    const [newKcGroupName, setNewKcGroupName] = useState('');
    const [newKcGroupRole, setNewKcGroupRole] = useState('VIEWER');
    const [newLdapGroupName, setNewLdapGroupName] = useState('');
    const [newLdapGroupRole, setNewLdapGroupRole] = useState('VIEWER');

    // Load settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [ssoRes, keycloakRes, ldapRes] = await Promise.all([
                    fetch('/api/settings/sso', { headers: { Authorization: `Bearer ${accessToken}` } }),
                    fetch('/api/settings/keycloak', { headers: { Authorization: `Bearer ${accessToken}` } }),
                    fetch('/api/settings/ldap', { headers: { Authorization: `Bearer ${accessToken}` } }),
                ]);

                if (ssoRes.ok) setSsoSettings(await ssoRes.json());
                if (keycloakRes.ok) setKeycloakSettings(await keycloakRes.json());
                if (ldapRes.ok) setLdapSettings(await ldapRes.json());
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        if (accessToken) loadSettings();
    }, [accessToken]);

    // Save functions
    const saveSsoSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/sso', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ value: ssoSettings }),
            });
            if (res.ok) setMessage({ type: 'success', text: 'SSO 설정이 저장되었습니다.' });
            else throw new Error();
        } catch { setMessage({ type: 'error', text: 'SSO 설정 저장에 실패했습니다.' }); }
        finally { setSaving(false); }
    };

    const saveKeycloakSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/keycloak', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ value: keycloakSettings }),
            });
            if (res.ok) setMessage({ type: 'success', text: 'Keycloak 설정이 저장되었습니다.' });
            else throw new Error();
        } catch { setMessage({ type: 'error', text: 'Keycloak 설정 저장에 실패했습니다.' }); }
        finally { setSaving(false); }
    };

    const saveLdapSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/ldap', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ value: ldapSettings }),
            });
            if (res.ok) setMessage({ type: 'success', text: 'LDAP 설정이 저장되었습니다.' });
            else throw new Error();
        } catch { setMessage({ type: 'error', text: 'LDAP 설정 저장에 실패했습니다.' }); }
        finally { setSaving(false); }
    };

    // Test connections
    const testKeycloakConnection = async () => {
        setTestingKeycloak(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/keycloak/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(keycloakSettings),
            });
            const result = await res.json();
            setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch { setMessage({ type: 'error', text: '연결 테스트에 실패했습니다.' }); }
        finally { setTestingKeycloak(false); }
    };

    const testLdapConnection = async () => {
        setTestingLdap(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/ldap/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(ldapSettings),
            });
            const result = await res.json();
            setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch { setMessage({ type: 'error', text: '연결 테스트에 실패했습니다.' }); }
        finally { setTestingLdap(false); }
    };

    // Sync users
    const syncKeycloakUsers = async () => {
        setSyncingKeycloak(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/keycloak/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const result = await res.json();
            if (result.success) {
                setMessage({ type: 'success', text: `동기화 완료: 생성 ${result.result.created}, 업데이트 ${result.result.updated}, 스킵 ${result.result.skipped}` });
                setKeycloakSettings(prev => ({ ...prev, lastSyncAt: result.result.syncedAt, lastSyncResult: result.result }));
            } else setMessage({ type: 'error', text: result.message });
        } catch { setMessage({ type: 'error', text: '동기화에 실패했습니다.' }); }
        finally { setSyncingKeycloak(false); }
    };

    const syncLdapUsers = async () => {
        setSyncingLdap(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings/ldap/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const result = await res.json();
            if (result.success) {
                setMessage({ type: 'success', text: `동기화 완료: 생성 ${result.result.created}, 업데이트 ${result.result.updated}, 스킵 ${result.result.skipped}` });
                setLdapSettings(prev => ({ ...prev, lastSyncAt: result.result.syncedAt, lastSyncResult: result.result }));
            } else setMessage({ type: 'error', text: result.message });
        } catch { setMessage({ type: 'error', text: '동기화에 실패했습니다.' }); }
        finally { setSyncingLdap(false); }
    };

    // Group mapping helpers
    const addKcGroupMapping = () => {
        if (newKcGroupName.trim()) {
            setKeycloakSettings(prev => ({ ...prev, groupMapping: { ...prev.groupMapping, [newKcGroupName.trim()]: newKcGroupRole } }));
            setNewKcGroupName('');
            setNewKcGroupRole('VIEWER');
        }
    };

    const removeKcGroupMapping = (group: string) => {
        setKeycloakSettings(prev => {
            const { [group]: _, ...rest } = prev.groupMapping;
            return { ...prev, groupMapping: rest };
        });
    };

    const addLdapGroupMapping = () => {
        if (newLdapGroupName.trim()) {
            setLdapSettings(prev => ({ ...prev, groupMapping: { ...prev.groupMapping, [newLdapGroupName.trim()]: newLdapGroupRole } }));
            setNewLdapGroupName('');
            setNewLdapGroupRole('VIEWER');
        }
    };

    const removeLdapGroupMapping = (group: string) => {
        setLdapSettings(prev => {
            const { [group]: _, ...rest } = prev.groupMapping;
            return { ...prev, groupMapping: rest };
        });
    };

    // Toggle component
    const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

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
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <KeyRound className="h-7 w-7 text-blue-500" />
                    SSO 로그인 설정
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Single Sign-On, Keycloak, LDAP 계정 동기화 설정
                </p>
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                    {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
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
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">SSO 로그인 활성화</p>
                            <p className="text-sm text-slate-500">비활성화시 로그인 페이지에서 SSO 버튼이 표시되지 않습니다</p>
                        </div>
                        <Toggle enabled={ssoSettings.enabled} onChange={() => setSsoSettings(prev => ({ ...prev, enabled: !prev.enabled }))} />
                    </div>

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
                                    <Toggle enabled={ssoSettings.providers.google.enabled} onChange={() => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, google: { ...prev.providers.google, enabled: !prev.providers.google.enabled } } }))} />
                                </div>
                                {ssoSettings.providers.google.enabled && (
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <input type="text" placeholder="Client ID" value={ssoSettings.providers.google.clientId || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, google: { ...prev.providers.google, clientId: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                        <input type="password" placeholder="Client Secret" value={ssoSettings.providers.google.clientSecret || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, google: { ...prev.providers.google, clientSecret: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
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
                                    <Toggle enabled={ssoSettings.providers.github.enabled} onChange={() => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, github: { ...prev.providers.github, enabled: !prev.providers.github.enabled } } }))} />
                                </div>
                                {ssoSettings.providers.github.enabled && (
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <input type="text" placeholder="Client ID" value={ssoSettings.providers.github.clientId || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, github: { ...prev.providers.github, clientId: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                        <input type="password" placeholder="Client Secret" value={ssoSettings.providers.github.clientSecret || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, github: { ...prev.providers.github, clientSecret: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
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
                                    <Toggle enabled={ssoSettings.providers.microsoft.enabled} onChange={() => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, microsoft: { ...prev.providers.microsoft, enabled: !prev.providers.microsoft.enabled } } }))} />
                                </div>
                                {ssoSettings.providers.microsoft.enabled && (
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                        <input type="text" placeholder="Client ID" value={ssoSettings.providers.microsoft.clientId || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, microsoft: { ...prev.providers.microsoft, clientId: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                        <input type="password" placeholder="Client Secret" value={ssoSettings.providers.microsoft.clientSecret || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, microsoft: { ...prev.providers.microsoft, clientSecret: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                        <input type="text" placeholder="Tenant ID" value={ssoSettings.providers.microsoft.tenantId || ''} onChange={e => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, microsoft: { ...prev.providers.microsoft, tenantId: e.target.value } } }))} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                )}
                            </div>

                            {/* Keycloak Toggle */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🔐</span>
                                        <span className="font-medium text-slate-900 dark:text-white">Keycloak</span>
                                        <span className="text-xs text-slate-500">(아래 상세 설정)</span>
                                    </div>
                                    <Toggle enabled={ssoSettings.providers.keycloak.enabled} onChange={() => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, keycloak: { enabled: !prev.providers.keycloak.enabled } } }))} />
                                </div>
                            </div>

                            {/* LDAP Toggle */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Server className="h-5 w-5 text-slate-600" />
                                        <span className="font-medium text-slate-900 dark:text-white">LDAP</span>
                                        <span className="text-xs text-slate-500">(아래 상세 설정)</span>
                                    </div>
                                    <Toggle enabled={ssoSettings.providers.ldap?.enabled || false} onChange={() => setSsoSettings(prev => ({ ...prev, providers: { ...prev.providers, ldap: { enabled: !prev.providers.ldap?.enabled } } }))} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button onClick={saveSsoSettings} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg">
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
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Keycloak 연동 활성화</p>
                            <p className="text-sm text-slate-500">OIDC 인증 및 계정 동기화</p>
                        </div>
                        <Toggle enabled={keycloakSettings.enabled} onChange={() => setKeycloakSettings(prev => ({ ...prev, enabled: !prev.enabled }))} />
                    </div>

                    {keycloakSettings.enabled && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">서버 URL</label>
                                    <input type="text" placeholder="https://keycloak.example.com" value={keycloakSettings.serverUrl} onChange={e => setKeycloakSettings(prev => ({ ...prev, serverUrl: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Realm</label>
                                    <input type="text" placeholder="master" value={keycloakSettings.realm} onChange={e => setKeycloakSettings(prev => ({ ...prev, realm: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client ID</label>
                                    <input type="text" placeholder="jasca-client" value={keycloakSettings.clientId} onChange={e => setKeycloakSettings(prev => ({ ...prev, clientId: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Secret</label>
                                    <input type="password" placeholder="••••••••" value={keycloakSettings.clientSecret} onChange={e => setKeycloakSettings(prev => ({ ...prev, clientSecret: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                </div>
                            </div>
                            <button onClick={testKeycloakConnection} disabled={testingKeycloak} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                                {testingKeycloak ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                                연결 테스트
                            </button>

                            {/* Sync Settings */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    계정 동기화 설정
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">계정 동기화 활성화</p>
                                        <p className="text-sm text-slate-500">Keycloak 사용자를 JASCA에 자동 동기화</p>
                                    </div>
                                    <Toggle enabled={keycloakSettings.syncEnabled} onChange={() => setKeycloakSettings(prev => ({ ...prev, syncEnabled: !prev.syncEnabled }))} />
                                </div>

                                {keycloakSettings.syncEnabled && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">동기화 주기 (초)</label>
                                                <input type="number" value={keycloakSettings.syncInterval} onChange={e => setKeycloakSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) || 3600 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">기본 역할</label>
                                                <select value={keycloakSettings.defaultRole} onChange={e => setKeycloakSettings(prev => ({ ...prev, defaultRole: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-end gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={keycloakSettings.autoCreateUsers} onChange={e => setKeycloakSettings(prev => ({ ...prev, autoCreateUsers: e.target.checked }))} className="w-4 h-4 rounded" />
                                                    <span className="text-sm">자동 생성</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={keycloakSettings.autoUpdateUsers} onChange={e => setKeycloakSettings(prev => ({ ...prev, autoUpdateUsers: e.target.checked }))} className="w-4 h-4 rounded" />
                                                    <span className="text-sm">자동 업데이트</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Group Mapping */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">그룹 → 역할 매핑</h4>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Keycloak 그룹 이름" value={newKcGroupName} onChange={e => setNewKcGroupName(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                                <select value={newKcGroupRole} onChange={e => setNewKcGroupRole(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                                <button onClick={addKcGroupMapping} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">추가</button>
                                            </div>
                                            {Object.entries(keycloakSettings.groupMapping).length > 0 && (
                                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-4 py-2 text-left text-sm font-medium">Keycloak 그룹</th><th className="px-4 py-2 text-left text-sm font-medium">JASCA 역할</th><th className="px-4 py-2 w-16"></th></tr></thead>
                                                        <tbody>
                                                            {Object.entries(keycloakSettings.groupMapping).map(([group, role]) => (
                                                                <tr key={group} className="border-t border-slate-200 dark:border-slate-700">
                                                                    <td className="px-4 py-2">{group}</td>
                                                                    <td className="px-4 py-2">{ROLE_OPTIONS.find(r => r.value === role)?.label || role}</td>
                                                                    <td className="px-4 py-2"><button onClick={() => removeKcGroupMapping(group)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button></td>
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
                                                <p className="text-sm text-slate-700 dark:text-slate-300">마지막 동기화: {keycloakSettings.lastSyncAt ? new Date(keycloakSettings.lastSyncAt).toLocaleString('ko-KR') : '없음'}</p>
                                                {keycloakSettings.lastSyncResult && <p className="text-xs text-slate-500">생성 {keycloakSettings.lastSyncResult.created} / 업데이트 {keycloakSettings.lastSyncResult.updated} / 스킵 {keycloakSettings.lastSyncResult.skipped}</p>}
                                            </div>
                                            <button onClick={syncKeycloakUsers} disabled={syncingKeycloak} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg">
                                                {syncingKeycloak ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                수동 동기화
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex justify-end border-t pt-6">
                        <button onClick={saveKeycloakSettings} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Keycloak 설정 저장
                        </button>
                    </div>
                </div>
            </div>

            {/* LDAP Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        LDAP 상세 설정
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">LDAP 연동 활성화</p>
                            <p className="text-sm text-slate-500">OpenLDAP, Active Directory 등 LDAP 서버 연동</p>
                        </div>
                        <Toggle enabled={ldapSettings.enabled} onChange={() => setLdapSettings(prev => ({ ...prev, enabled: !prev.enabled }))} />
                    </div>

                    {ldapSettings.enabled && (
                        <>
                            {/* Connection Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white">서버 연결 설정</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">서버 URL</label>
                                        <input type="text" placeholder="ldap://ldap.example.com:389" value={ldapSettings.serverUrl} onChange={e => setLdapSettings(prev => ({ ...prev, serverUrl: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={ldapSettings.useTls} onChange={e => setLdapSettings(prev => ({ ...prev, useTls: e.target.checked }))} className="w-4 h-4 rounded" />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">TLS 사용</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bind DN</label>
                                        <input type="text" placeholder="cn=admin,dc=example,dc=com" value={ldapSettings.bindDn} onChange={e => setLdapSettings(prev => ({ ...prev, bindDn: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bind 비밀번호</label>
                                        <input type="password" placeholder="••••••••" value={ldapSettings.bindPassword} onChange={e => setLdapSettings(prev => ({ ...prev, bindPassword: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base DN</label>
                                        <input type="text" placeholder="dc=example,dc=com" value={ldapSettings.baseDn} onChange={e => setLdapSettings(prev => ({ ...prev, baseDn: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                </div>
                                <button onClick={testLdapConnection} disabled={testingLdap} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg">
                                    {testingLdap ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                                    연결 테스트
                                </button>
                            </div>

                            {/* User Search Settings */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white">사용자 검색 설정</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">사용자 검색 Base</label>
                                        <input type="text" placeholder="ou=users" value={ldapSettings.userSearchBase} onChange={e => setLdapSettings(prev => ({ ...prev, userSearchBase: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">사용자 검색 필터</label>
                                        <input type="text" placeholder="(objectClass=inetOrgPerson)" value={ldapSettings.userSearchFilter} onChange={e => setLdapSettings(prev => ({ ...prev, userSearchFilter: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">사용자 ID 속성</label>
                                        <input type="text" placeholder="uid" value={ldapSettings.usernameAttribute} onChange={e => setLdapSettings(prev => ({ ...prev, usernameAttribute: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">이메일 속성</label>
                                        <input type="text" placeholder="mail" value={ldapSettings.emailAttribute} onChange={e => setLdapSettings(prev => ({ ...prev, emailAttribute: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">이름 속성</label>
                                        <input type="text" placeholder="cn" value={ldapSettings.nameAttribute} onChange={e => setLdapSettings(prev => ({ ...prev, nameAttribute: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                </div>
                            </div>

                            {/* Group Settings */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white">그룹 검색 설정 (선택)</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">그룹 검색 Base</label>
                                        <input type="text" placeholder="ou=groups" value={ldapSettings.groupSearchBase} onChange={e => setLdapSettings(prev => ({ ...prev, groupSearchBase: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">그룹 검색 필터</label>
                                        <input type="text" placeholder="(objectClass=groupOfNames)" value={ldapSettings.groupSearchFilter} onChange={e => setLdapSettings(prev => ({ ...prev, groupSearchFilter: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">그룹 멤버 속성</label>
                                        <input type="text" placeholder="member" value={ldapSettings.groupMemberAttribute} onChange={e => setLdapSettings(prev => ({ ...prev, groupMemberAttribute: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                </div>
                            </div>

                            {/* Sync Settings */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    계정 동기화 설정
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">계정 동기화 활성화</p>
                                        <p className="text-sm text-slate-500">LDAP 사용자를 JASCA에 자동 동기화</p>
                                    </div>
                                    <Toggle enabled={ldapSettings.syncEnabled} onChange={() => setLdapSettings(prev => ({ ...prev, syncEnabled: !prev.syncEnabled }))} />
                                </div>

                                {ldapSettings.syncEnabled && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">동기화 주기 (초)</label>
                                                <input type="number" value={ldapSettings.syncInterval} onChange={e => setLdapSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) || 3600 }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">기본 역할</label>
                                                <select value={ldapSettings.defaultRole} onChange={e => setLdapSettings(prev => ({ ...prev, defaultRole: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-end gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={ldapSettings.autoCreateUsers} onChange={e => setLdapSettings(prev => ({ ...prev, autoCreateUsers: e.target.checked }))} className="w-4 h-4 rounded" />
                                                    <span className="text-sm">자동 생성</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={ldapSettings.autoUpdateUsers} onChange={e => setLdapSettings(prev => ({ ...prev, autoUpdateUsers: e.target.checked }))} className="w-4 h-4 rounded" />
                                                    <span className="text-sm">자동 업데이트</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Group Mapping */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">그룹 → 역할 매핑</h4>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="LDAP 그룹 이름" value={newLdapGroupName} onChange={e => setNewLdapGroupName(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                                                <select value={newLdapGroupRole} onChange={e => setNewLdapGroupRole(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                                <button onClick={addLdapGroupMapping} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">추가</button>
                                            </div>
                                            {Object.entries(ldapSettings.groupMapping).length > 0 && (
                                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-4 py-2 text-left text-sm font-medium">LDAP 그룹</th><th className="px-4 py-2 text-left text-sm font-medium">JASCA 역할</th><th className="px-4 py-2 w-16"></th></tr></thead>
                                                        <tbody>
                                                            {Object.entries(ldapSettings.groupMapping).map(([group, role]) => (
                                                                <tr key={group} className="border-t border-slate-200 dark:border-slate-700">
                                                                    <td className="px-4 py-2">{group}</td>
                                                                    <td className="px-4 py-2">{ROLE_OPTIONS.find(r => r.value === role)?.label || role}</td>
                                                                    <td className="px-4 py-2"><button onClick={() => removeLdapGroupMapping(group)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button></td>
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
                                                <p className="text-sm text-slate-700 dark:text-slate-300">마지막 동기화: {ldapSettings.lastSyncAt ? new Date(ldapSettings.lastSyncAt).toLocaleString('ko-KR') : '없음'}</p>
                                                {ldapSettings.lastSyncResult && <p className="text-xs text-slate-500">생성 {ldapSettings.lastSyncResult.created} / 업데이트 {ldapSettings.lastSyncResult.updated} / 스킵 {ldapSettings.lastSyncResult.skipped}</p>}
                                            </div>
                                            <button onClick={syncLdapUsers} disabled={syncingLdap} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg">
                                                {syncingLdap ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                수동 동기화
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex justify-end border-t pt-6">
                        <button onClick={saveLdapSettings} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            LDAP 설정 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
