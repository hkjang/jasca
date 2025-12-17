'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/auth-api';
import { useHasMounted } from '@/hooks/use-has-mounted';

const navigation = [
    { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    { name: '프로젝트', href: '/dashboard/projects', icon: FolderKanban },
    { name: '스캔 결과', href: '/dashboard/scans', icon: FileSearch },
    { name: '취약점', href: '/dashboard/vulnerabilities', icon: AlertTriangle },
    { name: '정책', href: '/dashboard/policies', icon: FileText },
    { name: '설정', href: '/dashboard/settings', icon: Settings },
];

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
                <nav className="flex-1 p-4 space-y-1">
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

                {/* Collapse button */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center justify-center w-full p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
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
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {navigation.find((n) => pathname?.startsWith(n.href))?.name || '대시보드'}
                    </h1>
                    <div className="flex items-center gap-4">
                        {/* User info */}
                        {user && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <User className="h-5 w-5" />
                                <span className="text-sm">{user.name || user.email}</span>
                            </div>
                        )}
                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>로그아웃</span>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
        </div>
    );
}

