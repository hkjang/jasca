'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { getSeverityStyle, getStatusStyle } from '@/lib/design-tokens';

// ============================================
// Badge Component
// ============================================
const badgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
                outline: 'border border-current bg-transparent',
                // Severities
                critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                // Status
                success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            },
            size: {
                sm: 'text-[10px] px-1.5 py-0.5',
                md: 'text-xs px-2.5 py-0.5',
                lg: 'text-sm px-3 py-1',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode;
    removable?: boolean;
    onRemove?: () => void;
}

export function Badge({
    className,
    variant,
    size,
    icon,
    removable,
    onRemove,
    children,
    ...props
}: BadgeProps) {
    return (
        <span className={badgeVariants({ variant, size, className })} {...props}>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {removable && (
                <button
                    onClick={onRemove}
                    className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                    aria-label="Remove"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </span>
    );
}

// ============================================
// Severity Badge (접근성 향상: 아이콘 + 텍스트)
// ============================================
export interface SeverityBadgeProps {
    severity: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function SeverityBadge({ severity, showIcon = true, size = 'md' }: SeverityBadgeProps) {
    const style = getSeverityStyle(severity);

    const severityIcons: Record<string, React.ReactNode> = {
        critical: <XCircle className="h-3 w-3" />,
        high: <AlertCircle className="h-3 w-3" />,
        medium: <AlertTriangle className="h-3 w-3" />,
        low: <Info className="h-3 w-3" />,
        unknown: <Info className="h-3 w-3" />,
    };

    const severityLabels: Record<string, string> = {
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        unknown: 'Unknown',
    };

    const key = severity.toLowerCase();

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${style.bg} ${style.text} ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' :
                    size === 'lg' ? 'text-sm px-3 py-1' :
                        'text-xs px-2.5 py-0.5'
                }`}
            role="status"
            aria-label={`Severity: ${severityLabels[key] || severity}`}
        >
            {showIcon && severityIcons[key]}
            <span>{severityLabels[key] || severity}</span>
        </span>
    );
}

// ============================================
// Status Badge (접근성 향상: 아이콘 + 텍스트)
// ============================================
export interface StatusBadgeProps {
    status: string;
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, showDot = true, size = 'md' }: StatusBadgeProps) {
    const style = getStatusStyle(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${style.bg} ${style.text} ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' :
                    size === 'lg' ? 'text-sm px-3 py-1' :
                        'text-xs px-2.5 py-0.5'
                }`}
            role="status"
            aria-label={`Status: ${style.label}`}
        >
            {showDot && (
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
            )}
            <span>{style.label}</span>
        </span>
    );
}

export { badgeVariants };
