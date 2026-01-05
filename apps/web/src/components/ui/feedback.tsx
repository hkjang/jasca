'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            문제가 발생했습니다
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            페이지를 로드하는 중 오류가 발생했습니다. 다시 시도하거나 홈으로 돌아가세요.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" />
                                다시 시도
                            </button>
                            <Link
                                href="/"
                                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Home className="h-4 w-4" />
                                홈으로
                            </Link>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                                    오류 세부 정보
                                </summary>
                                <pre className="mt-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Empty state component
export function EmptyState({
    icon: Icon = AlertTriangle,
    title,
    description,
    action,
}: {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-6">
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

// Loading spinner with optional text
export function LoadingSpinner({
    size = 'md',
    text,
}: {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={`${sizeClasses[size]} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`}
            />
            {text && (
                <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
            )}
        </div>
    );
}

// Page loading skeleton
export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                        <div className="h-10 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                ))}
            </div>

            {/* Chart skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
                    <div className="h-64 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
                    <div className="h-64 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// Table loading skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-3 flex gap-4">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-600 rounded" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-600 rounded" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-600 rounded" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-600 rounded" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-4 animate-pulse"
                >
                    <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
            ))}
        </div>
    );
}
