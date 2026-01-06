'use client';

import { useState, useMemo } from 'react';
import {
    Users,
    Plus,
    Search,
    Edit,
    Trash2,
    Shield,
    ShieldCheck,
    ShieldOff,
    X,
    AlertTriangle,
    Eye,
    Mail,
    Building2,
    Calendar,
    Activity,
    UserCheck,
    UserX,
    Filter,
    Download,
    RefreshCw,
    Clock,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useOrganizations,
    User,
} from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

const roleLabels: Record<string, string> = {
    SYSTEM_ADMIN: 'System Admin',
    ORG_ADMIN: 'Org Admin',
    SECURITY_ADMIN: 'Security Admin',
    PROJECT_ADMIN: 'Project Admin',
    DEVELOPER: 'Developer',
    VIEWER: 'Viewer',
};

const roleColors: Record<string, string> = {
    SYSTEM_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ORG_ADMIN: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    SECURITY_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    PROJECT_ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DEVELOPER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    VIEWER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    ACTIVE: { label: '활성', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    INACTIVE: { label: '비활성', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: XCircle },
    PENDING: { label: '대기', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
};

export default function AdminUsersPage() {
    const { data: users, isLoading, error, refetch } = useUsers();
    const { data: organizations } = useOrganizations();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [orgFilter, setOrgFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'DEVELOPER',
        status: 'ACTIVE',
        organizationId: '',
    });

    // AI Execution for permission recommendation
    const {
        execute: executePermissionRecommend,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('admin.permissionRecommendation');

    const { activePanel, closePanel } = useAiStore();

    const handleAiRecommend = () => {
        const context = {
            screen: 'admin-users',
            users: users?.slice(0, 10) || [],
            organizations: organizations || [],
            timestamp: new Date().toISOString(),
        };
        executePermissionRecommend(context);
    };

    const handleAiRegenerate = () => {
        handleAiRecommend();
    };

    const estimatedTokens = estimateTokens({
        users: users?.slice(0, 5) || [],
    });

    // Statistics
    const stats = useMemo(() => {
        if (!users) return { total: 0, active: 0, inactive: 0, mfaEnabled: 0, byRole: {} as Record<string, number> };
        
        const byRole: Record<string, number> = {};
        let active = 0, inactive = 0, mfaEnabled = 0;
        
        users.forEach(user => {
            byRole[user.role] = (byRole[user.role] || 0) + 1;
            if (user.status === 'ACTIVE') active++;
            else inactive++;
            if (user.mfaEnabled) mfaEnabled++;
        });
        
        return { total: users.length, active, inactive, mfaEnabled, byRole };
    }, [users]);

    const filteredUsers = useMemo(() => {
        return (users || []).filter((user) => {
            const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = !roleFilter || user.role === roleFilter;
            const matchesStatus = !statusFilter || user.status === statusFilter;
            const matchesOrg = !orgFilter || user.organizationId === orgFilter;
            return matchesSearch && matchesRole && matchesStatus && matchesOrg;
        });
    }, [users, searchQuery, roleFilter, statusFilter, orgFilter]);

    const activeFiltersCount = [roleFilter, statusFilter, orgFilter].filter(Boolean).length;

    const openCreateModal = () => {
        setFormData({ name: '', email: '', password: '', role: 'DEVELOPER', status: 'ACTIVE', organizationId: '' });
        setShowCreateModal(true);
    };

    const openEditModal = (user: User) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            status: user.status || 'ACTIVE',
            organizationId: user.organizationId || '',
        });
        setEditingUser(user);
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setEditingUser(null);
        setViewingUser(null);
    };

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(formData);
            closeModals();
        } catch (err) {
            console.error('Failed to create user:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingUser) return;
        try {
            await updateMutation.mutateAsync({ 
                id: editingUser.id, 
                name: formData.name, 
                role: formData.role,
                status: formData.status,
                organizationId: formData.organizationId || undefined,
            });
            closeModals();
        } catch (err) {
            console.error('Failed to update user:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const clearFilters = () => {
        setRoleFilter('');
        setStatusFilter('');
        setOrgFilter('');
    };

    const exportUsers = () => {
        const csv = [
            ['이름', '이메일', '역할', '상태', '조직', 'MFA', '생성일'].join(','),
            ...filteredUsers.map(u => [
                u.name,
                u.email,
                roleLabels[u.role] || u.role,
                statusLabels[u.status]?.label || u.status,
                u.organization?.name || '-',
                u.mfaEnabled ? '활성' : '비활성',
                u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-'
            ].join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
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
                사용자 목록을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">사용자 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {users?.length || 0}명의 사용자 관리
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AiButton
                        action="admin.permissionRecommendation"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiRecommend}
                        onCancel={cancelAi}
                    />
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        사용자 추가
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">전체</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">활성</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <UserX className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">비활성</p>
                            <p className="text-xl font-bold text-slate-600 dark:text-slate-400">{stats.inactive}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">MFA 활성</p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.mfaEnabled}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">관리자</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                {(stats.byRole['SYSTEM_ADMIN'] || 0) + (stats.byRole['ORG_ADMIN'] || 0) + (stats.byRole['SECURITY_ADMIN'] || 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">조직 수</p>
                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{organizations?.length || 0}</p>
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
                            placeholder="이름 또는 이메일로 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">모든 역할</option>
                        {Object.entries(roleLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">모든 상태</option>
                        <option value="ACTIVE">활성</option>
                        <option value="INACTIVE">비활성</option>
                    </select>
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
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            필터 초기화
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        title="새로고침"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                        onClick={exportUsers}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <Download className="h-4 w-4" />
                        내보내기
                    </button>
                </div>
                {activeFiltersCount > 0 && (
                    <p className="mt-2 text-sm text-slate-500">
                        {filteredUsers.length}명의 사용자 표시 중 ({activeFiltersCount}개 필터 적용)
                    </p>
                )}
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
                                역할
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                조직
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                상태
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                MFA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                마지막 로그인
                            </th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredUsers.map((user) => {
                            const StatusIcon = statusLabels[user.status]?.icon || Activity;
                            return (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role] || 'bg-slate-100 text-slate-700'}`}>
                                            {roleLabels[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {user.organization?.name || <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusLabels[user.status]?.color || ''}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusLabels[user.status]?.label || user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.mfaEnabled ? (
                                            <ShieldCheck className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <ShieldOff className="h-5 w-5 text-slate-300" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {user.lastLoginAt ? (
                                            <span title={new Date(user.lastLoginAt).toLocaleString('ko-KR')}>
                                                {new Date(user.lastLoginAt).toLocaleDateString('ko-KR')}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setViewingUser(user)}
                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                title="상세 보기"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="수정"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                disabled={deleteMutation.isPending}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                title="삭제"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center">
                        <Users className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {searchQuery || activeFiltersCount ? '검색 결과가 없습니다' : '사용자가 없습니다'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            {searchQuery || activeFiltersCount ? '다른 검색어나 필터를 시도해보세요.' : '첫 번째 사용자를 추가하세요.'}
                        </p>
                        {!searchQuery && !activeFiltersCount && (
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                <Plus className="h-4 w-4" />
                                사용자 추가
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingUser) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingUser ? '사용자 수정' : '사용자 추가'}
                            </h3>
                            <button onClick={closeModals} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    이름 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    이메일 *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!!editingUser}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        비밀번호 *
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        역할
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        {Object.entries(roleLabels).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                {editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            상태
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            <option value="ACTIVE">활성</option>
                                            <option value="INACTIVE">비활성</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            {organizations && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        조직
                                    </label>
                                    <select
                                        value={formData.organizationId}
                                        onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">조직 선택...</option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={closeModals}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={editingUser ? handleUpdate : handleCreate}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? '처리 중...' : editingUser ? '저장' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View User Detail Modal */}
            {viewingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingUser(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center">
                                    <span className="text-lg font-medium text-red-600 dark:text-red-400">
                                        {viewingUser.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewingUser.name}</h3>
                                    <p className="text-sm text-slate-500">{viewingUser.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">역할</p>
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${roleColors[viewingUser.role] || ''}`}>
                                        {roleLabels[viewingUser.role] || viewingUser.role}
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">상태</p>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusLabels[viewingUser.status]?.color || ''}`}>
                                        {statusLabels[viewingUser.status]?.label || viewingUser.status}
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">조직</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {viewingUser.organization?.name || '-'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">MFA</p>
                                    <div className="flex items-center gap-1">
                                        {viewingUser.mfaEnabled ? (
                                            <>
                                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                                <span className="text-sm text-green-600">활성</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldOff className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm text-slate-500">비활성</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-500">가입일:</span>
                                    <span className="text-slate-900 dark:text-white">
                                        {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString('ko-KR') : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Activity className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-500">마지막 로그인:</span>
                                    <span className="text-slate-900 dark:text-white">
                                        {viewingUser.lastLoginAt ? new Date(viewingUser.lastLoginAt).toLocaleString('ko-KR') : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => { setViewingUser(null); openEditModal(viewingUser); }}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Edit className="h-4 w-4" />
                                수정
                            </button>
                            <button
                                onClick={() => setViewingUser(null)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'admin.permissionRecommendation'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="admin.permissionRecommendation"
            />
        </div>
    );
}
