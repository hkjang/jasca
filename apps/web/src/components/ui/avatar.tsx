'use client';

import { ReactNode } from 'react';

interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'busy' | 'away';
    className?: string;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getColorFromName(name: string): string {
    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-cyan-500',
        'bg-orange-500',
        'bg-teal-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

export function Avatar({ src, alt, name, size = 'md', status, className = '' }: AvatarProps) {
    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const statusSizeClasses = {
        xs: 'w-1.5 h-1.5',
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
        xl: 'w-4 h-4',
    };

    const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-slate-400',
        busy: 'bg-red-500',
        away: 'bg-yellow-500',
    };

    const initials = name ? getInitials(name) : '?';
    const bgColor = name ? getColorFromName(name) : 'bg-slate-400';

    return (
        <div className={`relative inline-flex ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt || name || 'Avatar'}
                    className={`${sizeClasses[size]} rounded-full object-cover`}
                />
            ) : (
                <div
                    className={`
                        ${sizeClasses[size]} ${bgColor}
                        rounded-full flex items-center justify-center
                        text-white font-medium
                    `}
                >
                    {initials}
                </div>
            )}
            {status && (
                <span
                    className={`
                        absolute bottom-0 right-0
                        ${statusSizeClasses[size]} ${statusColors[status]}
                        rounded-full ring-2 ring-white dark:ring-slate-800
                    `}
                />
            )}
        </div>
    );
}

// Avatar Group
interface AvatarGroupProps {
    avatars: Array<{ src?: string; name?: string }>;
    max?: number;
    size?: AvatarProps['size'];
}

export function AvatarGroup({ avatars, max = 4, size = 'md' }: AvatarGroupProps) {
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    return (
        <div className="flex -space-x-2">
            {visible.map((avatar, index) => (
                <Avatar
                    key={index}
                    src={avatar.src}
                    name={avatar.name}
                    size={size}
                    className="ring-2 ring-white dark:ring-slate-800"
                />
            ))}
            {remaining > 0 && (
                <div
                    className={`
                        ${sizeClasses[size]}
                        rounded-full flex items-center justify-center
                        bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300
                        font-medium ring-2 ring-white dark:ring-slate-800
                    `}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
}

// Card component
interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
    onClick?: () => void;
}

export function CardNew({ children, className = '', padding = 'md', hoverable = false, onClick }: CardProps) {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            onClick={onClick}
            className={`
                bg-white dark:bg-slate-800
                rounded-xl border border-slate-200 dark:border-slate-700
                ${paddingClasses[padding]}
                ${hoverable ? 'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// Stats component
interface StatProps {
    label: string;
    value: string | number;
    change?: {
        value: number;
        type: 'increase' | 'decrease';
    };
    icon?: ReactNode;
}

export function Stat({ label, value, change, icon }: StatProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                {icon && <div className="text-slate-400">{icon}</div>}
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            {change && (
                <div className={`mt-2 flex items-center text-sm ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                    <span>
                        {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
                    </span>
                    <span className="ml-2 text-slate-500">지난 주 대비</span>
                </div>
            )}
        </div>
    );
}

// Timeline component
interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    time: string;
    icon?: ReactNode;
    status?: 'completed' | 'current' | 'upcoming';
}

interface TimelineProps {
    items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {items.map((item, index) => (
                    <li key={item.id}>
                        <div className="relative pb-8">
                            {index !== items.length - 1 && (
                                <span
                                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700"
                                    aria-hidden="true"
                                />
                            )}
                            <div className="relative flex items-start space-x-3">
                                <div
                                    className={`
                                        relative flex h-10 w-10 items-center justify-center rounded-full
                                        ${item.status === 'completed'
                                            ? 'bg-green-500 text-white'
                                            : item.status === 'current'
                                                ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900/30'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }
                                    `}
                                >
                                    {item.icon || (item.status === 'completed' ? '✓' : (index + 1))}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {item.title}
                                        </p>
                                        <time className="text-xs text-slate-500 dark:text-slate-400">
                                            {item.time}
                                        </time>
                                    </div>
                                    {item.description && (
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
