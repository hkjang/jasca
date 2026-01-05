'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Play,
    FileText,
    Filter,
    Download,
    Bell,
    Settings,
    Plus,
    ChevronDown,
    Scan,
    BarChart3,
    Shield,
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    badge?: number;
}

interface QuickActionsProps {
    onScanStart?: () => void;
    onReportGenerate?: () => void;
    className?: string;
}

export function QuickActions({ onScanStart, onReportGenerate, className = '' }: QuickActionsProps) {
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const mainActions: QuickAction[] = [
        {
            id: 'scan',
            label: '스캔 시작',
            icon: Play,
            variant: 'primary',
            onClick: onScanStart || (() => router.push('/dashboard/scans/new')),
        },
        {
            id: 'report',
            label: '리포트 생성',
            icon: FileText,
            variant: 'secondary',
            onClick: onReportGenerate || (() => router.push('/dashboard/reports')),
        },
    ];

    const moreActions: QuickAction[] = [
        {
            id: 'filter',
            label: '필터 설정',
            icon: Filter,
            href: '/dashboard/vulnerabilities',
        },
        {
            id: 'export',
            label: '내보내기',
            icon: Download,
            onClick: () => console.log('Export'),
        },
        {
            id: 'notifications',
            label: '알림 설정',
            icon: Bell,
            href: '/dashboard/notifications',
        },
        {
            id: 'settings',
            label: '설정',
            icon: Settings,
            href: '/dashboard/settings',
        },
    ];

    const handleActionClick = (action: QuickAction) => {
        if (action.onClick) {
            action.onClick();
        } else if (action.href) {
            router.push(action.href);
        }
        setIsDropdownOpen(false);
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Main Action Buttons */}
            {mainActions.map((action) => (
                <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className={`
                        group flex items-center gap-2 px-4 py-2 rounded-lg
                        font-medium text-sm
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${action.variant === 'primary'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-slate-500'
                        }
                    `}
                >
                    <action.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>{action.label}</span>
                    {action.badge && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                            {action.badge}
                        </span>
                    )}
                </button>
            ))}

            {/* More Actions Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="
                        flex items-center gap-1 px-3 py-2 rounded-lg
                        bg-slate-100 hover:bg-slate-200
                        dark:bg-slate-800 dark:hover:bg-slate-700
                        text-slate-600 dark:text-slate-300
                        transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
                    "
                >
                    <Plus className="h-4 w-4" />
                    <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsDropdownOpen(false)}
                        />
                        
                        {/* Dropdown Menu */}
                        <div className="
                            absolute right-0 top-full mt-2 z-20
                            w-48 py-1 rounded-lg shadow-xl
                            bg-white dark:bg-slate-800
                            border border-slate-200 dark:border-slate-700
                            animate-in fade-in slide-in-from-top-2 duration-200
                        ">
                            {moreActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => handleActionClick(action)}
                                    className="
                                        w-full flex items-center gap-3 px-4 py-2
                                        text-left text-sm text-slate-700 dark:text-slate-200
                                        hover:bg-slate-100 dark:hover:bg-slate-700
                                        transition-colors duration-150
                                    "
                                >
                                    <action.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Floating Action Button variant for mobile
export function QuickActionsFAB() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const actions = [
        { id: 'scan', label: '스캔', icon: Scan, href: '/dashboard/scans/new', color: 'bg-blue-500' },
        { id: 'report', label: '리포트', icon: BarChart3, href: '/dashboard/reports', color: 'bg-green-500' },
        { id: 'policy', label: '정책', icon: Shield, href: '/dashboard/policies', color: 'bg-purple-500' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 md:hidden">
            {/* Action buttons */}
            <div className={`
                absolute bottom-16 right-0
                flex flex-col gap-2
                transition-all duration-300
                ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
            `}>
                {actions.map((action, index) => (
                    <button
                        key={action.id}
                        onClick={() => router.push(action.href)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-full
                            ${action.color} text-white shadow-lg
                            transition-all duration-200
                            hover:scale-105
                        `}
                        style={{ transitionDelay: `${index * 50}ms` }}
                    >
                        <action.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Main FAB button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-14 h-14 rounded-full
                    bg-blue-600 hover:bg-blue-500
                    text-white shadow-lg shadow-blue-500/40
                    flex items-center justify-center
                    transition-all duration-300
                    ${isOpen ? 'rotate-45 bg-red-500 hover:bg-red-400 shadow-red-500/40' : ''}
                `}
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
    );
}
