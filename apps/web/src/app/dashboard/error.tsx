'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, WifiOff, Bug } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('[Dashboard Error]', error);
    }, [error]);

    const isNetworkError = error.message?.includes('fetch') || 
                           error.message?.includes('network') ||
                           error.message?.includes('연결');

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* Error Icon */}
                <div className="w-24 h-24 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 mb-6">
                    {isNetworkError ? (
                        <WifiOff className="w-12 h-12 text-red-400" />
                    ) : (
                        <Bug className="w-12 h-12 text-red-400" />
                    )}
                </div>

                {/* Error Message */}
                <h2 className="text-xl font-semibold text-white mb-3">
                    {isNetworkError ? '서버 연결 오류' : '오류가 발생했습니다'}
                </h2>
                <p className="text-slate-400 mb-6">
                    {isNetworkError 
                        ? '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.' 
                        : '예기치 않은 오류가 발생했습니다.'}
                </p>

                {/* Error Details (dev mode) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-6 p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-left">
                        <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                            {error.message}
                        </pre>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        다시 시도
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        대시보드
                    </Link>
                </div>
            </div>
        </div>
    );
}
