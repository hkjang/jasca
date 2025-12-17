'use client';

import * as React from 'react';
import Link from 'next/link';
import { Clock, FolderKanban, X } from 'lucide-react';

// ============================================
// Types
// ============================================
interface RecentProject {
    id: string;
    name: string;
    slug: string;
    visitedAt: number;
}

const STORAGE_KEY = 'jasca_recent_projects';
const MAX_RECENT = 5;

// ============================================
// Hook: useRecentProjects
// ============================================
export function useRecentProjects() {
    const [recentProjects, setRecentProjects] = React.useState<RecentProject[]>([]);
    const [mounted, setMounted] = React.useState(false);

    // Load from localStorage on mount
    React.useEffect(() => {
        setMounted(true);
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setRecentProjects(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load recent projects:', error);
        }
    }, []);

    // Add a project to recent
    const addRecent = React.useCallback((project: Omit<RecentProject, 'visitedAt'>) => {
        setRecentProjects((prev) => {
            const filtered = prev.filter((p) => p.id !== project.id);
            const updated = [
                { ...project, visitedAt: Date.now() },
                ...filtered,
            ].slice(0, MAX_RECENT);

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (error) {
                console.error('Failed to save recent projects:', error);
            }

            return updated;
        });
    }, []);

    // Remove a project from recent
    const removeRecent = React.useCallback((projectId: string) => {
        setRecentProjects((prev) => {
            const updated = prev.filter((p) => p.id !== projectId);

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (error) {
                console.error('Failed to save recent projects:', error);
            }

            return updated;
        });
    }, []);

    // Clear all recent projects
    const clearRecent = React.useCallback(() => {
        setRecentProjects([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear recent projects:', error);
        }
    }, []);

    return {
        recentProjects,
        addRecent,
        removeRecent,
        clearRecent,
        isLoaded: mounted,
    };
}

// ============================================
// RecentProjects Component (사이드바용)
// ============================================
export interface RecentProjectsProps {
    collapsed?: boolean;
    className?: string;
}

export function RecentProjects({ collapsed = false, className }: RecentProjectsProps) {
    const { recentProjects, removeRecent, isLoaded } = useRecentProjects();

    if (!isLoaded || recentProjects.length === 0) {
        return null;
    }

    if (collapsed) {
        return (
            <div className={className} title="최근 프로젝트">
                <Clock className="h-5 w-5 text-slate-400" />
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Clock className="h-4 w-4" />
                <span>최근 프로젝트</span>
            </div>
            <ul className="space-y-1 px-2">
                {recentProjects.map((project) => (
                    <li key={project.id} className="group relative">
                        <Link
                            href={`/dashboard/projects/${project.slug}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            <FolderKanban className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{project.name}</span>
                        </Link>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeRecent(project.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity"
                            aria-label={`${project.name} 제거`}
                        >
                            <X className="h-3 w-3 text-slate-400" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ============================================
// Compact Recent Projects (헤더용)
// ============================================
export interface RecentProjectsDropdownProps {
    className?: string;
}

export function RecentProjectsDropdown({ className }: RecentProjectsDropdownProps) {
    const { recentProjects, isLoaded } = useRecentProjects();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isLoaded || recentProjects.length === 0) {
        return null;
    }

    return (
        <div ref={dropdownRef} className={`relative ${className || ''}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                <Clock className="h-4 w-4" />
                <span>최근 프로젝트</span>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                    {recentProjects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/dashboard/projects/${project.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <FolderKanban className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{project.name}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
