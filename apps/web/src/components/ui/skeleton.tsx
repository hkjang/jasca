'use client';

import * as React from 'react';

// ============================================
// Skeleton Component
// ============================================
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'circular' | 'rounded';
    animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
    className,
    variant = 'default',
    animation = 'pulse',
    ...props
}: SkeletonProps) {
    const variantStyles = {
        default: 'rounded',
        circular: 'rounded-full',
        rounded: 'rounded-lg',
    };

    const animationStyles = {
        pulse: 'animate-pulse',
        shimmer: 'shimmer',
        none: '',
    };

    return (
        <div
            className={`bg-slate-200 dark:bg-slate-700 ${variantStyles[variant]} ${animationStyles[animation]} ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Text Skeleton
// ============================================
export interface TextSkeletonProps {
    lines?: number;
    widths?: (string | number)[];
    className?: string;
}

export function TextSkeleton({ lines = 3, widths, className }: TextSkeletonProps) {
    const defaultWidths = ['100%', '95%', '80%', '70%', '60%'];

    return (
        <div className={`space-y-2 ${className || ''}`}>
            {Array.from({ length: lines }).map((_, i) => {
                const width = widths?.[i] || defaultWidths[i % defaultWidths.length];
                return (
                    <Skeleton
                        key={i}
                        className="h-4"
                        style={{ width: typeof width === 'number' ? `${width}%` : width }}
                    />
                );
            })}
        </div>
    );
}

// ============================================
// Card Skeleton
// ============================================
export interface CardSkeletonProps {
    hasImage?: boolean;
    lines?: number;
    className?: string;
}

export function CardSkeleton({ hasImage = false, lines = 3, className }: CardSkeletonProps) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className || ''}`}>
            {hasImage && (
                <Skeleton className="w-full h-40" variant="default" />
            )}
            <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <TextSkeleton lines={lines} />
            </div>
        </div>
    );
}

// ============================================
// Stat Card Skeleton
// ============================================
export function StatCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className || ''}`}>
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
        </div>
    );
}

// ============================================
// Table Skeleton
// ============================================
export interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
    return (
        <div className={`w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 ${className || ''}`}>
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Body */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="px-4 py-4 flex gap-4">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <Skeleton
                                key={colIndex}
                                className="h-4 flex-1"
                                style={{ width: `${60 + Math.random() * 40}%` }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// Avatar Skeleton
// ============================================
export interface AvatarSkeletonProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function AvatarSkeleton({ size = 'md', className }: AvatarSkeletonProps) {
    const sizes = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
    };

    return <Skeleton className={`${sizes[size]} ${className || ''}`} variant="circular" />;
}

// ============================================
// List Skeleton
// ============================================
export interface ListSkeletonProps {
    items?: number;
    showAvatar?: boolean;
    className?: string;
}

export function ListSkeleton({ items = 5, showAvatar = true, className }: ListSkeletonProps) {
    return (
        <div className={`space-y-4 ${className || ''}`}>
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    {showAvatar && <AvatarSkeleton />}
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================
// Chart Skeleton
// ============================================
export function ChartSkeleton({ className }: { className?: string }) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className || ''}`}>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex items-end gap-2 h-48">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="flex-1 rounded-t"
                        style={{ height: `${30 + Math.random() * 70}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
