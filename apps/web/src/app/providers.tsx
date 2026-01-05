'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/lib/api-hooks';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // 데이터 신선도 - 30초간 fresh로 유지
                        staleTime: 30 * 1000,
                        // 가비지 컬렉션 시간 - 오프라인 시 10분간 캐시 유지
                        gcTime: 10 * 60 * 1000,
                        // 윈도우 포커스 시 refetch 비활성화 (오프라인 환경 안정성)
                        refetchOnWindowFocus: false,
                        // 재연결 시 refetch
                        refetchOnReconnect: true,
                        // 재시도 로직
                        retry: (failureCount, error) => {
                            // ApiError 인스턴스 확인
                            if (error instanceof ApiError) {
                                // 401 Unauthorized - 인증 문제이므로 재시도하지 않음
                                // (authFetch에서 이미 토큰 갱신 시도함)
                                if (error.status === 401) return false;
                                // 400 Bad Request - 잘못된 요청이므로 재시도하지 않음
                                if (error.status === 400) return false;
                                // 403 Forbidden - 권한 문제이므로 재시도하지 않음
                                if (error.status === 403) return false;
                                // 404 Not Found - 리소스 없음이므로 재시도하지 않음
                                if (error.status === 404) return false;
                                // 네트워크 에러 또는 5xx는 최대 3회 재시도
                                if (error.isRetryable || error.isNetworkError) {
                                    return failureCount < 3;
                                }
                            }
                            // 기타 에러 - 최대 2회 재시도
                            return failureCount < 2;
                        },
                        // 지수 백오프 재시도 딜레이
                        retryDelay: (attemptIndex) => {
                            const delay = Math.min(1000 * Math.pow(2, attemptIndex), 30000);
                            return delay + Math.random() * 500; // 지터 추가
                        },
                    },
                    mutations: {
                        // Mutation은 기본적으로 재시도하지 않음
                        // (데이터 변경 작업은 중복 실행 위험)
                        retry: false,
                        // 네트워크 에러 시에만 재시도 허용
                        onError: (error) => {
                            if (error instanceof ApiError && error.isNetworkError) {
                                console.warn('[Mutation] Network error occurred:', error.message);
                            }
                        },
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}

