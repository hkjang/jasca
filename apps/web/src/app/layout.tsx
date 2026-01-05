import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { NetworkStatus } from '@/components/network-status';

const inter = Inter({ subsets: ['latin'] });

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

