'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Shield,
    LayoutDashboard,
    FileSearch,
    AlertTriangle,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User,
    Loader2,
    FolderKanban,
    Bell,
    BarChart3,
    Map,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/auth-api';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Breadcrumb } from '@/components/breadcrumb';
import { RecentProjects } from '@/components/recent-projects';
import { ToastProvider } from '@/components/ui/toast';

// Role types for navigation
type NavRole = 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'SECURITY_ADMIN' | 'PROJECT_ADMIN' | 'DEVELOPER' | 'VIEWER';

interface NavItem {
    name: string;
    href: string;
    icon: any;
    roles: NavRole[] | 'all';
}

// Role-based navigation configuration
const allNavigation: NavItem[] = [
    { name: '대시보드', href: '/dashboard', icon: LayoutDashboard, roles: 'all' },
    { name: '프로젝트', href: '/dashboard/projects', icon: FolderKanban, roles: 'all' },
    { name: '스캔 결과', href: '/dashboard/scans', icon: FileSearch, roles: 'all' },
    { name: '취약점', href: '/dashboard/vulnerabilities', icon: AlertTriangle, roles: 'all' },
    { name: '정책', href: '/dashboard/policies', icon: FileText, roles: ['SYSTEM_ADMIN', 'ORG_ADMIN', 'SECURITY_ADMIN'] },
    { name: '리포트', href: '/dashboard/reports', icon: BarChart3, roles: ['SYSTEM_ADMIN', 'ORG_ADMIN', 'SECURITY_ADMIN'] },
    { name: '알림', href: '/dashboard/notifications', icon: Bell, roles: 'all' },
    { name: '설정', href: '/dashboard/settings', icon: Settings, roles: 'all' },
    { name: '사이트맵', href: '/dashboard/sitemap', icon: Map, roles: 'all' },
];

function getNavigationForRole(userRoles: string[]) {
    return allNavigation.filter((item) => {
        if (item.roles === 'all') return true;
        return item.roles.some((role) => userRoles.includes(role));
    });
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const { user, isAuthenticated, refreshToken, logout } = useAuthStore();
    const hasMounted = useHasMounted();

    // Get user roles from user object
    const userRoles = useMemo(() => {
        if (!user) return [];
        // Assume roles are stored in user.roles array
        return (user as any).roles?.map((r: any) => r.role || r) || ['VIEWER'];
    }, [user]);

    // Filter navigation based on user role
    const navigation = useMemo(() => getNavigationForRole(userRoles), [userRoles]);

    // Auth guard - redirect if not authenticated (after hydration)
    useEffect(() => {
        if (hasMounted && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router, hasMounted]);

    const handleLogout = async () => {
        try {
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            logout();
            router.push('/login');
        }
    };

    // Show loading while hydrating
    if (!hasMounted) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Don't render if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <ToastProvider>
            <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
                {/* Sidebar */}
                <aside
                    className={`${collapsed ? 'w-20' : 'w-64'
                        } bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 flex flex-col`}
                >
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                        <Shield className="h-8 w-8 text-blue-600 flex-shrink-0" />
                        {!collapsed && (
                            <span className="text-xl font-bold text-slate-900 dark:text-white">
                                JASCA
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
                                        }`}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Recent Projects Section */}
                    {!collapsed && (
                        <div className="border-t border-slate-200 dark:border-slate-700 py-2">
                            <RecentProjects collapsed={collapsed} />
                        </div>
                    )}

                    {/* Collapse button */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="flex items-center justify-center w-full p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors"
                            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
                        >
                            {collapsed ? (
                                <ChevronRight className="h-5 w-5" />
                            ) : (
                                <>
                                    <ChevronLeft className="h-5 w-5" />
                                    <span className="ml-2">접기</span>
                                </>
                            )}
                        </button>
                    </div>
                </aside>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {navigation.find((n) => pathname?.startsWith(n.href))?.name || '대시보드'}
                            </h1>
                            <Breadcrumb className="mt-0.5" />
                        </div>
                        <div className="flex items-center gap-4">
                            {/* User info */}
                            {user && (
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium">{user.name || user.email}</span>
                                </Link>
                            )}
                            {/* Logout button */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>로그아웃</span>
                            </button>
                        </div>
                    </header>

                    {/* Content */}
                    <main className="flex-1 overflow-auto p-6 custom-scrollbar">{children}</main>
                </div>
            </div>
        </ToastProvider>
    );
}

