'use client';

import { useState } from 'react';
import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    Users,
    FolderKanban,
    AlertTriangle,
    X,
    Eye,
    Shield,
    Calendar,
    Mail,
    ExternalLink,
    MoreVertical,
    Settings,
    Activity,
    TrendingUp,
    CheckCircle,
    UserPlus,
    UserMinus,
    Loader2,
} from 'lucide-react';
import {
    useOrganizations,
    useCreateOrganization,
    useUpdateOrganization,
    useDeleteOrganization,
    Organization,
    useUsers,
    useUpdateUser,
    User,
} from '@/lib/api-hooks';

// Organization User Management Component
function OrgUserManagement({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
    const { data: usersData, refetch: refetchUsers } = useUsers();
    const updateUserMutation = useUpdateUser();
    const [showAddUser, setShowAddUser] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const allUsers = usersData?.data || [];
    
    // Users in this organization
    const orgUsers = allUsers.filter((u: User) => u.organizationId === organizationId);
    
    // Users not in this organization (for adding)
    const availableUsers = allUsers.filter((u: User) => 
        u.organizationId !== organizationId && 
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    const handleAddUser = async (userId: string) => {
        try {
            await updateUserMutation.mutateAsync({ id: userId, organizationId });
            await refetchUsers();
            setSearchQuery('');
        } catch (err) {
            console.error('Failed to add user:', err);
        }
    };
    
    const handleRemoveUser = async (userId: string) => {
        if (!confirm('이 사용자를 조직에서 제거하시겠습니까?')) return;
        try {
            await updateUserMutation.mutateAsync({ id: userId, organizationId: '' });
            await refetchUsers();
        } catch (err) {
            console.error('Failed to remove user:', err);
        }
    };
    
    const roleLabels: Record<string, string> = {
        SYSTEM_ADMIN: 'System Admin',
        ORG_ADMIN: 'Org Admin',
        SECURITY_ADMIN: 'Security Admin',
        PROJECT_ADMIN: 'Project Admin',
        DEVELOPER: 'Developer',
        VIEWER: 'Viewer',
    };
    
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">소속 사용자 ({orgUsers.length})</h4>
                <button
                    onClick={() => setShowAddUser(!showAddUser)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40"
                >
                    <UserPlus className="h-3 w-3" />
                    사용자 추가
                </button>
            </div>
            
            {/* Add User Section */}
            {showAddUser && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="추가할 사용자 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                        />
                    </div>
                    {searchQuery && (
                        <div className="max-h-40 overflow-auto space-y-1">
                            {availableUsers.length > 0 ? (
                                availableUsers.slice(0, 5).map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddUser(user.id)}
                                            disabled={updateUserMutation.isPending}
                                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {updateUserMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '추가'}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-2">검색 결과가 없습니다.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {/* User List */}
            <div className="space-y-2 max-h-60 overflow-auto">
                {orgUsers.length > 0 ? (
                    orgUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Mail className="h-3 w-3" />
                                        {user.email}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                    {roleLabels[user.role] || user.role}
                                </span>
                                <button
                                    onClick={() => handleRemoveUser(user.id)}
                                    disabled={updateUserMutation.isPending}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                    title="조직에서 제거"
                                >
                                    <UserMinus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">소속된 사용자가 없습니다.</p>
                        <p className="text-xs mt-1">위의 '사용자 추가' 버튼으로 사용자를 추가하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminOrganizationsPage() {
    const { data: organizations, isLoading, error, refetch } = useOrganizations();
    const createMutation = useCreateOrganization();
    const updateMutation = useUpdateOrganization();
    const deleteMutation = useDeleteOrganization();

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);

    // Form state
    const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

    const filteredOrganizations = (organizations || []).filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const totalUsers = organizations?.reduce((sum, org) => sum + (org._count?.users || 0), 0) || 0;
    const totalProjects = organizations?.reduce((sum, org) => sum + (org._count?.projects || 0), 0) || 0;

    const openCreateModal = () => {
        setFormData({ name: '', slug: '', description: '' });
        setShowCreateModal(true);
    };

    const openEditModal = (org: Organization) => {
        setFormData({ name: org.name, slug: org.slug, description: org.description || '' });
        setEditingOrg(org);
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setEditingOrg(null);
        setViewingOrg(null);
        setFormData({ name: '', slug: '', description: '' });
    };

    const handleCreate = async () => {
        try {
            // Auto-generate slug if not provided
            const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            await createMutation.mutateAsync({ ...formData, slug });
            closeModals();
        } catch (err) {
            console.error('Failed to create organization:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingOrg) return;
        try {
            await updateMutation.mutateAsync({ id: editingOrg.id, ...formData });
            closeModals();
        } catch (err) {
            console.error('Failed to update organization:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 조직을 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.')) return;
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to delete organization:', err);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setFormData({ ...formData, name, slug });
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
                조직 목록을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">조직 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {organizations?.length || 0}개 조직 관리
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    조직 추가
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">전체 조직</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{organizations?.length || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">전체 사용자</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{totalUsers}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">전체 프로젝트</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{totalProjects}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">평균 사용자</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                {organizations?.length ? Math.round(totalUsers / organizations.length) : 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="조직 이름 또는 슬러그로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                    새로고침
                </button>
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrganizations.map((org) => (
                    <div
                        key={org.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{org.name}</h3>
                                    <p className="text-sm text-slate-500">@{org.slug}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setViewingOrg(org)}
                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title="상세 보기"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => openEditModal(org)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="수정"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(org.id)}
                                    disabled={deleteMutation.isPending}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="삭제"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {org.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                {org.description}
                            </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {org._count?.users || 0} 사용자
                            </span>
                            <span className="flex items-center gap-1">
                                <FolderKanban className="h-4 w-4" />
                                {org._count?.projects || 0} 프로젝트
                            </span>
                        </div>

                        {/* Progress bar for users */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>사용자 점유율</span>
                                <span>{totalUsers > 0 ? Math.round(((org._count?.users || 0) / totalUsers) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-red-500 rounded-full transition-all" 
                                    style={{ width: `${totalUsers > 0 ? ((org._count?.users || 0) / totalUsers) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredOrganizations.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Building2 className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {searchQuery ? '검색 결과가 없습니다' : '조직이 없습니다'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        {searchQuery ? '다른 검색어로 시도해보세요.' : '첫 번째 조직을 추가하세요.'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <Plus className="h-4 w-4" />
                            조직 추가
                        </button>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || editingOrg) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingOrg ? '조직 수정' : '조직 추가'}
                            </h3>
                            <button onClick={closeModals} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    조직 이름 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="ACME Corporation"
                                />
                            </div>
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
                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="acme-corp"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">영문 소문자, 숫자, 하이픈만 허용됩니다.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    설명
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="조직에 대한 설명..."
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
                                onClick={editingOrg ? handleUpdate : handleCreate}
                                disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.slug}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? '처리 중...' : editingOrg ? '저장' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Detail Modal */}
            {viewingOrg && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingOrg(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewingOrg.name}</h3>
                                    <p className="text-sm text-slate-500">@{viewingOrg.slug}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingOrg(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Organization Info */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">조직 정보</h4>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
                                    {viewingOrg.description && (
                                        <div>
                                            <span className="text-xs text-slate-500">설명</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{viewingOrg.description}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-slate-500">생성일</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {viewingOrg.createdAt ? new Date(viewingOrg.createdAt).toLocaleDateString('ko-KR') : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500">ID</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 font-mono text-xs">{viewingOrg.id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">통계</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                                        <Users className="h-8 w-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{viewingOrg._count?.users || 0}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">사용자</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                                        <FolderKanban className="h-8 w-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{viewingOrg._count?.projects || 0}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">프로젝트</p>
                                    </div>
                                </div>
                            </div>

                            {/* User Management Section */}
                            <OrgUserManagement organizationId={viewingOrg.id} organizationName={viewingOrg.name} />

                            {/* Quick Actions */}
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">빠른 작업</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => { setViewingOrg(null); openEditModal(viewingOrg); }}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    >
                                        <Edit className="h-4 w-4" />
                                        수정
                                    </button>
                                    <a
                                        href={`/admin/users?organizationId=${viewingOrg.id}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30"
                                    >
                                        <Users className="h-4 w-4" />
                                        사용자 보기
                                    </a>
                                    <a
                                        href={`/dashboard/projects?organizationId=${viewingOrg.id}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                    >
                                        <FolderKanban className="h-4 w-4" />
                                        프로젝트 보기
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setViewingOrg(null)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
