'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    FolderKanban,
    Plus,
    Search,
    Edit,
    Trash2,
    Users,
    AlertTriangle,
    X,
    Eye,
    Building2,
    Calendar,
    Activity,
    Shield,
    Download,
    RefreshCw,
    ExternalLink,
    Clock,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import {
    useProjects,
    useCreateProject,
    useUpdateProject,
    useDeleteProject,
    useOrganizations,
    Project,
} from '@/lib/api-hooks';

const riskLevelLabels: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    LOW: { label: 'Low', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    NONE: { label: 'Safe', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminProjectsPage() {
    // Search with debounce
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    
    // Filters
    const [orgFilter, setOrgFilter] = useState('');
    const [riskFilter, setRiskFilter] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [viewingProject, setViewingProject] = useState<Project | null>(null);

    // Server-side data fetching with all parameters
    const { data: projectsData, isLoading, error, refetch, isFetching } = useProjects({
        organizationId: orgFilter || undefined,
        riskLevel: riskFilter || undefined,
        search: debouncedSearch || undefined,
        page: currentPage,
        pageSize,
    });
    const { data: organizations } = useOrganizations();
    const createMutation = useCreateProject();
    const updateMutation = useUpdateProject();
    const deleteMutation = useDeleteProject();

    const projects = projectsData?.data || [];
    const totalCount = projectsData?.total || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Statistics (from current page data - consider adding server-side stats API for accuracy)
    const stats = useMemo(() => {
        let totalVulnerabilities = 0, criticalHigh = 0, atRisk = 0, safe = 0;
        const byOrg: Record<string, number> = {};
        
        projects.forEach((p) => {
            if (p.stats?.vulnerabilities) {
                totalVulnerabilities += (p.stats.vulnerabilities.critical || 0) + 
                    (p.stats.vulnerabilities.high || 0) +
                    (p.stats.vulnerabilities.medium || 0) +
                    (p.stats.vulnerabilities.low || 0);
                criticalHigh += (p.stats.vulnerabilities.critical || 0) + (p.stats.vulnerabilities.high || 0);
            }
            
            if (p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH') atRisk++;
            else safe++;
            
            const orgName = p.organization?.name || 'Unknown';
            byOrg[orgName] = (byOrg[orgName] || 0) + 1;
        });
        
        return { total: totalCount, totalVulnerabilities, criticalHigh, atRisk, safe, byOrg };
    }, [projects, totalCount]);

    const activeFiltersCount = [orgFilter, riskFilter].filter(Boolean).length;

    // Form state for create/edit modals
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        organizationId: '',
    });

    const clearFilters = () => {
        setOrgFilter('');
        setRiskFilter('');
        setCurrentPage(1);
    };

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setFormData({ ...formData, name, slug });
    };

    const openCreateModal = () => {
        setFormData({ name: '', slug: '', description: '', organizationId: organizations?.[0]?.id || '' });
        setShowCreateModal(true);
    };

    const openEditModal = (project: Project) => {
        setFormData({
            name: project.name,
            slug: project.slug,
            description: project.description || '',
            organizationId: project.organizationId,
        });
        setEditingProject(project);
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setEditingProject(null);
        setViewingProject(null);
    };

    const handleCreate = async () => {
        try {
            const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            await createMutation.mutateAsync({ ...formData, slug });
            closeModals();
        } catch (err) {
            console.error('Failed to create project:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingProject) return;
        try {
            await updateMutation.mutateAsync({
                id: editingProject.id,
                name: formData.name,
                description: formData.description,
                organizationId: formData.organizationId,
            });
            closeModals();
        } catch (err) {
            console.error('Failed to update project:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 프로젝트를 삭제하시겠습니까? 모든 스캔 데이터가 함께 삭제됩니다.')) return;
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to delete project:', err);
        }
    };


    const exportProjects = () => {
        const csv = [
            ['프로젝트명', 'Slug', '조직', '위험도', 'Critical', 'High', 'Medium', 'Low', '마지막 스캔'].join(','),
            ...projects.map((p: Project) => [
                p.name,
                p.slug,
                p.organization?.name || '-',
                p.riskLevel || 'NONE',
                p.stats?.vulnerabilities?.critical || 0,
                p.stats?.vulnerabilities?.high || 0,
                p.stats?.vulnerabilities?.medium || 0,
                p.stats?.vulnerabilities?.low || 0,
                p.stats?.lastScanAt ? new Date(p.stats.lastScanAt).toLocaleDateString('ko-KR') : '-'
            ].join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_projects_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                프로젝트 목록을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">프로젝트 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {projects.length}개 프로젝트 관리
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportProjects}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <Download className="h-4 w-4" />
                        내보내기
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                        title="새로고침"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        프로젝트 추가
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">전체</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">전체 취약점</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.totalVulnerabilities}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">위험 프로젝트</p>
                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.atRisk}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">안전 프로젝트</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.safe}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">조직 수</p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{organizations?.length || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="프로젝트 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                    <select
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">모든 조직</option>
                        {organizations?.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                    <select
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">모든 위험도</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="NONE">Safe</option>
                    </select>
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            필터 초기화
                        </button>
                    )}
                </div>
                {activeFiltersCount > 0 && (
                    <p className="mt-2 text-sm text-slate-500">
                        {totalCount}개 프로젝트 표시 중 ({activeFiltersCount}개 필터 적용)
                    </p>
                )}
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
                                취약점
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                위험도
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                마지막 스캔
                            </th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {projects.map((project: Project) => (
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
                                            <p className="text-xs text-slate-500">@{project.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {project.organization?.name || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {project.stats?.vulnerabilities && (
                                        <div className="flex items-center gap-2 text-xs">
                                            {project.stats.vulnerabilities.critical > 0 && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded font-medium">
                                                    C: {project.stats.vulnerabilities.critical}
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                                H: {project.stats.vulnerabilities.high}
                                            </span>
                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                                M: {project.stats.vulnerabilities.medium}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {project.riskLevel && (
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${riskLevelLabels[project.riskLevel]?.color || riskLevelLabels.NONE.color}`}>
                                            {riskLevelLabels[project.riskLevel]?.label || project.riskLevel}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {project.stats?.lastScanAt ? (
                                        <span title={new Date(project.stats.lastScanAt).toLocaleString('ko-KR')}>
                                            {new Date(project.stats.lastScanAt).toLocaleDateString('ko-KR')}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setViewingProject(project)}
                                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                            title="상세 보기"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(project)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="수정"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            disabled={deleteMutation.isPending}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="삭제"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {projects.length === 0 && !isFetching && (
                    <div className="p-12 text-center">
                        <FolderKanban className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {searchQuery || activeFiltersCount ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            {searchQuery || activeFiltersCount ? '다른 검색어나 필터를 시도해보세요.' : '첫 번째 프로젝트를 추가하세요.'}
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span>페이지당</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700"
                            >
                                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span>개 | 총 {totalCount}개 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)}</span>
                            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-red-600" />}
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setCurrentPage(1)} 
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            >처음</button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            ><ChevronLeft className="h-4 w-4" /></button>
                            <span className="px-3 py-1 text-sm">{currentPage} / {totalPages || 1}</span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            ><ChevronRight className="h-4 w-4" /></button>
                            <button 
                                onClick={() => setCurrentPage(totalPages)} 
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            >마지막</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingProject) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingProject ? '프로젝트 수정' : '프로젝트 추가'}
                            </h3>
                            <button onClick={closeModals} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    프로젝트 이름 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="My Project"
                                />
                            </div>
                            {!editingProject && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        슬러그 (URL에 사용됨) *
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">@</span>
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="my-project"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">영문 소문자, 숫자, 하이픈만 허용됩니다.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    조직 *
                                </label>
                                <select
                                    value={formData.organizationId}
                                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">조직 선택...</option>
                                    {organizations?.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                                {editingProject && (
                                    <p className="text-xs text-slate-500 mt-1">프로젝트를 다른 조직으로 이동합니다</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    설명
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="프로젝트 설명..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={closeModals}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={editingProject ? handleUpdate : handleCreate}
                                disabled={createMutation.isPending || updateMutation.isPending || !formData.name || (!editingProject && !formData.organizationId)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? '처리 중...' : editingProject ? '저장' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Project Detail Modal */}
            {viewingProject && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingProject(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                    <FolderKanban className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewingProject.name}</h3>
                                    <p className="text-sm text-slate-500">@{viewingProject.slug}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingProject(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">조직</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {viewingProject.organization?.name || '-'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">위험도</p>
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${riskLevelLabels[viewingProject.riskLevel || 'NONE']?.color}`}>
                                        {riskLevelLabels[viewingProject.riskLevel || 'NONE']?.label}
                                    </span>
                                </div>
                            </div>

                            {viewingProject.description && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">설명</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{viewingProject.description}</p>
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-3">취약점 현황</p>
                                {viewingProject.stats?.vulnerabilities ? (
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2">
                                            <p className="text-lg font-bold text-red-600">{viewingProject.stats.vulnerabilities.critical}</p>
                                            <p className="text-xs text-red-600">Critical</p>
                                        </div>
                                        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
                                            <p className="text-lg font-bold text-orange-600">{viewingProject.stats.vulnerabilities.high}</p>
                                            <p className="text-xs text-orange-600">High</p>
                                        </div>
                                        <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2">
                                            <p className="text-lg font-bold text-yellow-600">{viewingProject.stats.vulnerabilities.medium}</p>
                                            <p className="text-xs text-yellow-600">Medium</p>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                                            <p className="text-lg font-bold text-blue-600">{viewingProject.stats.vulnerabilities.low}</p>
                                            <p className="text-xs text-blue-600">Low</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">스캔 데이터 없음</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock className="h-4 w-4" />
                                <span>마지막 스캔:</span>
                                <span className="text-slate-900 dark:text-white">
                                    {viewingProject.stats?.lastScanAt ? new Date(viewingProject.stats.lastScanAt).toLocaleString('ko-KR') : '-'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between gap-2 p-6 border-t border-slate-200 dark:border-slate-700">
                            <Link
                                href={`/dashboard/projects/${viewingProject.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            >
                                <ExternalLink className="h-4 w-4" />
                                상세 페이지로 이동
                            </Link>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setViewingProject(null); openEditModal(viewingProject); }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Edit className="h-4 w-4" />
                                    수정
                                </button>
                                <button
                                    onClick={() => setViewingProject(null)}
                                    className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
