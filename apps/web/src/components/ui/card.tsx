'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// ============================================
// Card Component
// ============================================
const cardVariants = cva(
    'rounded-xl border transition-all duration-200',
    {
        variants: {
            variant: {
                default: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm',
                outline: 'bg-transparent border-slate-200 dark:border-slate-700',
                ghost: 'bg-slate-50 dark:bg-slate-800/50 border-transparent',
                elevated: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg',
            },
            interactive: {
                true: 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'default',
            interactive: false,
        },
    }
);

export interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> { }

export function Card({ className, variant, interactive, ...props }: CardProps) {
    return (
        <div className={cardVariants({ variant, interactive, className })} {...props} />
    );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`flex flex-col space-y-1.5 p-6 pb-4 ${className || ''}`}
            {...props}
        />
    );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={`text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className || ''}`}
            {...props}
        />
    );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={`text-sm text-slate-500 dark:text-slate-400 ${className || ''}`}
            {...props}
        />
    );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`p-6 pt-0 ${className || ''}`} {...props} />
    );
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`flex items-center p-6 pt-0 ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Stat Card Component (대시보드용)
// ============================================
export interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    color?: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange';
    onClick?: () => void;
    loading?: boolean;
}

const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
};

export function StatCard({
    title,
    value,
    change,
    changeLabel,
    icon,
    color = 'blue',
    onClick,
    loading = false,
}: StatCardProps) {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    const isNeutral = change === undefined || change === 0;

    return (
        <Card
            interactive={!!onClick}
            onClick={onClick}
            className={onClick ? 'group' : ''}
        >
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                            {title}
                        </p>
                        {loading ? (
                            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
                        ) : (
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                            </p>
                        )}
                        {change !== undefined && (
                            <div className="flex items-center gap-1 mt-2">
                                {isPositive && (
                                    <span className="flex items-center text-sm text-red-600 dark:text-red-400">
                                        <ArrowUp className="h-4 w-4" />
                                        +{Math.abs(change)}
                                    </span>
                                )}
                                {isNegative && (
                                    <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                                        <ArrowDown className="h-4 w-4" />
                                        {Math.abs(change)}
                                    </span>
                                )}
                                {isNeutral && (
                                    <span className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                        <Minus className="h-4 w-4" />
                                        0
                                    </span>
                                )}
                                {changeLabel && (
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {changeLabel}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {icon && (
                        <div className={`p-3 rounded-lg flex-shrink-0 ${colorStyles[color]} ${onClick ? 'group-hover:scale-110 transition-transform' : ''}`}>
                            {icon}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

export { cardVariants };
