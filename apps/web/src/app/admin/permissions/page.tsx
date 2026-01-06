'use client';

import { useState, useEffect } from 'react';
import {
    Shield,
    Save,
    CheckCircle,
    X,
    Info,
    Loader2,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE = '/api';

const roles = [
    { id: 'SYSTEM_ADMIN', name: 'System Admin', description: '전체 시스템 관리자' },
    { id: 'ORG_ADMIN', name: 'Org Admin', description: '조직 관리자' },
    { id: 'SECURITY_ADMIN', name: 'Security Admin', description: '보안 관리자' },
    { id: 'PROJECT_ADMIN', name: 'Project Admin', description: '프로젝트 관리자' },
    { id: 'DEVELOPER', name: 'Developer', description: '개발자' },
    { id: 'VIEWER', name: 'Viewer', description: '읽기 전용' },
];

const permissionGroups = [
    {
        name: '취약점',
        permissions: [
            { id: 'vuln:read', label: '취약점 조회' },
            { id: 'vuln:update', label: '취약점 상태 변경' },
            { id: 'vuln:assign', label: '취약점 할당' },
        ],
    },
    {
        name: '스캔',
        permissions: [
            { id: 'scan:read', label: '스캔 조회' },
            { id: 'scan:create', label: '스캔 실행' },
            { id: 'scan:delete', label: '스캔 삭제' },
        ],
    },
    {
        name: '정책',
        permissions: [
            { id: 'policy:read', label: '정책 조회' },
            { id: 'policy:create', label: '정책 생성' },
            { id: 'policy:update', label: '정책 수정' },
            { id: 'policy:delete', label: '정책 삭제' },
        ],
    },
    {
        name: '예외',
        permissions: [
            { id: 'exception:read', label: '예외 조회' },
            { id: 'exception:request', label: '예외 요청' },
            { id: 'exception:approve', label: '예외 승인' },
        ],
    },
    {
        name: '사용자',
        permissions: [
            { id: 'user:read', label: '사용자 조회' },
            { id: 'user:create', label: '사용자 생성' },
            { id: 'user:update', label: '사용자 수정' },
            { id: 'user:delete', label: '사용자 삭제' },
        ],
    },
    {
        name: '조직',
        permissions: [
            { id: 'org:read', label: '조직 조회' },
            { id: 'org:create', label: '조직 생성' },
            { id: 'org:update', label: '조직 수정' },
            { id: 'org:delete', label: '조직 삭제' },
        ],
    },
];

// Default permission matrix
const defaultMatrix: Record<string, string[]> = {
    SYSTEM_ADMIN: permissionGroups.flatMap(g => g.permissions.map(p => p.id)),
    ORG_ADMIN: [
        'vuln:read', 'vuln:update', 'vuln:assign',
        'scan:read', 'scan:create', 'scan:delete',
        'policy:read', 'policy:create', 'policy:update', 'policy:delete',
        'exception:read', 'exception:request', 'exception:approve',
        'user:read', 'user:create', 'user:update',
        'org:read', 'org:update',
    ],
    SECURITY_ADMIN: [
        'vuln:read', 'vuln:update', 'vuln:assign',
        'scan:read', 'scan:create', 'scan:delete',
        'policy:read', 'policy:create', 'policy:update',
        'exception:read', 'exception:request', 'exception:approve',
        'user:read',
    ],
    PROJECT_ADMIN: [
        'vuln:read', 'vuln:update', 'vuln:assign',
        'scan:read', 'scan:create',
        'policy:read',
        'exception:read', 'exception:request',
        'user:read',
    ],
    DEVELOPER: [
        'vuln:read',
        'scan:read', 'scan:create',
        'policy:read',
        'exception:read', 'exception:request',
    ],
    VIEWER: [
        'vuln:read',
        'scan:read',
        'policy:read',
        'exception:read',
    ],
};

async function authFetch(url: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().accessToken;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }
    return response.json();
}

export default function PermissionsPage() {
    const queryClient = useQueryClient();
    const [matrix, setMatrix] = useState<Record<string, string[]>>(defaultMatrix);
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch permissions from settings API
    const { data: settings, isLoading, error, refetch } = useQuery({
        queryKey: ['settings', 'permissions'],
        queryFn: () => authFetch(`${API_BASE}/settings/permissions`),
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (value: Record<string, string[]>) =>
            authFetch(`${API_BASE}/settings/permissions`, {
                method: 'PUT',
                body: JSON.stringify({ value }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'permissions'] });
        },
    });

    // Load settings from API
    useEffect(() => {
        if (settings?.value) {
            setMatrix(settings.value);
        }
    }, [settings]);

    const hasPermission = (roleId: string, permId: string) => {
        return matrix[roleId]?.includes(permId) || false;
    };

    const togglePermission = (roleId: string, permId: string) => {
        setMatrix(prev => {
            const current = prev[roleId] || [];
            if (current.includes(permId)) {
                return { ...prev, [roleId]: current.filter(p => p !== permId) };
            } else {
                return { ...prev, [roleId]: [...current, permId] };
            }
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync(matrix);
            setSaved(true);
            setHasChanges(false);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save permissions:', err);
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
                <p className="text-red-600 dark:text-red-300 mb-4">권한 설정을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">권한 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        역할별 권한을 설정합니다
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {saved && (
                        <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            저장됨
                        </span>
                    )}
                    {hasChanges && (
                        <span className="text-sm text-orange-600">변경사항 있음</span>
                    )}
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        저장
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    System Admin은 모든 권한을 가지며 수정할 수 없습니다. 다른 역할의 권한은 조직 정책에 맞게 조정하세요.
                </p>
            </div>

            {/* Matrix Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-700/50">
                                권한
                            </th>
                            {roles.map((role) => (
                                <th
                                    key={role.id}
                                    className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]"
                                >
                                    <div>{role.name}</div>
                                    <div className="font-normal normal-case text-xs mt-0.5">{role.description}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {permissionGroups.map((group) => (
                            <>
                                <tr key={group.name} className="bg-slate-100 dark:bg-slate-700">
                                    <td
                                        colSpan={roles.length + 1}
                                        className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                                    >
                                        {group.name}
                                    </td>
                                </tr>
                                {group.permissions.map((perm) => (
                                    <tr key={perm.id} className="border-b border-slate-100 dark:border-slate-700">
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800">
                                            {perm.label}
                                        </td>
                                        {roles.map((role) => (
                                            <td key={`${role.id}-${perm.id}`} className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => role.id !== 'SYSTEM_ADMIN' && togglePermission(role.id, perm.id)}
                                                    disabled={role.id === 'SYSTEM_ADMIN'}
                                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${hasPermission(role.id, perm.id)
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                        } ${role.id === 'SYSTEM_ADMIN' ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
                                                >
                                                    {hasPermission(role.id, perm.id) ? (
                                                        <CheckCircle className="h-4 w-4" />
                                                    ) : (
                                                        <X className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
