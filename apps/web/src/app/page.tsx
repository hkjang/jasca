'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Shield,
    BarChart3,
    FileSearch,
    Settings,
    AlertTriangle,
    LogOut,
    User,
    Loader2,
    CheckCircle,
    Zap,
    Lock,
    Globe,
    ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { authApi } from '@/lib/auth-api';
import { CountUp, FadeInOnScroll, ParticleBackground } from '@/components/animations';

// Trust badges / certifications
const trustBadges = [
    { name: 'ISO 27001', icon: Shield },
    { name: 'SOC 2', icon: Lock },
    { name: 'GDPR', icon: Globe },
    { name: '99.9% 가동률', icon: Zap },
];

// Statistics to display
const stats = [
    { label: '스캔된 취약점', value: 50000, suffix: '+' },
    { label: '보호된 프로젝트', value: 1200, suffix: '+' },
    { label: '기업 고객', value: 150, suffix: '+' },
    { label: '평균 응답 시간', value: 200, suffix: 'ms' },
];

export default function HomePage() {
    const router = useRouter();
    const hasMounted = useHasMounted();
    const { user, isAuthenticated, refreshToken, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            logout();
        }
    };

    // Show loading state before hydration
    if (!hasMounted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Particle Background */}
            <ParticleBackground />

            {/* Header */}
            <header className="relative z-10 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Shield className="h-8 w-8 text-blue-400" />
                            <div className="absolute inset-0 h-8 w-8 bg-blue-400/30 blur-lg" />
                        </div>
                        <span className="text-2xl font-bold text-white">JASCA</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        {isAuthenticated && user ? (
                            <>
                                {/* User is logged in - show dashboard link and user info */}
                                <Link
                                    href="/dashboard"
                                    className="text-slate-300 hover:text-white transition-colors"
                                >
                                    대시보드
                                </Link>
                                {user.roles?.some(role => ['SYSTEM_ADMIN', 'ORG_ADMIN', 'ADMIN'].includes(role)) && (
                                    <Link
                                        href="/admin"
                                        className="text-slate-300 hover:text-white transition-colors"
                                    >
                                        관리자
                                    </Link>
                                )}
                                <div className="flex items-center gap-3 ml-4">
                                    <Link
                                        href="/dashboard/profile"
                                        className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-blue-600/30 flex items-center justify-center ring-2 ring-blue-500/50">
                                            <User className="h-4 w-4 text-blue-400" />
                                        </div>
                                        <span className="text-sm">{user.name || user.email}</span>
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800/50"
                                        title="로그아웃"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* User is not logged in - show login/register links */}
                                <Link
                                    href="/login"
                                    className="text-slate-300 hover:text-white transition-colors"
                                >
                                    로그인
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25"
                                >
                                    시작하기
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 container mx-auto px-6 py-20">
                <FadeInOnScroll direction="up">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
                            <Zap className="h-4 w-4" />
                            <span>보안 취약점 관리의 새로운 기준</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            조직 전체의
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-[length:200%_auto] animate-gradient">
                                취약점을 한눈에
                            </span>
                        </h1>
                        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                            Trivy 스캔 결과를 중앙에서 수집, 분석, 추적하여
                            <br />
                            체계적인 보안 취약점 관리를 실현하세요.
                        </p>
                        <div className="flex justify-center gap-4">
                            {isAuthenticated ? (
                                <Link
                                    href="/dashboard"
                                    className="group bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all hover:shadow-xl hover:shadow-blue-500/30 flex items-center gap-2"
                                >
                                    대시보드로 이동
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <Link
                                    href="/register"
                                    className="group bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all hover:shadow-xl hover:shadow-blue-500/30 flex items-center gap-2"
                                >
                                    무료로 시작하기
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                            <Link
                                href="/docs"
                                className="border border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all"
                            >
                                문서 보기
                            </Link>
                        </div>
                    </div>
                </FadeInOnScroll>

                {/* Stats Section */}
                <FadeInOnScroll direction="up" delay={200}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
                        {stats.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="text-center p-6 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50"
                            >
                                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                                    <CountUp end={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-sm text-slate-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </FadeInOnScroll>

                {/* Features */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
                    {[
                        {
                            icon: <FileSearch className="h-8 w-8" />,
                            title: '스캔 결과 수집',
                            description: 'Trivy JSON/SARIF 결과를 CI/CD와 연동하여 자동 수집',
                            delay: 0,
                        },
                        {
                            icon: <AlertTriangle className="h-8 w-8" />,
                            title: '정책 기반 차단',
                            description: '심각도별 배포 차단 정책으로 보안 컴플라이언스 준수',
                            delay: 100,
                        },
                        {
                            icon: <BarChart3 className="h-8 w-8" />,
                            title: '대시보드 분석',
                            description: '프로젝트별 취약점 현황과 추세를 실시간 모니터링',
                            delay: 200,
                        },
                        {
                            icon: <Settings className="h-8 w-8" />,
                            title: '워크플로우 관리',
                            description: '담당자 지정, 상태 추적, 예외 승인 워크플로우',
                            delay: 300,
                        },
                    ].map((feature) => (
                        <FadeInOnScroll key={feature.title} direction="up" delay={feature.delay}>
                            <FeatureCard
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                            />
                        </FadeInOnScroll>
                    ))}
                </div>

                {/* Trust Badges */}
                <FadeInOnScroll direction="up" delay={400}>
                    <div className="mt-24 text-center">
                        <p className="text-slate-400 text-sm mb-6">신뢰할 수 있는 보안 인증</p>
                        <div className="flex flex-wrap justify-center gap-8">
                            {trustBadges.map((badge) => (
                                <div
                                    key={badge.name}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300"
                                >
                                    <badge.icon className="h-5 w-5 text-green-400" />
                                    <span className="text-sm font-medium">{badge.name}</span>
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                </FadeInOnScroll>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-slate-700/50 py-8 mt-20">
                <div className="container mx-auto px-6 text-center text-slate-500">
                    <p>© 2024 JASCA. 모든 권리 보유.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
            <div className="text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
            <p className="text-slate-400 text-sm">{description}</p>
        </div>
    );
}
