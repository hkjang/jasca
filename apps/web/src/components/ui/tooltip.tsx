'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 300 }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {isVisible && (
                <div
                    className={`
                        absolute z-50 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded shadow-lg
                        whitespace-nowrap pointer-events-none
                        animate-in fade-in duration-150
                        ${positionClasses[position]}
                    `}
                >
                    {content}
                </div>
            )}
        </div>
    );
}

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const alignClasses = {
        left: 'left-0',
        right: 'right-0',
    };

    return (
        <div ref={dropdownRef} className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>
            {isOpen && (
                <div
                    className={`
                        absolute top-full mt-2 z-50
                        min-w-[10rem] py-1
                        bg-white dark:bg-slate-800 rounded-lg shadow-xl
                        border border-slate-200 dark:border-slate-700
                        animate-in fade-in slide-in-from-top-2 duration-150
                        ${alignClasses[align]}
                    `}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export function DropdownItem({
    children,
    onClick,
    disabled = false,
    destructive = false,
}: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    destructive?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full px-4 py-2 text-left text-sm
                flex items-center gap-2
                transition-colors
                ${disabled
                    ? 'text-slate-400 cursor-not-allowed'
                    : destructive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }
            `}
        >
            {children}
        </button>
    );
}

export function DropdownDivider() {
    return <div className="my-1 border-t border-slate-200 dark:border-slate-700" />;
}

// Popover component
export function Popover({
    trigger,
    children,
    align = 'right',
}: {
    trigger: ReactNode;
    children: ReactNode;
    align?: 'left' | 'right' | 'center';
}) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const alignClasses = {
        left: 'left-0',
        right: 'right-0',
        center: 'left-1/2 -translate-x-1/2',
    };

    return (
        <div ref={popoverRef} className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>
            {isOpen && (
                <div
                    className={`
                        absolute top-full mt-2 z-50
                        bg-white dark:bg-slate-800 rounded-xl shadow-xl
                        border border-slate-200 dark:border-slate-700
                        animate-in fade-in slide-in-from-top-2 duration-150
                        ${alignClasses[align]}
                    `}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

// Badge component
export function BadgeNew({
    children,
    variant = 'default',
    size = 'md',
}: {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md';
}) {
    const variantClasses = {
        default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };

    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-sm',
    };

    return (
        <span className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]}`}>
            {children}
        </span>
    );
}
