'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

// ============================================
// Button Component
// ============================================
const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            variant: {
                primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
                secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 focus:ring-slate-500',
                outline: 'border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-500',
                ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-500',
                danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
                success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
                link: 'text-blue-600 dark:text-blue-400 hover:underline focus:ring-blue-500 p-0 h-auto',
            },
            size: {
                sm: 'h-8 px-3 text-sm',
                md: 'h-10 px-4 text-sm',
                lg: 'h-12 px-6 text-base',
                icon: 'h-10 w-10',
                iconSm: 'h-8 w-8',
                iconLg: 'h-12 w-12',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Button({
    className,
    variant,
    size,
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={buttonVariants({ variant, size, className })}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                leftIcon
            )}
            {children}
            {!loading && rightIcon}
        </button>
    );
}

export { buttonVariants };
