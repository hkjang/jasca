'use client';

import { useState } from 'react';
import {
    FolderKanban,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Users,
    AlertTriangle,
    ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface Project {
    id: string;
    name: string;
    slug: string;
    organization: string;
    owner: string;
    registry: string;
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    lastScan: string;
}

const mockProjects: Project[] = [
    {
        id: '1',
        name: 'backend-api',
        slug: 'backend-api',
        organization: 'ACME Corp',
        owner: '김개발',
        registry: 'docker.io/acme/backend-api',
        vulnerabilities: { critical: 3, high: 12, medium: 25, low: 8 },
        lastScan: '2024-12-17T10:30:00Z',
    },
    {
        id: '2',
        name: 'frontend-web',
        slug: 'frontend-web',
        organization: 'ACME Corp',
        owner: '이프론트',
        registry: 'docker.io/acme/frontend-web',
        vulnerabilities: { critical: 0, high: 5, medium: 18, low: 12 },
        lastScan: '2024-12-17T09:15:00Z',
    },
    {
        id: '3',
        name: 'auth-service',
        slug: 'auth-service',
        organization: 'TechStart Inc',
        owner: '박보안',
        registry: 'gcr.io/techstart/auth-service',
        vulnerabilities: { critical: 1, high: 8, medium: 14, low: 6 },
        lastScan: '2024-12-16T18:45:00Z',
    },
];

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminProjectsPage() {
    const [projects] = useState<Project[]>(mockProjects);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.organization.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">프로젝트 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {projects.length}개 프로젝트
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    프로젝트 추가
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="프로젝트 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
            </div>

            {/* Projects Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                프로젝트
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                조직
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                소유자
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                취약점
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                마지막 스캔
                            </th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredProjects.map((project) => (
                            <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                            <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <Link
                                                href={`/dashboard/projects/${project.id}`}
                                                className="font-medium text-slate-900 dark:text-white hover:text-blue-600"
                                            >
                                                {project.name}
                                            </Link>
                                            <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{project.registry}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {project.organization}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{project.owner}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-xs">
                                        {project.vulnerabilities.critical > 0 && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded font-medium">
                                                C: {project.vulnerabilities.critical}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                            H: {project.vulnerabilities.high}
                                        </span>
                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                            M: {project.vulnerabilities.medium}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {formatDate(project.lastScan)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            프로젝트 추가
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    프로젝트 이름
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="my-project"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    레지스트리 URL
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="docker.io/org/image"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    소유자
                                </label>
                                <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <option>소유자 선택...</option>
                                    <option>김개발</option>
                                    <option>이프론트</option>
                                    <option>박보안</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                                추가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
