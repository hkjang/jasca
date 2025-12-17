'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

// ============================================
// Breadcrumb Components
// ============================================
export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: React.ReactNode;
}

export interface BreadcrumbProps {
    items?: BreadcrumbItem[];
    separator?: React.ReactNode;
    showHome?: boolean;
    homeHref?: string;
    className?: string;
}

// Default route mappings for auto-generation
const routeLabels: Record<string, string> = {
    dashboard: '대시보드',
    projects: '프로젝트',
    scans: '스캔 결과',
    vulnerabilities: '취약점',
    policies: '정책',
    settings: '설정',
    profile: '프로필',
    reports: '리포트',
    notifications: '알림',
    'api-tokens': 'API 토큰',
    admin: '관리자',
    users: '사용자',
    organizations: '조직',
    permissions: '권한',
    compare: '비교',
    detail: '상세',
};

export function Breadcrumb({
    items,
    separator = <ChevronRight className="h-4 w-4 text-slate-400" />,
    showHome = true,
    homeHref = '/dashboard',
    className,
}: BreadcrumbProps) {
    const pathname = usePathname();

    // Auto-generate breadcrumb items from pathname if not provided
    const breadcrumbItems = React.useMemo(() => {
        if (items) return items;

        const segments = pathname?.split('/').filter(Boolean) || [];
        const generatedItems: BreadcrumbItem[] = [];

        segments.forEach((segment, index) => {
            // Skip UUIDs (common pattern in URLs)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
                generatedItems.push({
                    label: '상세',
                    href: '/' + segments.slice(0, index + 1).join('/'),
                });
                return;
            }

            const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
            const href = '/' + segments.slice(0, index + 1).join('/');

            generatedItems.push({ label, href });
        });

        return generatedItems;
    }, [items, pathname]);

    if (breadcrumbItems.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex items-center gap-2 text-sm">
                {showHome && (
                    <>
                        <li>
                            <Link
                                href={homeHref}
                                className="flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                aria-label="Home"
                            >
                                <Home className="h-4 w-4" />
                            </Link>
                        </li>
                        {breadcrumbItems.length > 0 && (
                            <li aria-hidden="true" className="flex-shrink-0">
                                {separator}
                            </li>
                        )}
                    </>
                )}
                {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;

                    return (
                        <React.Fragment key={index}>
                            <li className={isLast ? 'truncate' : ''}>
                                {isLast || !item.href ? (
                                    <span
                                        className="font-medium text-slate-900 dark:text-white truncate"
                                        aria-current="page"
                                    >
                                        {item.icon && <span className="mr-1">{item.icon}</span>}
                                        {item.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                    >
                                        {item.icon && <span className="mr-1">{item.icon}</span>}
                                        {item.label}
                                    </Link>
                                )}
                            </li>
                            {!isLast && (
                                <li aria-hidden="true" className="flex-shrink-0">
                                    {separator}
                                </li>
                            )}
                        </React.Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}

// ============================================
// Simple Breadcrumb for inline use
// ============================================
export interface SimpleBreadcrumbProps {
    current: string;
    parent?: { label: string; href: string };
    className?: string;
}

export function SimpleBreadcrumb({ current, parent, className }: SimpleBreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex items-center gap-2 text-sm">
                {parent && (
                    <>
                        <li>
                            <Link
                                href={parent.href}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                {parent.label}
                            </Link>
                        </li>
                        <li aria-hidden="true">
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </li>
                    </>
                )}
                <li>
                    <span className="font-medium text-slate-900 dark:text-white" aria-current="page">
                        {current}
                    </span>
                </li>
            </ol>
        </nav>
    );
}
