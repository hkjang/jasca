'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    Clock,
    X,
    ExternalLink,
    ChevronRight,
    Trash2,
} from 'lucide-react';

interface RecentPage {
    path: string;
    title: string;
    timestamp: number;
}

const STORAGE_KEY = 'jasca-recent-pages';
const MAX_PAGES = 10;

// Helper to get page title from path
function getPageTitle(path: string): string {
    const segments = path.split('/').filter(Boolean);
    const titles: Record<string, string> = {
        'dashboard': '대시보드',
        'admin': '관리자',
        'projects': '프로젝트',
        'vulnerabilities': '취약점',
        'scans': '스캔 결과',
        'policies': '정책',
        'reports': '보고서',
        'settings': '설정',
        'users': '사용자 관리',
        'organizations': '조직 관리',
        'profile': '프로필',
        'notifications': '알림',
    };

    if (segments.length === 0) return '홈';
    
    const lastSegment = segments[segments.length - 1];
    if (titles[lastSegment]) return titles[lastSegment];
    
    // Check for ID-based pages
    if (segments.includes('vulnerabilities') && segments.length > 2) {
        return `취약점: ${lastSegment}`;
    }
    if (segments.includes('projects') && segments.length > 2) {
        return `프로젝트: ${lastSegment}`;
    }
    
    return lastSegment;
}

// Hook to track page visits
export function useRecentPages() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;
        
        // Don't track login/register pages
        if (pathname.includes('/login') || pathname.includes('/register')) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        const pages: RecentPage[] = saved ? JSON.parse(saved) : [];
        
        // Add current page
        const newPage: RecentPage = {
            path: pathname,
            title: getPageTitle(pathname),
            timestamp: Date.now(),
        };

        // Remove if already exists, add to front
        const updated = [
            newPage,
            ...pages.filter(p => p.path !== pathname),
        ].slice(0, MAX_PAGES);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }, [pathname]);
}

// Component to display recent pages
export function RecentPagesPanel({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
    const [pages, setPages] = useState<RecentPage[]>([]);

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setPages(JSON.parse(saved));
            }
        }
    }, [isOpen]);

    const clearHistory = () => {
        localStorage.removeItem(STORAGE_KEY);
        setPages([]);
    };

    const removePage = (path: string) => {
        const updated = pages.filter(p => p.path !== path);
        setPages(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const handleNavigate = (path: string) => {
        router.push(path);
        onClose();
    };

    const formatTimestamp = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        return `${days}일 전`;
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-80 mt-16 mr-4 overflow-hidden animate-in slide-in-from-right duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                        <Clock className="h-4 w-4" />
                        최근 방문
                    </div>
                    <div className="flex items-center gap-1">
                        {pages.length > 0 && (
                            <button
                                onClick={clearHistory}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="기록 삭제"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Pages List */}
                <div className="max-h-96 overflow-y-auto">
                    {pages.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            <p>방문 기록이 없습니다</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {pages.map((page) => (
                                <div
                                    key={page.path}
                                    className="group flex items-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                    <button
                                        onClick={() => handleNavigate(page.path)}
                                        className="flex-1 flex items-center gap-3 px-3 py-2 text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                {page.title}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {page.path}
                                            </p>
                                        </div>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">
                                            {formatTimestamp(page.timestamp)}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => removePage(page.path)}
                                        className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Compact recent pages button for sidebar
export function RecentPagesButton({
    className = '',
    onClick,
}: {
    className?: string;
    onClick: () => void;
}) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setCount(JSON.parse(saved).length);
        }
    }, []);

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg
                text-slate-600 dark:text-slate-300
                hover:bg-slate-100 dark:hover:bg-slate-700
                transition-colors
                ${className}
            `}
        >
            <Clock className="h-4 w-4" />
            <span className="text-sm">최근 방문</span>
            {count > 0 && (
                <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">
                    {count}
                </span>
            )}
        </button>
    );
}
