'use client';

import { useState, useMemo } from 'react';
import {
    Key,
    Plus,
    Trash2,
    Search,
    Filter,
    Building2,
    Clock,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronDown,
    MoreHorizontal,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Shield,
} from 'lucide-react';
import { useApiTokens, useCreateApiToken, useDeleteApiToken, type ApiToken } from '@/lib/api-hooks';

const availableScopes = [
    { id: 'scans:read', label: '스캔 읽기', category: '스캔' },
    { id: 'scans:write', label: '스캔 쓰기', category: '스캔' },
    { id: 'vulnerabilities:read', label: '취약점 읽기', category: '취약점' },
    { id: 'vulnerabilities:write', label: '취약점 쓰기', category: '취약점' },
    { id: 'projects:read', label: '프로젝트 읽기', category: '프로젝트' },
    { id: 'projects:write', label: '프로젝트 쓰기', category: '프로젝트' },
    { id: 'policies:read', label: '정책 읽기', category: '정책' },
    { id: 'policies:write', label: '정책 쓰기', category: '정책' },
    { id: 'reports:read', label: '리포트 읽기', category: '리포트' },
    { id: 'reports:write', label: '리포트 쓰기', category: '리포트' },
    { id: 'admin', label: '관리자', category: '관리' },
];

function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRelativeTime(dateString: string | null) {
    if (!dateString) return '사용 안 됨';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return `${Math.floor(days / 30)}개월 전`;
}

function getTokenStatus(token: ApiToken): { status: 'active' | 'expired' | 'expiring'; label: string; color: string } {
    if (token.expiresAt) {
        const expiresAt = new Date(token.expiresAt);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return { status: 'expired', label: '만료됨', color: 'text-red-500 bg-red-100 dark:bg-red-900/30' };
        }
        if (daysUntilExpiry <= 7) {
            return { status: 'expiring', label: `${daysUntilExpiry}일 후 만료`, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
        }
    }
    return { status: 'active', label: '활성', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
}

export default function AdminApiTokensPage() {
    const { data: tokens = [], isLoading, error, refetch } = useApiTokens();
    const createMutation = useCreateApiToken();
    const deleteMutation = useDeleteApiToken();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'expiring'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);
    const [showTokenDetail, setShowTokenDetail] = useState(false);

    // Create form states
    const [tokenName, setTokenName] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [expiresIn, setExpiresIn] = useState<'30' | '90' | '365' | 'never'>('90');
    const [newToken, setNewToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Filter tokens
    const filteredTokens = useMemo(() => {
        return tokens.filter((token: ApiToken) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!token.name.toLowerCase().includes(query) &&
                    !token.tokenPrefix.toLowerCase().includes(query)) {
                    return false;
                }
            }

            // Status filter
            if (statusFilter !== 'all') {
                const tokenStatus = getTokenStatus(token);
                if (tokenStatus.status !== statusFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [tokens, searchQuery, statusFilter]);

    // Stats
    const stats = useMemo(() => {
        const total = tokens.length;
        let active = 0;
        let expired = 0;
        let expiring = 0;

        tokens.forEach((token: ApiToken) => {
            const status = getTokenStatus(token);
            if (status.status === 'active') active++;
            else if (status.status === 'expired') expired++;
            else if (status.status === 'expiring') expiring++;
        });

        return { total, active, expired, expiring };
    }, [tokens]);

    const handleCreate = async () => {
        if (!tokenName) return;

        const expiresInDays = expiresIn === 'never' ? undefined : parseInt(expiresIn, 10);

        try {
            const result = await createMutation.mutateAsync({
                name: tokenName,
                permissions: selectedScopes.length > 0 ? selectedScopes : ['scans:read'],
                expiresIn: expiresInDays,
            });
            setNewToken(result.token);
        } catch (err) {
            console.error('Failed to create token:', err);
        }
    };

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async (id: string) => {
        if (confirm('이 토큰을 삭제하시겠습니까? 이 토큰을 사용하는 모든 시스템에서 인증이 실패합니다.')) {
            try {
                await deleteMutation.mutateAsync(id);
                if (selectedToken?.id === id) {
                    setSelectedToken(null);
                    setShowTokenDetail(false);
                }
            } catch (err) {
                console.error('Failed to delete token:', err);
            }
        }
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setNewToken(null);
        setTokenName('');
        setSelectedScopes([]);
        setExpiresIn('90');
        setCopied(false);
    };

    const toggleScope = (scopeId: string) => {
        setSelectedScopes(prev =>
            prev.includes(scopeId) ? prev.filter(s => s !== scopeId) : [...prev, scopeId]
        );
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">오류 발생</h3>
                <p className="text-red-600 dark:text-red-300 mb-4">토큰 목록을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                        <Key className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API 토큰 관리</h1>
                        <p className="text-slate-600 dark:text-slate-400">조직의 모든 API 토큰을 관리합니다</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                    >
                        <Plus className="h-4 w-4" />
                        토큰 생성
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Key className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">전체 토큰</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">활성 토큰</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">곧 만료</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.expiring}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">만료됨</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="토큰 이름 또는 접두사로 검색..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">상태:</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        {[
                            { value: 'all' as const, label: '전체' },
                            { value: 'active' as const, label: '활성' },
                            { value: 'expiring' as const, label: '곧 만료' },
                            { value: 'expired' as const, label: '만료됨' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setStatusFilter(option.value)}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                    statusFilter === option.value
                                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tokens Table */}
            {filteredTokens.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Key className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {tokens.length === 0 ? 'API 토큰이 없습니다' : '검색 결과가 없습니다'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        {tokens.length === 0
                            ? 'CI/CD 파이프라인이나 외부 도구와 연동하려면 토큰을 생성하세요.'
                            : '다른 검색어나 필터를 시도해보세요.'}
                    </p>
                    {tokens.length === 0 && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            첫 토큰 생성
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">토큰</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">권한</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">상태</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">마지막 사용</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">만료일</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredTokens.map((token: ApiToken) => {
                                const status = getTokenStatus(token);
                                return (
                                    <tr key={token.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-lg flex items-center justify-center">
                                                    <Key className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{token.name}</p>
                                                    <p className="text-sm font-mono text-slate-500">{token.tokenPrefix}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {token.permissions.slice(0, 3).map((perm) => (
                                                    <span
                                                        key={perm}
                                                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs"
                                                    >
                                                        {perm}
                                                    </span>
                                                ))}
                                                {token.permissions.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                        +{token.permissions.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {formatRelativeTime(token.lastUsedAt)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {token.expiresAt ? formatDate(token.expiresAt) : '만료 없음'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedToken(token);
                                                        setShowTokenDetail(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="상세 보기"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(token.tokenPrefix)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="접두사 복사"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(token.id)}
                                                    disabled={deleteMutation.isPending}
                                                    className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="삭제"
                                                >
                                                    {deleteMutation.isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Token Detail Modal */}
            {showTokenDetail && selectedToken && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">토큰 상세 정보</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm text-slate-500">이름</label>
                                <p className="text-lg font-medium text-slate-900 dark:text-white">{selectedToken.name}</p>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">토큰 접두사</label>
                                <p className="font-mono text-slate-700 dark:text-slate-300">{selectedToken.tokenPrefix}...</p>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500">권한</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedToken.permissions.map((perm) => (
                                        <span
                                            key={perm}
                                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                                        >
                                            {perm}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-500">생성일</label>
                                    <p className="text-slate-700 dark:text-slate-300">{formatDate(selectedToken.createdAt)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-500">만료일</label>
                                    <p className="text-slate-700 dark:text-slate-300">
                                        {selectedToken.expiresAt ? formatDate(selectedToken.expiresAt) : '만료 없음'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-500">마지막 사용</label>
                                    <p className="text-slate-700 dark:text-slate-300">
                                        {selectedToken.lastUsedAt ? formatDate(selectedToken.lastUsedAt) : '사용 안 됨'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-500">상태</label>
                                    <span className={`inline-flex px-2 py-1 text-sm rounded-full ${getTokenStatus(selectedToken).color}`}>
                                        {getTokenStatus(selectedToken).label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                            <button
                                onClick={() => handleDelete(selectedToken.id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                토큰 삭제
                            </button>
                            <button
                                onClick={() => setShowTokenDetail(false)}
                                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Token Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {!newToken ? (
                            <>
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Key className="h-5 w-5 text-blue-600" />
                                        새 API 토큰 생성
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Token Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            토큰 이름 <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={tokenName}
                                            onChange={(e) => setTokenName(e.target.value)}
                                            placeholder="예: CI/CD Pipeline, Staging Environment"
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Scopes */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            권한 선택
                                        </label>
                                        <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                            {availableScopes.map((scope) => (
                                                <label
                                                    key={scope.id}
                                                    className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedScopes.includes(scope.id)}
                                                        onChange={() => toggleScope(scope.id)}
                                                        className="rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {scope.label}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                                                        {scope.category}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Expiration */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            만료 기간
                                        </label>
                                        <select
                                            value={expiresIn}
                                            onChange={(e) => setExpiresIn(e.target.value as '30' | '90' | '365' | 'never')}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="30">30일</option>
                                            <option value="90">90일</option>
                                            <option value="365">1년</option>
                                            <option value="never">만료 없음</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                    <button
                                        onClick={closeCreateModal}
                                        className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!tokenName || createMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {createMutation.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                생성 중...
                                            </>
                                        ) : (
                                            '토큰 생성'
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-6 w-6 text-green-500" />
                                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                            토큰이 생성되었습니다
                                        </h2>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 mb-4">
                                        <code className="block text-sm font-mono text-slate-900 dark:text-white break-all">
                                            {newToken}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(newToken!)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle className="h-4 w-4" />
                                                복사됨!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                토큰 복사
                                            </>
                                        )}
                                    </button>
                                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                            이 토큰은 다시 표시되지 않습니다. 안전한 곳에 저장해주세요.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                    <button
                                        onClick={closeCreateModal}
                                        className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        완료
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
