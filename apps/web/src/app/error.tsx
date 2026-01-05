'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle, Bug, WifiOff } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // 에러 로깅
        console.error('[Error Page]', error);
    }, [error]);

    // 에러 유형 감지
    const isNetworkError = error.message?.includes('fetch') || 
                           error.message?.includes('network') ||
                           error.message?.includes('연결');
    const isAuthError = error.message?.includes('401') || 
                        error.message?.includes('인증') ||
                        error.message?.includes('로그인');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center">
                {/* Error Icon */}
                <div className="relative mb-8">
                    <div className="w-32 h-32 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                        {isNetworkError ? (
                            <WifiOff className="w-16 h-16 text-red-400" />
                        ) : (
                            <Bug className="w-16 h-16 text-red-400" />
                        )}
                    </div>
                </div>

                {/* Error Message */}
                <h1 className="text-3xl font-bold text-white mb-4">
                    {isNetworkError ? '연결 오류' : isAuthError ? '인증 오류' : '오류가 발생했습니다'}
                </h1>
                
                <p className="text-slate-400 mb-6 leading-relaxed">
                    {isNetworkError ? (
                        '서버에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.'
                    ) : isAuthError ? (
                        '인증이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.'
                    ) : (
                        '예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
                    )}
                </p>

                {/* Error Details (dev mode) */}
                {process.env.NODE_ENV === 'development' && error.message && (
                    <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-left">
                        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Error Details
                        </div>
                        <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                            {error.message}
                        </pre>
                        {error.digest && (
                            <p className="text-xs text-slate-500 mt-2">
                                Digest: {error.digest}
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        다시 시도
                    </button>
                    
                    {isAuthError ? (
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            로그인 페이지로 이동
                        </Link>
                    ) : (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <Home className="w-5 h-5" />
                            대시보드로 이동
                        </Link>
                    )}
                </div>

                {/* Help Text */}
                <p className="mt-8 text-slate-500 text-sm">
                    문제가 지속되면 관리자에게 문의해 주세요.
                </p>
            </div>
        </div>
    );
}
