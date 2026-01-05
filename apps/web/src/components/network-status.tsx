'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * 네트워크 상태 표시 컴포넌트
 * 오프라인 상태일 때 사용자에게 알림을 표시합니다.
 */
export function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [showOfflineMessage, setShowOfflineMessage] = useState(false);
    const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

    useEffect(() => {
        // 초기 상태 설정
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowOfflineMessage(false);
            console.log('[Network] Connection restored');
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOfflineMessage(true);
            setLastOnlineTime(new Date());
            console.log('[Network] Connection lost');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 온라인 상태면 아무것도 렌더링하지 않음
    if (isOnline && !showOfflineMessage) return null;

    // 다시 온라인이 되었을 때 메시지
    if (isOnline && showOfflineMessage) {
        return (
            <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <RefreshCw className="h-5 w-5" />
                    <div>
                        <p className="font-medium">연결 복구됨</p>
                        <p className="text-sm text-green-100">인터넷 연결이 복구되었습니다.</p>
                    </div>
                    <button
                        onClick={() => setShowOfflineMessage(false)}
                        className="ml-2 text-green-100 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    }

    // 오프라인 메시지
    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
            <div className="bg-yellow-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <WifiOff className="h-5 w-5" />
                <div>
                    <p className="font-medium">오프라인 상태</p>
                    <p className="text-sm text-yellow-100">
                        인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.
                    </p>
                    {lastOnlineTime && (
                        <p className="text-xs text-yellow-200 mt-1">
                            마지막 연결: {lastOnlineTime.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * API 에러 메시지 표시 컴포넌트
 */
interface ApiErrorAlertProps {
    error: Error | null;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export function ApiErrorAlert({ error, onRetry, onDismiss }: ApiErrorAlertProps) {
    if (!error) return null;

    // 에러 메시지 추출
    const message = error.message || '알 수 없는 오류가 발생했습니다.';
    const isRetryable = 'isRetryable' in error ? (error as any).isRetryable : false;
    const isNetworkError = 'isNetworkError' in error ? (error as any).isNetworkError : false;

    return (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <p className="text-red-300 font-medium">
                        {isNetworkError ? '네트워크 오류' : '오류 발생'}
                    </p>
                    <p className="text-red-200 text-sm mt-1">{message}</p>
                </div>
                <div className="flex items-center gap-2">
                    {isRetryable && onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 text-red-100 rounded-lg text-sm transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            재시도
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="text-red-300 hover:text-red-100 p-1"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * 로딩 오버레이 with 재시도 버튼
 */
interface LoadingOverlayProps {
    isLoading: boolean;
    error?: Error | null;
    onRetry?: () => void;
    message?: string;
}

export function LoadingOverlay({ isLoading, error, onRetry, message = '로딩 중...' }: LoadingOverlayProps) {
    if (!isLoading && !error) return null;

    return (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-40">
            {isLoading && !error && (
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-300">{message}</p>
                </div>
            )}
            {error && (
                <div className="text-center max-w-md p-6">
                    <WifiOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-300 font-medium mb-2">연결 오류</p>
                    <p className="text-slate-400 text-sm mb-4">{error.message}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mx-auto transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            다시 시도
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * 연결 상태 체크 훅
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline };
}
