'use client';

import { useState } from 'react';
import {
    Home,
    Shield,
    Settings,
    Users,
    Building2,
    FolderKanban,
    AlertTriangle,
    Workflow,
    Bell,
    FileText,
    Bot,
    Activity,
    ChevronRight,
    ExternalLink,
    Map,
    Lock,
    Scan,
    FileCheck,
    MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface SitemapItem {
    title: string;
    path: string;
    icon: React.ReactNode;
    description: string;
    category?: string;
    children?: SitemapItem[];
}

const adminSitemap: SitemapItem[] = [
    {
        title: '관리자 대시보드',
        path: '/admin',
        icon: <Home className="w-5 h-5" />,
        description: '시스템 전체 현황 및 관리 지표',
        category: '개요',
    },
    {
        title: '조직 관리',
        path: '/admin/organizations',
        icon: <Building2 className="w-5 h-5" />,
        description: '조직 생성, 수정, 삭제 및 조직별 설정',
        category: '조직/사용자',
    },
    {
        title: '사용자 관리',
        path: '/admin/users',
        icon: <Users className="w-5 h-5" />,
        description: '사용자 계정 관리 및 역할 할당',
        category: '조직/사용자',
    },
    {
        title: '권한 관리',
        path: '/admin/permissions',
        icon: <Lock className="w-5 h-5" />,
        description: '역할 기반 접근 제어(RBAC) 설정',
        category: '조직/사용자',
    },
    {
        title: '프로젝트 관리',
        path: '/admin/projects',
        icon: <FolderKanban className="w-5 h-5" />,
        description: '전체 프로젝트 조회 및 관리',
        category: '보안 관리',
    },
    {
        title: '보안 정책',
        path: '/admin/policies',
        icon: <Shield className="w-5 h-5" />,
        description: '보안 정책 생성 및 전역 정책 관리',
        category: '보안 관리',
    },
    {
        title: '예외 관리',
        path: '/admin/exceptions',
        icon: <AlertTriangle className="w-5 h-5" />,
        description: '취약점 예외 승인 및 관리',
        category: '보안 관리',
    },
    {
        title: '워크플로우',
        path: '/admin/workflows',
        icon: <Workflow className="w-5 h-5" />,
        description: '자동화된 보안 워크플로우 설계',
        category: '보안 관리',
    },
    {
        title: '컴플라이언스',
        path: '/admin/compliance',
        icon: <FileCheck className="w-5 h-5" />,
        description: '규정 준수 현황 및 감사 관리',
        category: '보안 관리',
    },
    {
        title: 'AI 설정',
        path: '/admin/ai-settings',
        icon: <Bot className="w-5 h-5" />,
        description: 'AI 모델 및 분석 설정 관리',
        category: '시스템 설정',
    },
    {
        title: 'AI 프롬프트 관리',
        path: '/admin/ai-prompts',
        icon: <MessageSquare className="w-5 h-5" />,
        description: 'AI 분석용 프롬프트 커스터마이징',
        category: '시스템 설정',
    },
    {
        title: 'Trivy 설정',
        path: '/admin/trivy-settings',
        icon: <Scan className="w-5 h-5" />,
        description: 'Trivy 스캐너 연동 및 설정',
        category: '시스템 설정',
    },
    {
        title: '알림 설정',
        path: '/admin/notification-settings',
        icon: <Bell className="w-5 h-5" />,
        description: '시스템 알림 채널 및 규칙 관리',
        category: '시스템 설정',
    },
    {
        title: 'CI/CD 연동',
        path: '/admin/ci-integration',
        icon: <Settings className="w-5 h-5" />,
        description: 'CI/CD 파이프라인 연동 설정',
        category: '시스템 설정',
    },
    {
        title: '감사 로그',
        path: '/admin/audit-logs',
        icon: <Activity className="w-5 h-5" />,
        description: '시스템 활동 및 변경 이력 조회',
        category: '모니터링',
    },
];

// Group items by category
const groupedSitemap = adminSitemap.reduce((acc, item) => {
    const category = item.category || '기타';
    if (!acc[category]) {
        acc[category] = [];
    }
    acc[category].push(item);
    return acc;
}, {} as Record<string, SitemapItem[]>);

const categoryColors: Record<string, string> = {
    '개요': 'from-blue-500 to-cyan-500',
    '조직/사용자': 'from-purple-500 to-pink-500',
    '보안 관리': 'from-orange-500 to-red-500',
    '시스템 설정': 'from-green-500 to-emerald-500',
    '모니터링': 'from-yellow-500 to-amber-500',
};

function SitemapCard({ item }: { item: SitemapItem }) {
    return (
        <Link href={item.path}>
            <div className="group relative bg-slate-800/50 hover:bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${categoryColors[item.category || '기타']}`}>
                        {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                {item.title}
                            </h3>
                            <ExternalLink className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                        <code className="text-xs text-slate-500 mt-2 block font-mono">{item.path}</code>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function AdminSitemapPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                            <Map className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">관리자 사이트맵</h1>
                            <p className="text-slate-400">JASCA 관리자 콘솔의 전체 메뉴 구조</p>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <Link
                            href="/dashboard/sitemap"
                            className="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                        >
                            사용자 사이트맵
                        </Link>
                        <Link
                            href="/admin/sitemap"
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium"
                        >
                            관리자 사이트맵
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {Object.entries(groupedSitemap).map(([category, items]) => (
                        <div
                            key={category}
                            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                        >
                            <div className={`text-2xl font-bold bg-gradient-to-r ${categoryColors[category]} bg-clip-text text-transparent`}>
                                {items.length}
                            </div>
                            <div className="text-sm text-slate-400">{category}</div>
                        </div>
                    ))}
                </div>

                {/* Sitemap by Category */}
                <div className="space-y-8">
                    {Object.entries(groupedSitemap).map(([category, items]) => (
                        <div key={category}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${categoryColors[category]}`} />
                                <h2 className="text-xl font-bold text-white">{category}</h2>
                                <span className="text-sm text-slate-500">({items.length}개 메뉴)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map((item, index) => (
                                    <SitemapCard key={index} item={item} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Navigation */}
                <div className="mt-12 p-6 bg-slate-800/30 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white mb-4">빠른 이동</h3>
                    <div className="flex flex-wrap gap-2">
                        {adminSitemap.map((item, index) => (
                            <Link
                                key={index}
                                href={item.path}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-sm transition-colors"
                            >
                                {item.title}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white mb-3">카테고리 범례</h3>
                    <div className="flex flex-wrap gap-4 text-sm">
                        {Object.entries(categoryColors).map(([category, gradient]) => (
                            <div key={category} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded bg-gradient-to-r ${gradient}`} />
                                <span className="text-slate-400">{category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
