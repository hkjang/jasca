'use client';

import { useState } from 'react';
import {
    Users,
    Search,
    MoreVertical,
    Shield,
    ShieldCheck,
    ShieldX,
    Mail,
    Calendar,
    Filter,
} from 'lucide-react';

// Mock users
const mockUsers = [
    {
        id: '1',
        name: '김보안',
        email: 'security@acme.com',
        role: 'SYSTEM_ADMIN',
        organization: 'ACME Corp',
        mfaEnabled: true,
        status: 'ACTIVE',
        lastLogin: '2024-12-17T10:30:00Z',
    },
    {
        id: '2',
        name: '이개발',
        email: 'dev@acme.com',
        role: 'DEVELOPER',
        organization: 'ACME Corp',
        mfaEnabled: true,
        status: 'ACTIVE',
        lastLogin: '2024-12-17T09:15:00Z',
    },
    {
        id: '3',
        name: '박매니저',
        email: 'manager@techstart.com',
        role: 'ORG_ADMIN',
        organization: 'TechStart Inc',
        mfaEnabled: false,
        status: 'ACTIVE',
        lastLogin: '2024-12-16T18:45:00Z',
    },
    {
        id: '4',
        name: '최관리자',
        email: 'admin@securenet.com',
        role: 'ORG_ADMIN',
        organization: 'SecureNet',
        mfaEnabled: true,
        status: 'INACTIVE',
        lastLogin: '2024-12-10T14:20:00Z',
    },
];

function getRoleBadge(role: string) {
    const config: Record<string, { label: string; color: string }> = {
        SYSTEM_ADMIN: { label: 'System Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        ORG_ADMIN: { label: 'Org Admin', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        SECURITY_ENGINEER: { label: 'Security Engineer', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        DEVELOPER: { label: 'Developer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        VIEWER: { label: 'Viewer', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    };
    const { label, color } = config[role] || { label: role, color: 'bg-slate-100 text-slate-700' };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>;
}

function getStatusBadge(status: string) {
    return status === 'ACTIVE' ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            활성
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            비활성
        </span>
    );
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function UsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');

    const filteredUsers = mockUsers.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">사용자 관리</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {mockUsers.length}명의 사용자
                </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                    <option value="">모든 역할</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                    <option value="ORG_ADMIN">Org Admin</option>
                    <option value="SECURITY_ENGINEER">Security Engineer</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="VIEWER">Viewer</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                사용자
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                조직
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                역할
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                MFA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                상태
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                마지막 로그인
                            </th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                {user.name[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {user.organization}
                                </td>
                                <td className="px-6 py-4">
                                    {getRoleBadge(user.role)}
                                </td>
                                <td className="px-6 py-4">
                                    {user.mfaEnabled ? (
                                        <ShieldCheck className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <ShieldX className="h-5 w-5 text-red-500" />
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(user.status)}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {formatDate(user.lastLogin)}
                                </td>
                                <td className="px-6 py-4">
                                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
