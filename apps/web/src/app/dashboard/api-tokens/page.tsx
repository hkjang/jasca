'use client';

import { useState } from 'react';
import {
    Key,
    Plus,
    Copy,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { useApiTokens, useCreateApiToken, useDeleteApiToken, type ApiToken } from '@/lib/api-hooks';

const availableScopes = [
    { id: 'scans:read', label: '스캔 읽기', desc: '스캔 결과 조회' },
    { id: 'scans:write', label: '스캔 쓰기', desc: '스캔 생성 및 수정' },
    { id: 'vulnerabilities:read', label: '취약점 읽기', desc: '취약점 정보 조회' },
    { id: 'vulnerabilities:write', label: '취약점 쓰기', desc: '취약점 상태 변경' },
    { id: 'projects:read', label: '프로젝트 읽기', desc: '프로젝트 정보 조회' },
    { id: 'policies:read', label: '정책 읽기', desc: '정책 정보 조회' },
];

function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export default function ApiTokensPage() {
    const { data: tokens = [], isLoading, error } = useApiTokens();
    const createMutation = useCreateApiToken();
    const deleteMutation = useDeleteApiToken();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [showToken, setShowToken] = useState(false);
    const [copied, setCopied] = useState(false);

    // Create form states
    const [tokenName, setTokenName] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [expiresIn, setExpiresIn] = useState<'30' | '90' | '365' | 'never'>('90');

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

    const handleCopy = async () => {
        if (newToken) {
            await navigator.clipboard.writeText(newToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('이 토큰을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err) {
                console.error('Failed to delete token:', err);
            }
        }
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setNewToken(null);
        setTokenName('');
        setSelectedScopes([]);
        setExpiresIn('90');
        setCopied(false);
        setShowToken(false);
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">오류 발생</h3>
                <p className="text-red-600 dark:text-red-300">토큰 목록을 불러오는데 실패했습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API 토큰</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        API 접근을 위한 토큰을 관리합니다
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    토큰 생성
                </button>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>보안 주의:</strong> API 토큰은 생성 시에만 전체 값을 확인할 수 있습니다.
                    토큰을 안전하게 보관하고, 유출되었다고 의심되면 즉시 삭제해주세요.
                </div>
            </div>

            {/* Tokens List */}
            {tokens.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Key className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        API 토큰이 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        CI/CD 파이프라인이나 외부 도구와 연동하려면 토큰을 생성하세요.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        첫 토큰 생성
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {tokens.map((token: ApiToken) => (
                            <div key={token.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                            <Key className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">{token.name}</h3>
                                            <p className="text-sm font-mono text-slate-500">{token.tokenPrefix}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(token.id)}
                                        disabled={deleteMutation.isPending}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {deleteMutation.isPending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {token.permissions.map((scope) => (
                                        <span
                                            key={scope}
                                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs"
                                        >
                                            {scope}
                                        </span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">생성일</span>
                                        <p className="text-slate-700 dark:text-slate-300">{formatDate(token.createdAt)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">마지막 사용</span>
                                        <p className="text-slate-700 dark:text-slate-300">{formatDate(token.lastUsedAt)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">만료일</span>
                                        <p className="text-slate-700 dark:text-slate-300">{formatDate(token.expiresAt)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
                        {!newToken ? (
                            <>
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                        새 API 토큰 생성
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Token Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            토큰 이름
                                        </label>
                                        <input
                                            type="text"
                                            value={tokenName}
                                            onChange={(e) => setTokenName(e.target.value)}
                                            placeholder="예: CI/CD Pipeline"
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Scopes */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            권한 선택
                                        </label>
                                        <div className="space-y-2">
                                            {availableScopes.map((scope) => (
                                                <label
                                                    key={scope.id}
                                                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedScopes.includes(scope.id)}
                                                        onChange={() => toggleScope(scope.id)}
                                                        className="mt-0.5"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {scope.label}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{scope.desc}</p>
                                                    </div>
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
                                        onClick={closeModal}
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
                                        <div className="flex items-center gap-2 mb-2">
                                            <button
                                                onClick={() => setShowToken(!showToken)}
                                                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            >
                                                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                            <span className="text-xs text-slate-500">
                                                {showToken ? '숨기기' : '토큰 보기'}
                                            </span>
                                        </div>
                                        <code className="block text-sm font-mono text-slate-900 dark:text-white break-all">
                                            {showToken ? newToken : newToken?.replace(/./g, '•')}
                                        </code>
                                    </div>
                                    <button
                                        onClick={handleCopy}
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
                                    <p className="mt-4 text-sm text-yellow-600 dark:text-yellow-400">
                                        <AlertTriangle className="inline h-4 w-4 mr-1" />
                                        이 토큰은 다시 표시되지 않습니다. 안전한 곳에 저장해주세요.
                                    </p>
                                </div>
                                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                    <button
                                        onClick={closeModal}
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
