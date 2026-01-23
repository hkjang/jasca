'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Database,
    RefreshCw,
    Play,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Loader2,
    Server,
    TableIcon,
    History,
    Sprout,
    Zap,
    HelpCircle,
    X,
    Info,
    AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface DbStatus {
    connected: boolean;
    version: string | null;
    lastMigration: string | null;
    pendingCount: number;
    tablesCount: number;
}

interface MigrationInfo {
    id: string;
    name: string;
    appliedAt: string | null;
    status: 'applied' | 'pending';
}

interface MigrationResult {
    success: boolean;
    message: string;
    output?: string;
    error?: string;
}

interface HealthCheck {
    healthy: boolean;
    latencyMs: number;
}

export default function DatabaseAdminPage() {
    const { accessToken } = useAuthStore();
    const [status, setStatus] = useState<DbStatus | null>(null);
    const [health, setHealth] = useState<HealthCheck | null>(null);
    const [migrations, setMigrations] = useState<{
        applied: MigrationInfo[];
        pending: MigrationInfo[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [result, setResult] = useState<MigrationResult | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<'migrate' | 'seed' | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const getAuthHeaders = useCallback(() => {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };
    }, [accessToken]);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/database/status', {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
        }
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const response = await fetch('/api/database/health', {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setHealth(data);
            }
        } catch (error) {
            console.error('Failed to fetch health:', error);
        }
    }, []);

    const fetchMigrations = useCallback(async () => {
        try {
            const response = await fetch('/api/database/migrations', {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setMigrations(data);
            }
        } catch (error) {
            console.error('Failed to fetch migrations:', error);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchStatus(), fetchHealth(), fetchMigrations()]);
        setLoading(false);
    }, [fetchStatus, fetchHealth, fetchMigrations]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const handleMigrate = async () => {
        setShowConfirmModal(null);
        setActionLoading('migrate');
        setResult(null);
        try {
            const response = await fetch('/api/database/migrate', {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            const data = await response.json();
            setResult(data);
            setShowLogModal(true);
            if (data.success) {
                await loadAll();
            }
        } catch (error: any) {
            setResult({
                success: false,
                message: '마이그레이션 요청 중 오류가 발생했습니다.',
                error: error.message,
            });
            setShowLogModal(true);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSeed = async () => {
        setShowConfirmModal(null);
        setActionLoading('seed');
        setResult(null);
        try {
            const response = await fetch('/api/database/seed', {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            const data = await response.json();
            setResult(data);
            setShowLogModal(true);
        } catch (error: any) {
            setResult({
                success: false,
                message: '시드 실행 요청 중 오류가 발생했습니다.',
                error: error.message,
            });
            setShowLogModal(true);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRegenerateClient = async () => {
        setActionLoading('regenerate');
        setResult(null);
        try {
            const response = await fetch('/api/database/regenerate-client', {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            const data = await response.json();
            setResult(data);
            setShowLogModal(true);
        } catch (error: any) {
            setResult({
                success: false,
                message: 'Prisma 클라이언트 재생성 중 오류가 발생했습니다.',
                error: error.message,
            });
            setShowLogModal(true);
        } finally {
            setActionLoading(null);
        }
    };

    const formatMigrationName = (name: string) => {
        // 20251217045333_init -> 2025-12-17 04:53:33 init
        const match = name.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})_(.+)$/);
        if (match) {
            return {
                date: `${match[1]}-${match[2]}-${match[3]}`,
                time: `${match[4]}:${match[5]}:${match[6]}`,
                label: match[7].replace(/_/g, ' '),
            };
        }
        return { date: '', time: '', label: name };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600 dark:text-slate-400">데이터베이스 정보를 불러오는 중...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Database className="h-7 w-7 text-blue-600" />
                        데이터베이스 관리
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        데이터베이스 상태 확인 및 마이그레이션을 관리합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelpModal(true)}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="도움말"
                    >
                        <HelpCircle className="h-5 w-5" />
                    </button>
                    <button
                        onClick={loadAll}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Connection Status */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                status?.connected 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                <Server className={`h-5 w-5 ${
                                    status?.connected ? 'text-green-600' : 'text-red-600'
                                }`} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">연결 상태</p>
                                <p className={`text-lg font-semibold ${
                                    status?.connected 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-red-600 dark:text-red-400'
                                }`}>
                                    {status?.connected ? '연결됨' : '연결 끊김'}
                                </p>
                            </div>
                        </div>
                        {status?.connected ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                        )}
                    </div>
                    {health && (
                        <p className="mt-2 text-xs text-slate-500">
                            응답 시간: {health.latencyMs}ms
                        </p>
                    )}
                </div>

                {/* Tables Count */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <TableIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">테이블 수</p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                {status?.tablesCount || 0}개
                            </p>
                        </div>
                    </div>
                </div>

                {/* Last Migration */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <History className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">마지막 마이그레이션</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={status?.lastMigration || ''}>
                                {status?.lastMigration 
                                    ? formatMigrationName(status.lastMigration).label 
                                    : '없음'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending Migrations */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            (status?.pendingCount || 0) > 0 
                                ? 'bg-amber-100 dark:bg-amber-900/30' 
                                : 'bg-green-100 dark:bg-green-900/30'
                        }`}>
                            <Clock className={`h-5 w-5 ${
                                (status?.pendingCount || 0) > 0 ? 'text-amber-600' : 'text-green-600'
                            }`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">대기 중</p>
                            <p className={`text-lg font-semibold ${
                                (status?.pendingCount || 0) > 0 
                                    ? 'text-amber-600 dark:text-amber-400' 
                                    : 'text-green-600 dark:text-green-400'
                            }`}>
                                {status?.pendingCount || 0}개
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PostgreSQL Version */}
            {status?.version && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">PostgreSQL 버전:</span> {status.version.split(' ').slice(0, 2).join(' ')}
                    </p>
                </div>
            )}

            {/* Actions Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">데이터베이스 작업</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Migrate Button */}
                    <button
                        onClick={() => setShowConfirmModal('migrate')}
                        disabled={actionLoading !== null || (migrations?.pending.length || 0) === 0}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 dark:disabled:text-slate-400 rounded-lg font-medium transition-colors"
                    >
                        {actionLoading === 'migrate' ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Play className="h-5 w-5" />
                        )}
                        마이그레이션 실행
                        {(migrations?.pending.length || 0) > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500 rounded-full">
                                {migrations?.pending.length}
                            </span>
                        )}
                    </button>

                    {/* Seed Button */}
                    <button
                        onClick={() => setShowConfirmModal('seed')}
                        disabled={actionLoading !== null}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 dark:disabled:text-slate-400 rounded-lg font-medium transition-colors"
                    >
                        {actionLoading === 'seed' ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Sprout className="h-5 w-5" />
                        )}
                        시드 데이터 실행
                    </button>

                    {/* Regenerate Client Button */}
                    <button
                        onClick={handleRegenerateClient}
                        disabled={actionLoading !== null}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 dark:disabled:text-slate-400 rounded-lg font-medium transition-colors"
                    >
                        {actionLoading === 'regenerate' ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Zap className="h-5 w-5" />
                        )}
                        클라이언트 재생성
                    </button>
                </div>
            </div>

            {/* Pending Migrations */}
            {migrations?.pending && migrations.pending.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                            대기 중인 마이그레이션 ({migrations.pending.length}개)
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="space-y-2">
                            {migrations.pending.map((migration) => {
                                const formatted = formatMigrationName(migration.name);
                                return (
                                    <div
                                        key={migration.name}
                                        className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-amber-100 dark:border-amber-900"
                                    >
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {formatted.label}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {formatted.date} {formatted.time}
                                            </p>
                                        </div>
                                        <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                                            대기
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Migration History */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        마이그레이션 히스토리 ({migrations?.applied.length || 0}개)
                    </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
                    {migrations?.applied.map((migration, index) => {
                        const formatted = formatMigrationName(migration.name);
                        return (
                            <div
                                key={migration.id || index}
                                className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            >
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                        {formatted.label}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatted.date} {formatted.time}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                                        적용됨
                                    </span>
                                    {migration.appliedAt && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            {new Date(migration.appliedAt).toLocaleDateString('ko-KR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {(!migrations?.applied || migrations.applied.length === 0) && (
                        <div className="px-6 py-8 text-center text-slate-500">
                            적용된 마이그레이션이 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {showConfirmModal === 'migrate' ? '마이그레이션 실행 확인' : '시드 데이터 실행 확인'}
                            </h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {showConfirmModal === 'migrate' 
                                ? '데이터베이스 스키마가 변경됩니다. 이 작업은 되돌리기 어려울 수 있습니다. 계속하시겠습니까?' 
                                : '시드 데이터가 데이터베이스에 삽입됩니다. 이미 데이터가 있는 경우 충돌이 발생할 수 있습니다. 계속하시겠습니까?'}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(null)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={showConfirmModal === 'migrate' ? handleMigrate : handleSeed}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                실행
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Modal */}
            {showLogModal && result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                result.success 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                {result.success ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                            </div>
                            <h3 className={`text-lg font-semibold ${
                                result.success 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                            }`}>
                                {result.success ? '실행 성공' : '실행 실패'}
                            </h3>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mb-4">{result.message}</p>
                        {(result.output || result.error) && (
                            <div className="flex-1 overflow-auto bg-slate-900 rounded-lg p-4 mb-4">
                                <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
                                    {result.output || result.error}
                                </pre>
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowLogModal(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full mx-4 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-blue-600" />
                                데이터베이스 관리 도움말
                            </h3>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Overview */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                            이 기능은 무엇인가요?
                                        </h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            오프라인 환경이나 Docker 컨테이너에서 CLI를 직접 사용할 수 없는 경우,
                                            관리자 UI를 통해 데이터베이스 마이그레이션을 안전하게 실행할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                                    기능 설명
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Play className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">마이그레이션 실행</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                대기 중인 스키마 변경사항을 데이터베이스에 적용합니다. 
                                                <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">prisma migrate deploy</code> 명령을 실행합니다.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Sprout className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">시드 데이터 실행</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                초기 데이터(사용자, 조직, 샘플 데이터 등)를 데이터베이스에 삽입합니다.
                                                <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">prisma db seed</code> 명령을 실행합니다.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Zap className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">클라이언트 재생성</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                Prisma 클라이언트를 다시 생성합니다. 스키마 변경 후 타입 정의를 갱신할 때 사용합니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Warnings */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                                            주의사항
                                        </h4>
                                        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                            <li>• <strong>개발 서버 실행 중</strong>에는 클라이언트 재생성이 실패할 수 있습니다 (파일 잠금)</li>
                                            <li>• <strong>마이그레이션</strong>은 되돌리기 어려우므로 백업 후 실행하세요</li>
                                            <li>• 모든 작업은 <strong>감사 로그</strong>에 기록됩니다</li>
                                            <li>• <strong>SYSTEM_ADMIN</strong> 권한이 있는 사용자만 이 기능을 사용할 수 있습니다</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Dev Environment Tips */}
                            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                                    💡 개발 환경에서 실패하는 경우
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    개발 서버 (<code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">npm run dev</code>)가 
                                    실행 중이면 일부 작업이 파일 잠금으로 인해 실패할 수 있습니다.
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    이 경우 개발 서버를 중지한 후 터미널에서 직접 명령을 실행하거나, 
                                    Docker/프로덕션 환경에서 이 UI를 사용하세요.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
