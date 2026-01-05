'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    FolderKanban,
    AlertTriangle,
    Shield,
    ChevronRight,
    Loader2,
    RefreshCw,
    Search,
    LayoutGrid,
    List,
    Plus,
    X,
    SlidersHorizontal,
    ArrowUpDown,
    Building2,
    Scan,
    MoreVertical,
    Edit,
    Trash2,
    ChevronDown,
} from 'lucide-react';
import { useProjects, useOrganizations, useCreateProject, useDeleteProject, useUpdateProject, Project } from '@/lib/api-hooks';

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

// Vulnerability summary bar component
function VulnerabilitySummaryBar({ stats }: { stats?: Project['stats'] }) {
    if (!stats) return <span className="text-slate-400 text-sm">스캔 없음</span>;

    const { critical, high, medium, low } = stats.vulnerabilities;
    const total = critical + high + medium + low;

    if (total === 0) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-green-200 dark:bg-green-900/50 rounded-full" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">취약점 없음</span>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                {critical > 0 && (
                    <div
                        className="bg-red-500"
                        style={{ width: `${(critical / total) * 100}%` }}
                    />
                )}
                {high > 0 && (
                    <div
                        className="bg-orange-500"
                        style={{ width: `${(high / total) * 100}%` }}
                    />
                )}
                {medium > 0 && (
                    <div
                        className="bg-yellow-500"
                        style={{ width: `${(medium / total) * 100}%` }}
                    />
                )}
                {low > 0 && (
                    <div
                        className="bg-blue-500"
                        style={{ width: `${(low / total) * 100}%` }}
                    />
                )}
            </div>
            <div className="flex items-center gap-3 text-xs">
                <span className="text-red-600 dark:text-red-400 font-medium">C:{critical}</span>
                <span className="text-orange-600 dark:text-orange-400 font-medium">H:{high}</span>
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">M:{medium}</span>
                <span className="text-blue-600 dark:text-blue-400">L:{low}</span>
            </div>
        </div>
    );
}

// Create Project Modal
function CreateProjectModal({
    isOpen,
    onClose,
    organizations,
}: {
    isOpen: boolean;
    onClose: () => void;
    organizations: { id: string; name: string }[];
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [organizationId, setOrganizationId] = useState(organizations[0]?.id || '');
    const createProject = useCreateProject();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createProject.mutateAsync({
                name,
                description,
                organizationId,
            });
            onClose();
            setName('');
            setDescription('');
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">새 프로젝트 생성</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            조직
                        </label>
                        <select
                            value={organizationId}
                            onChange={(e) => setOrganizationId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            프로젝트 이름
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: my-web-app"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            설명 (선택)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="프로젝트에 대한 간단한 설명"
                            rows={3}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={createProject.isPending || !name || !organizationId}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {createProject.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    생성
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    projectName,
    isDeleting,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
    isDeleting: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 m-4">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        프로젝트 삭제
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        <strong className="text-slate-900 dark:text-white">{projectName}</strong> 프로젝트를 
                        삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                삭제 중...
                            </>
                        ) : (
                            '삭제'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Edit Project Modal
function EditProjectModal({
    project,
    onClose,
}: {
    project: Project | null;
    onClose: () => void;
}) {
    const [name, setName] = useState(project?.name || '');
    const [description, setDescription] = useState(project?.description || '');
    const updateProject = useUpdateProject();

    // Update form when project changes
    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description || '');
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;
        try {
            await updateProject.mutateAsync({
                id: project.id,
                name,
                description,
            });
            onClose();
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    if (!project) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">프로젝트 편집</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            프로젝트 이름
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            설명
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={updateProject.isPending || !name}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {updateProject.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                '저장'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Stats Overview Cards
function StatsOverviewCards({ projects }: { projects: Project[] }) {
    const stats = useMemo(() => {
        let totalCritical = 0;
        let totalHigh = 0;
        let totalMedium = 0;
        let totalLow = 0;
        let atRiskCount = 0;
        let safeCount = 0;
        let noScansCount = 0;

        projects.forEach((p) => {
            if (p.stats) {
                totalCritical += p.stats.vulnerabilities.critical || 0;
                totalHigh += p.stats.vulnerabilities.high || 0;
                totalMedium += p.stats.vulnerabilities.medium || 0;
                totalLow += p.stats.vulnerabilities.low || 0;
            } else {
                noScansCount++;
            }

            if (p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH') {
                atRiskCount++;
            } else if (!p.riskLevel || p.riskLevel === 'NONE' || p.riskLevel === 'LOW') {
                safeCount++;
            }
        });

        return {
            totalProjects: projects.length,
            totalVulnerabilities: totalCritical + totalHigh + totalMedium + totalLow,
            totalCritical,
            totalHigh,
            atRiskCount,
            safeCount,
            noScansCount,
        };
    }, [projects]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">전체 프로젝트</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalProjects}</p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">전체 취약점</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalVulnerabilities}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            C:{stats.totalCritical} H:{stats.totalHigh}
                        </p>
                    </div>
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">위험 프로젝트</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.atRiskCount}</p>
                        <p className="text-xs text-slate-400 mt-1">Critical/High</p>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">안전 프로젝트</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.safeCount}</p>
                        <p className="text-xs text-slate-400 mt-1">스캔 미완료: {stats.noScansCount}</p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Project Card Dropdown Menu
function ProjectCardMenu({
    project,
    onEdit,
    onDelete,
}: {
    project: Project;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <MoreVertical className="h-4 w-4" />
            </button>
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <Edit className="h-4 w-4" />
                            편집
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="h-4 w-4" />
                            삭제
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

type SortOption = 'name' | 'lastScan' | 'vulnerabilities' | 'risk';
type RiskFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export default function ProjectsPage() {
    const { data, isLoading, error, refetch } = useProjects();
    const { data: organizations } = useOrganizations();
    const deleteProject = useDeleteProject();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
    const [organizationFilter, setOrganizationFilter] = useState<string>('ALL');
    const [deleteModalProject, setDeleteModalProject] = useState<Project | null>(null);
    const [editModalProject, setEditModalProject] = useState<Project | null>(null);

    // Filter and sort projects
    const filteredAndSortedProjects = useMemo(() => {
        let projects = data?.data || [];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            projects = projects.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query) ||
                    p.slug.toLowerCase().includes(query)
            );
        }

        // Risk filter
        if (riskFilter !== 'ALL') {
            projects = projects.filter((p) => (p.riskLevel || 'NONE') === riskFilter);
        }

        // Organization filter
        if (organizationFilter !== 'ALL') {
            projects = projects.filter((p) => p.organizationId === organizationFilter);
        }

        // Sort
        projects = [...projects].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'lastScan':
                    const dateA = a.stats?.lastScanAt ? new Date(a.stats.lastScanAt).getTime() : 0;
                    const dateB = b.stats?.lastScanAt ? new Date(b.stats.lastScanAt).getTime() : 0;
                    comparison = dateB - dateA;
                    break;
                case 'vulnerabilities':
                    const vulnA = a.stats?.vulnerabilities.total || 0;
                    const vulnB = b.stats?.vulnerabilities.total || 0;
                    comparison = vulnB - vulnA;
                    break;
                case 'risk':
                    const riskOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
                    comparison = (riskOrder[b.riskLevel as keyof typeof riskOrder] || 0) -
                        (riskOrder[a.riskLevel as keyof typeof riskOrder] || 0);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return projects;
    }, [data?.data, searchQuery, riskFilter, organizationFilter, sortBy, sortOrder]);

    const handleDelete = async () => {
        if (!deleteModalProject) return;
        try {
            await deleteProject.mutateAsync(deleteModalProject.id);
            setDeleteModalProject(null);
        } catch (error) {
            console.error('Failed to delete project:', error);
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

    const activeFilterCount = [
        riskFilter !== 'ALL',
        organizationFilter !== 'ALL',
    ].filter(Boolean).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">프로젝트</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        총 {data?.total || 0}개의 프로젝트
                        {filteredAndSortedProjects.length !== (data?.total || 0) && (
                            <span className="text-blue-600 dark:text-blue-400">
                                {' '}(필터됨: {filteredAndSortedProjects.length}개)
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        새로고침
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        새 프로젝트
                    </button>
                </div>
            </div>

            {/* Stats Overview Cards */}
            <StatsOverviewCards projects={data?.data || []} />

            {/* Search, Filter, Sort, View Toggle */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="프로젝트 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                        showFilters || activeFilterCount > 0
                            ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    필터
                    {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Sort Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            const options: SortOption[] = ['name', 'lastScan', 'vulnerabilities', 'risk'];
                            const currentIndex = options.indexOf(sortBy);
                            setSortBy(options[(currentIndex + 1) % options.length]);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        {sortBy === 'name' && '이름순'}
                        {sortBy === 'lastScan' && '최근 스캔순'}
                        {sortBy === 'vulnerabilities' && '취약점순'}
                        {sortBy === 'risk' && '위험도순'}
                    </button>
                </div>

                {/* Sort Order */}
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
                >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                </button>

                {/* View Mode Toggle */}
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

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex flex-wrap gap-4">
                        {/* Risk Filter */}
                        <div className="min-w-[150px]">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                위험도
                            </label>
                            <select
                                value={riskFilter}
                                onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                            >
                                <option value="ALL">전체</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                                <option value="NONE">안전</option>
                            </select>
                        </div>

                        {/* Organization Filter */}
                        <div className="min-w-[150px]">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                조직
                            </label>
                            <select
                                value={organizationFilter}
                                onChange={(e) => setOrganizationFilter(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                            >
                                <option value="ALL">전체</option>
                                {organizations?.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters */}
                        {activeFilterCount > 0 && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setRiskFilter('ALL');
                                        setOrganizationFilter('ALL');
                                    }}
                                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    필터 초기화
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Projects Display */}
            {filteredAndSortedProjects.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FolderKanban className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {searchQuery || activeFilterCount > 0 ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        {searchQuery || activeFilterCount > 0
                            ? '다른 검색어나 필터로 시도해보세요.'
                            : '새 프로젝트를 만들어 보안 분석을 시작하세요.'}
                    </p>
                    {!searchQuery && activeFilterCount === 0 && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            새 프로젝트 만들기
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAndSortedProjects.map((project: Project) => (
                        <Link
                            key={project.id}
                            href={`/dashboard/projects/${project.id}`}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 truncate">{project.slug}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getRiskBadge(project.riskLevel)}
                                    <ProjectCardMenu
                                        project={project}
                                        onEdit={() => setEditModalProject(project)}
                                        onDelete={() => setDeleteModalProject(project)}
                                    />
                                </div>
                            </div>

                            {project.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                    {project.description}
                                </p>
                            )}

                            {/* Vulnerability Summary Bar */}
                            <div className="mb-4">
                                <VulnerabilitySummaryBar stats={project.stats} />
                            </div>

                            {/* Policy Violations */}
                            {project.policyViolations && project.policyViolations > 0 && (
                                <div className="flex items-center gap-1 text-red-600 text-sm mb-4">
                                    <Shield className="h-4 w-4" />
                                    <span>{project.policyViolations} 정책 위반</span>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
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
                            {filteredAndSortedProjects.map((project: Project) => (
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
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/dashboard/projects/${project.id}`}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                            >
                                                상세보기
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                            <ProjectCardMenu
                                                project={project}
                                            onEdit={() => setEditModalProject(project)}
                                                onDelete={() => setDeleteModalProject(project)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                organizations={organizations || []}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={!!deleteModalProject}
                onClose={() => setDeleteModalProject(null)}
                onConfirm={handleDelete}
                projectName={deleteModalProject?.name || ''}
                isDeleting={deleteProject.isPending}
            />

            {/* Edit Project Modal */}
            <EditProjectModal
                project={editModalProject}
                onClose={() => setEditModalProject(null)}
            />
        </div>
    );
}
