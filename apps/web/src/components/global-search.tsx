'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    X,
    FileSearch,
    Package,
    Shield,
    FolderKanban,
    Clock,
    ArrowRight,
    Star,
    TrendingUp,
    Trash2,
} from 'lucide-react';

interface SearchResult {
    type: 'vulnerability' | 'package' | 'project' | 'scan';
    id: string;
    title: string;
    subtitle: string;
    severity?: string;
}

const mockResults: SearchResult[] = [
    { type: 'vulnerability', id: 'CVE-2024-1234', title: 'CVE-2024-1234', subtitle: 'Prototype Pollution in lodash', severity: 'critical' },
    { type: 'vulnerability', id: 'CVE-2024-5678', title: 'CVE-2024-5678', subtitle: 'SSRF in axios', severity: 'high' },
    { type: 'package', id: 'lodash', title: 'lodash@4.17.20', subtitle: '12 vulnerabilities' },
    { type: 'package', id: 'express', title: 'express@4.18.2', subtitle: '3 vulnerabilities' },
    { type: 'project', id: 'backend-api', title: 'backend-api', subtitle: 'ACME Corp' },
    { type: 'project', id: 'frontend-web', title: 'frontend-web', subtitle: 'ACME Corp' },
    { type: 'scan', id: 'scan-001', title: 'backend-api:v2.4.0', subtitle: '2024-12-17 10:30' },
];

const categories = [
    { key: 'all', label: '전체' },
    { key: 'vulnerability', label: '취약점' },
    { key: 'package', label: '패키지' },
    { key: 'project', label: '프로젝트' },
    { key: 'scan', label: '스캔' },
];

function getIcon(type: string) {
    switch (type) {
        case 'vulnerability':
            return <Shield className="h-4 w-4 text-red-500" />;
        case 'package':
            return <Package className="h-4 w-4 text-blue-500" />;
        case 'project':
            return <FolderKanban className="h-4 w-4 text-purple-500" />;
        case 'scan':
            return <FileSearch className="h-4 w-4 text-green-500" />;
        default:
            return <Search className="h-4 w-4" />;
    }
}

function getPath(result: SearchResult): string {
    switch (result.type) {
        case 'vulnerability':
            return `/dashboard/vulnerabilities/${result.id}`;
        case 'package':
            return `/dashboard/packages/${result.id}`;
        case 'project':
            return `/dashboard/projects/${result.id}`;
        case 'scan':
            return `/dashboard/scans/${result.id}`;
        default:
            return '/dashboard';
    }
}

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState('all');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);

    // Load recent searches and favorites from localStorage
    useEffect(() => {
        const savedSearches = localStorage.getItem('jasca-recent-searches');
        const savedFavorites = localStorage.getItem('jasca-search-favorites');
        if (savedSearches) setRecentSearches(JSON.parse(savedSearches));
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (query.length > 0) {
            let filtered = mockResults.filter(r =>
                r.title.toLowerCase().includes(query.toLowerCase()) ||
                r.subtitle.toLowerCase().includes(query.toLowerCase())
            );
            if (activeCategory !== 'all') {
                filtered = filtered.filter(r => r.type === activeCategory);
            }
            setResults(filtered);
            setSelectedIndex(0);
        } else {
            setResults([]);
        }
    }, [query, activeCategory]);

    const saveRecentSearch = useCallback((searchTerm: string) => {
        const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('jasca-recent-searches', JSON.stringify(updated));
    }, [recentSearches]);

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('jasca-recent-searches');
    };

    const toggleFavorite = (term: string) => {
        const updated = favorites.includes(term)
            ? favorites.filter(f => f !== term)
            : [...favorites, term];
        setFavorites(updated);
        localStorage.setItem('jasca-search-favorites', JSON.stringify(updated));
    };

    const handleSelect = (result: SearchResult) => {
        saveRecentSearch(result.title);
        router.push(getPath(result));
        onClose();
        setQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
                    <Search className="h-5 w-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="CVE, 패키지, 프로젝트 검색... (Ctrl+K)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-lg"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <kbd className="text-xs font-sans">ESC</kbd>
                    </button>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-700/50 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`
                                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                                ${activeCategory === cat.key
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }
                            `}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {query.length === 0 ? (
                        <div className="p-4">
                            {/* Favorites */}
                            {favorites.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Star className="h-3 w-3" /> 즐겨찾기
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {favorites.map((fav) => (
                                            <button
                                                key={fav}
                                                onClick={() => setQuery(fav)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                            >
                                                <Star className="h-3 w-3 fill-current" />
                                                {fav}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Searches */}
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> 최근 검색
                                </p>
                                {recentSearches.length > 0 && (
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                                    >
                                        <Trash2 className="h-3 w-3" /> 삭제
                                    </button>
                                )}
                            </div>
                            {recentSearches.length > 0 ? (
                                recentSearches.map((search) => (
                                    <button
                                        key={search}
                                        onClick={() => setQuery(search)}
                                        className="flex items-center justify-between w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            {search}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(search);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Star className={`h-4 w-4 ${favorites.includes(search) ? 'text-amber-500 fill-current' : 'text-slate-400'}`} />
                                        </button>
                                    </button>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 py-2">최근 검색 기록이 없습니다</p>
                            )}

                            {/* Trending */}
                            <div className="mt-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> 인기 검색어
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['Critical 취약점', 'lodash', 'CVE-2024', 'backend'].map((term) => (
                                        <button
                                            key={term}
                                            onClick={() => setQuery(term)}
                                            className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center">
                            <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500">'{query}'에 대한 검색 결과가 없습니다</p>
                            <p className="text-sm text-slate-400 mt-1">다른 키워드로 검색해 보세요</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {results.map((result, index) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className={`
                                        flex items-center gap-3 w-full px-3 py-3 text-left rounded-lg group transition-colors
                                        ${index === selectedIndex
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }
                                    `}
                                >
                                    {getIcon(result.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">
                                            {result.title}
                                        </p>
                                        <p className="text-sm text-slate-500 truncate">
                                            {result.subtitle}
                                        </p>
                                    </div>
                                    {result.severity && (
                                        <span className={`
                                            px-2 py-0.5 rounded text-xs font-medium
                                            ${result.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : ''}
                                            ${result.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : ''}
                                        `}>
                                            {result.severity.toUpperCase()}
                                        </span>
                                    )}
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm">↑↓</kbd> 이동</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm">Enter</kbd> 선택</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm">Esc</kbd> 닫기</span>
                    </div>
                    <span className="text-slate-400">{results.length > 0 && `${results.length}개 결과`}</span>
                </div>
            </div>
        </div>
    );
}
