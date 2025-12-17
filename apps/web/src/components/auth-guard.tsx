'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useHasMounted } from '@/hooks/use-has-mounted';

const PUBLIC_PATHS = ['/login', '/register', '/'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, accessToken } = useAuthStore();
    const hasMounted = useHasMounted();

    useEffect(() => {
        // Wait for hydration to complete before checking auth
        if (!hasMounted) return;

        const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname?.startsWith('/invitation'));

        if (!isAuthenticated && !accessToken && !isPublicPath) {
            router.push('/login');
        }
    }, [isAuthenticated, accessToken, pathname, router, hasMounted]);

    // Show nothing while hydrating to prevent flash
    if (!hasMounted) {
        return null;
    }

    return <>{children}</>;
}
