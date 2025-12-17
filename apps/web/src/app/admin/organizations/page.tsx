'use client';

import { useState } from 'react';
import {
    Building2,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Users,
    FolderKanban,
    AlertTriangle,
} from 'lucide-react';

// Mock organizations
const mockOrganizations = [
    {
        id: '1',
        name: 'ACME Corp',
        slug: 'acme-corp',
        usersCount: 45,
        projectsCount: 12,
        vulnerabilities: { critical: 12, high: 45, medium: 89 },
        createdAt: '2024-01-15',
    },
    {
        id: '2',
        name: 'TechStart Inc',
        slug: 'techstart',
        usersCount: 28,
        projectsCount: 8,
        vulnerabilities: { critical: 5, high: 22, medium: 67 },
        createdAt: '2024-03-20',
    },
    {
        id: '3',
        name: 'SecureNet',
        slug: 'securenet',
        usersCount: 56,
        projectsCount: 15,
        vulnerabilities: { critical: 8, high: 34, medium: 78 },
        createdAt: '2024-02-10',
    },
];

export default function OrganizationsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');

    const filteredOrgs = mockOrganizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = () => {
        alert(`Creating organization: ${newOrgName}`);
        setShowCreateModal(false);
        setNewOrgName('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">조직 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {mockOrganizations.length}개 조직
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    조직 추가
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="조직 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrgs.map((org) => (
                    <div
                        key={org.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{org.name}</h3>
                                    <p className="text-sm text-slate-500">@{org.slug}</p>
                                </div>
                            </div>
                            <div className="relative group">
                                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <Edit className="h-4 w-4" />
                                        수정
                                    </button>
                                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                        <Trash2 className="h-4 w-4" />
                                        삭제
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">{org.usersCount} 사용자</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <FolderKanban className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">{org.projectsCount} 프로젝트</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-500 mb-2">취약점 현황</p>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                                    C: {org.vulnerabilities.critical}
                                </span>
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs font-medium">
                                    H: {org.vulnerabilities.high}
                                </span>
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                                    M: {org.vulnerabilities.medium}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            새 조직 추가
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    조직 이름
                                </label>
                                <input
                                    type="text"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="조직 이름 입력"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
