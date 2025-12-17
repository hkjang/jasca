'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    FolderKanban,
    AlertTriangle,
    Shield,
    ChevronRight,
    Loader2,
    RefreshCw,
    Search,
    Filter,
    LayoutGrid,
    List,
} from 'lucide-react';
import { useProjects, Project } from '@/lib/api-hooks';

function getRiskBadge(riskLevel?: string) {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
        LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        NONE: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    };
    const level = riskLevel || 'NONE';
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${colors[level] || colors.NONE}`}>
            {level === 'NONE' ? '안전' : level}
        </span>
    );
}

function formatDate(dateString?: string) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export default function ProjectsPage() {
    const { data, isLoading, error, refetch } = useProjects();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-slate-600 dark:text-slate-400">프로젝트를 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    다시 시도
                </button>
            </div>
        );
    }

    const projects = data?.data || [];
    const filteredProjects = projects.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">프로젝트</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        총 {data?.total || 0}개의 프로젝트
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Search and View Toggle */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="프로젝트 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        <LayoutGrid className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        <List className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Projects Display */}
            {filteredProjects.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FolderKanban className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        {searchQuery ? '다른 검색어로 시도해보세요.' : '새 프로젝트를 추가해주세요.'}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project: Project) => (
                        <Link
                            key={project.id}
                            href={`/dashboard/projects/${project.id}`}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-slate-500">{project.slug}</p>
                                    </div>
                                </div>
                                {getRiskBadge(project.riskLevel)}
                            </div>

                            {project.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                    {project.description}
                                </p>
                            )}

                            {/* Stats */}
                            {project.stats && (
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <span className="text-slate-600 dark:text-slate-400">
                                            C: {project.stats.vulnerabilities.critical}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        <span className="text-slate-600 dark:text-slate-400">
                                            H: {project.stats.vulnerabilities.high}
                                        </span>
                                    </div>
                                    {project.policyViolations && project.policyViolations > 0 && (
                                        <div className="flex items-center gap-1 text-red-600">
                                            <Shield className="h-4 w-4" />
                                            <span>{project.policyViolations} 위반</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                                <span>마지막 스캔: {formatDate(project.stats?.lastScanAt)}</span>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    프로젝트
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    위험도
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    취약점
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    정책 위반
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    마지막 스캔
                                </th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredProjects.map((project: Project) => (
                                <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{project.name}</p>
                                                <p className="text-sm text-slate-500">{project.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{getRiskBadge(project.riskLevel)}</td>
                                    <td className="px-6 py-4">
                                        {project.stats ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-red-600 font-medium">C:{project.stats.vulnerabilities.critical}</span>
                                                <span className="text-orange-600 font-medium">H:{project.stats.vulnerabilities.high}</span>
                                                <span className="text-yellow-600">M:{project.stats.vulnerabilities.medium}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {project.policyViolations && project.policyViolations > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                                                <Shield className="h-3 w-3" />
                                                {project.policyViolations}
                                            </span>
                                        ) : (
                                            <span className="text-green-600 text-sm">없음</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {formatDate(project.stats?.lastScanAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/projects/${project.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            상세보기
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
