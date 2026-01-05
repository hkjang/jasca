import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { NetworkStatus } from '@/components/network-status';

// 오프라인 환경 지원을 위해 로컬 폰트 사용
const inter = localFont({
    src: [
        {
            path: '../fonts/Inter-Regular.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../fonts/Inter-Medium.woff2',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../fonts/Inter-SemiBold.woff2',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../fonts/Inter-Bold.woff2',
            weight: '700',
            style: 'normal',
        },
    ],
    variable: '--font-inter',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

export const metadata: Metadata = {
    title: 'JASCA - Vulnerability Management',
    description: 'Trivy Vulnerability Management System',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    {children}
                    <NetworkStatus />
                </Providers>
            </body>
        </html>
    );
}

