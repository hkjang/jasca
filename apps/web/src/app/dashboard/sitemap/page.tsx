'use client';

import { useState } from 'react';
import {
    Home,
    BarChart3,
    Shield,
    FileSearch,
    Bug,
    Settings,
    User,
    Bell,
    Key,
    FileText,
    FolderKanban,
    ChevronRight,
    ExternalLink,
    Map,
} from 'lucide-react';
import Link from 'next/link';

interface SitemapItem {
    title: string;
    path: string;
    icon: React.ReactNode;
    description: string;
    children?: SitemapItem[];
}

const userSitemap: SitemapItem[] = [
    {
        title: '대시보드',
        path: '/dashboard',
        icon: <Home className="w-5 h-5" />,
        description: '전체 보안 현황 요약 및 주요 지표 확인',
    },
    {
        title: '프로젝트',
        path: '/dashboard/projects',
        icon: <FolderKanban className="w-5 h-5" />,
        description: '프로젝트 관리 및 스캔 결과 조회',
        children: [
            {
                title: '프로젝트 상세',
                path: '/dashboard/projects/[id]',
                icon: <ChevronRight className="w-4 h-4" />,
                description: '개별 프로젝트의 상세 정보 및 취약점 목록',
            },
        ],
    },
    {
        title: '스캔',
        path: '/dashboard/scans',
        icon: <FileSearch className="w-5 h-5" />,
        description: '보안 스캔 결과 목록 및 상세 조회',
        children: [
            {
                title: '스캔 상세',
                path: '/dashboard/scans/[id]',
                icon: <ChevronRight className="w-4 h-4" />,
                description: '스캔 결과의 상세 정보 및 발견된 취약점',
            },
            {
                title: '스캔 비교',
                path: '/dashboard/scans/compare',
                icon: <ChevronRight className="w-4 h-4" />,
                description: '두 스캔 결과 간 차이점 비교',
            },
        ],
    },
    {
        title: '취약점',
        path: '/dashboard/vulnerabilities',
        icon: <Bug className="w-5 h-5" />,
        description: '발견된 취약점 목록 및 상태 관리',
        children: [
            {
                title: '취약점 상세',
                path: '/dashboard/vulnerabilities/[id]',
                icon: <ChevronRight className="w-4 h-4" />,
                description: '취약점 상세 정보, 영향도 및 해결 가이드',
            },
        ],
    },
    {
        title: '보안 정책',
        path: '/dashboard/policies',
        icon: <Shield className="w-5 h-5" />,
        description: '적용 가능한 보안 정책 조회',
    },
    {
        title: '리포트',
        path: '/dashboard/reports',
        icon: <FileText className="w-5 h-5" />,
        description: '보안 분석 리포트 생성 및 조회',
    },
    {
        title: '알림',
        path: '/dashboard/notifications',
        icon: <Bell className="w-5 h-5" />,
        description: '시스템 알림 및 보안 이벤트 알림',
    },
    {
        title: 'API 토큰',
        path: '/dashboard/api-tokens',
        icon: <Key className="w-5 h-5" />,
        description: 'API 접근을 위한 토큰 관리',
    },
    {
        title: '프로필',
        path: '/dashboard/profile',
        icon: <User className="w-5 h-5" />,
        description: '사용자 정보 및 계정 설정',
    },
    {
        title: '설정',
        path: '/dashboard/settings',
        icon: <Settings className="w-5 h-5" />,
        description: '개인 환경 설정 및 알림 설정',
        children: [
            {
                title: '알림 설정',
                path: '/dashboard/settings/notifications',
                icon: <ChevronRight className="w-4 h-4" />,
                description: '알림 수신 방법 및 빈도 설정',
            },
        ],
    },
];

function SitemapNode({ item, level = 0 }: { item: SitemapItem; level?: number }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = item.children && item.children.length > 0;
    const isParameterPath = item.path.includes('[');

    return (
        <div className={`${level > 0 ? 'ml-8 border-l-2 border-slate-700 pl-4' : ''}`}>
            <div
                className={`
          group flex items-start gap-4 p-4 rounded-xl
          ${level === 0 ? 'bg-slate-800/50 hover:bg-slate-800' : 'hover:bg-slate-800/30'}
          transition-all duration-200
        `}
            >
                <div
                    className={`
            flex items-center justify-center w-10 h-10 rounded-lg
            ${level === 0 ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-slate-700'}
          `}
                >
                    {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {hasChildren && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronRight
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                            </button>
                        )}
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        {!isParameterPath && (
                            <Link
                                href={item.path}
                                className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 transition-all"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                    <code className="text-xs text-slate-500 mt-2 block font-mono">{item.path}</code>
                </div>
            </div>
            {hasChildren && isExpanded && (
                <div className="mt-2 space-y-2">
                    {item.children?.map((child, index) => (
                        <SitemapNode key={index} item={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function UserSitemapPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                            <Map className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">사용자 사이트맵</h1>
                            <p className="text-slate-400">JASCA 사용자 대시보드의 전체 메뉴 구조</p>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <Link
                            href="/dashboard/sitemap"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                        >
                            사용자 사이트맵
                        </Link>
                        <Link
                            href="/admin/sitemap"
                            className="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                        >
                            관리자 사이트맵
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="text-2xl font-bold text-white">{userSitemap.length}</div>
                        <div className="text-sm text-slate-400">메인 메뉴</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="text-2xl font-bold text-white">
                            {userSitemap.reduce((acc, item) => acc + (item.children?.length || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-400">서브 메뉴</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="text-2xl font-bold text-white">
                            {userSitemap.length + userSitemap.reduce((acc, item) => acc + (item.children?.length || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-400">총 페이지</div>
                    </div>
                </div>

                {/* Sitemap Tree */}
                <div className="space-y-4">
                    {userSitemap.map((item, index) => (
                        <SitemapNode key={index} item={item} />
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white mb-3">범례</h3>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded"></div>
                            <span className="text-slate-400">메인 메뉴</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-slate-700 rounded"></div>
                            <span className="text-slate-400">서브 메뉴</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="text-xs text-slate-500 font-mono">[id]</code>
                            <span className="text-slate-400">동적 파라미터</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
