'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Shield,
    LayoutDashboard,
    Building2,
    Users,
    FolderKanban,
    FileText,
    ShieldCheck,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    AlertTriangle,
    Bell,
    History,
    Cpu,
    Link as LinkIcon,
    Sparkles,
    MessageSquare,
    Map,
    Key,
    BarChart3,
    Database,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { authApi } from '@/lib/auth-api';

const adminNavigation = [
    { name: '대시보드', href: '/admin', icon: LayoutDashboard },
    { name: '조직 관리', href: '/admin/organizations', icon: Building2 },
    { name: '사용자 관리', href: '/admin/users', icon: Users },
    { name: '프로젝트 관리', href: '/admin/projects', icon: FolderKanban },
    { name: '취약점 현황', href: '/admin/vulnerabilities', icon: AlertTriangle },
    { name: '정책 관리', href: '/admin/policies', icon: FileText },
    { name: '예외 승인', href: '/admin/exceptions', icon: ShieldCheck },
    { name: '워크플로우', href: '/admin/workflows', icon: Settings },
];

const systemNavigation = [
    { name: 'API 토큰', href: '/admin/api-tokens', icon: Key },
    { name: 'Trivy 설정', href: '/admin/trivy-settings', icon: Cpu },
    { name: 'CI 연동', href: '/admin/ci-integration', icon: LinkIcon },
    { name: '알림 설정', href: '/admin/notification-settings', icon: Bell },
    { name: '감사 로그', href: '/admin/audit-logs', icon: History },
    { name: 'AI 설정', href: '/admin/ai-settings', icon: Sparkles },
    { name: 'AI 프롬프트', href: '/admin/ai-prompts', icon: MessageSquare },
    { name: 'AI 사용 기록', href: '/admin/ai-history', icon: BarChart3 },
    { name: '스키마/ERD', href: '/admin/schema', icon: Database },
    { name: '사이트맵', href: '/admin/sitemap', icon: Map },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const hasMounted = useHasMounted();
    const { user, isAuthenticated, refreshToken, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);

    // Check for admin role
    const isAdmin = user?.roles?.some(role =>
        ['SYSTEM_ADMIN', 'ORG_ADMIN', 'ADMIN'].includes(role)
    );

    useEffect(() => {
        if (hasMounted && !isAuthenticated) {
            router.push('/login');
        }
        if (hasMounted && isAuthenticated && !isAdmin) {
            router.push('/dashboard');
        }
    }, [hasMounted, isAuthenticated, isAdmin, router]);

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

    if (!hasMounted || !isAuthenticated || !isAdmin) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
                    <p className="mt-4 text-slate-600 dark:text-slate-400">권한을 확인하는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-800">
                    <Shield className="h-8 w-8 text-red-500 flex-shrink-0" />
                    {!collapsed && (
                        <span className="text-xl font-bold text-white">JASCA Admin</span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 overflow-y-auto">
                    <div className="space-y-1">
                        {!collapsed && (
                            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">관리</p>
                        )}
                        {adminNavigation.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/admin' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-red-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-6 space-y-1">
                        {!collapsed && (
                            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">시스템</p>
                        )}
                        {systemNavigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-red-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Back to User Dashboard */}
                    <div className="mt-6 pt-4 border-t border-slate-800">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <LayoutDashboard className="h-5 w-5" />
                            {!collapsed && <span>사용자 대시보드</span>}
                        </Link>
                    </div>
                </nav>

                {/* User & Collapse */}
                <div className="border-t border-slate-800 p-4">
                    {!collapsed && (
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                    {user?.name?.[0]?.toUpperCase() || 'A'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-white">{user?.name}</p>
                                <p className="text-xs text-slate-400">Admin</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="로그아웃"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
