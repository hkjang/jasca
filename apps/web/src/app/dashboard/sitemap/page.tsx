'use client';

import { useState } from 'react';
import {
    Home,
    BarChart3,
    Shield,
    FileSearch,
    AlertTriangle,
    Settings,
    User,
    Bell,
    Key,
    FileText,
    FolderKanban,
    ChevronRight,
    ChevronDown,
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
        icon: <AlertTriangle className="w-5 h-5" />,
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
        <div className={`${level > 0 ? 'ml-6 border-l-2 border-slate-200 dark:border-slate-700 pl-4' : ''}`}>
            <div
                className={`
                    group flex items-start gap-4 p-4 rounded-xl
                    ${level === 0
                        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50'}
                    transition-all duration-200
                `}
            >
                <div
                    className={`
                        flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0
                        ${level === 0
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}
                    `}
                >
                    {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {hasChildren && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>
                        )}
                        <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                        {!isParameterPath && (
                            <Link
                                href={item.path}
                                className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
                    <code className="text-xs text-slate-500 dark:text-slate-500 mt-2 block font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded w-fit">
                        {item.path}
                    </code>
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
    const mainMenuCount = userSitemap.length;
    const subMenuCount = userSitemap.reduce((acc, item) => acc + (item.children?.length || 0), 0);
    const totalPages = mainMenuCount + subMenuCount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">사이트맵</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        JASCA 사용자 대시보드의 전체 메뉴 구조
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Map className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">사용자 메뉴</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{mainMenuCount}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">메인 메뉴</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <ChevronRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{subMenuCount}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">서브 메뉴</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalPages}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">총 페이지</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sitemap Tree */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                    <h3 className="font-semibold text-slate-900 dark:text-white">메뉴 구조</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        각 메뉴 항목을 클릭하여 해당 페이지로 이동할 수 있습니다
                    </p>
                </div>
                <div className="p-4 space-y-3">
                    {userSitemap.map((item, index) => (
                        <SitemapNode key={index} item={item} />
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">범례</h3>
                <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md"></div>
                        <span className="text-slate-600 dark:text-slate-400">메인 메뉴</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                        <span className="text-slate-600 dark:text-slate-400">서브 메뉴</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">[id]</code>
                        <span className="text-slate-600 dark:text-slate-400">동적 파라미터</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-slate-600 dark:text-slate-400">링크 이동</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
