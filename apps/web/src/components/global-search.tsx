'use client';

import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

interface SearchResult {
    type: 'vulnerability' | 'package' | 'project' | 'scan';
    id: string;
    title: string;
    subtitle: string;
}

const mockResults: SearchResult[] = [
    { type: 'vulnerability', id: 'CVE-2024-1234', title: 'CVE-2024-1234', subtitle: 'Prototype Pollution in lodash' },
    { type: 'vulnerability', id: 'CVE-2024-5678', title: 'CVE-2024-5678', subtitle: 'SSRF in axios' },
    { type: 'package', id: 'lodash', title: 'lodash@4.17.20', subtitle: '12 vulnerabilities' },
    { type: 'package', id: 'express', title: 'express@4.18.2', subtitle: '3 vulnerabilities' },
    { type: 'project', id: 'backend-api', title: 'backend-api', subtitle: 'ACME Corp' },
    { type: 'project', id: 'frontend-web', title: 'frontend-web', subtitle: 'ACME Corp' },
    { type: 'scan', id: 'scan-001', title: 'backend-api:v2.4.0', subtitle: '2024-12-17 10:30' },
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
    const [recentSearches] = useState(['CVE-2024-1234', 'lodash', 'backend-api']);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (query.length > 0) {
            const filtered = mockResults.filter(r =>
                r.title.toLowerCase().includes(query.toLowerCase()) ||
                r.subtitle.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered);
        } else {
            setResults([]);
        }
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        router.push(getPath(result));
        onClose();
        setQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <Search className="h-5 w-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="CVE, 패키지, 프로젝트 검색..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-lg"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {query.length === 0 ? (
                        <div className="p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">최근 검색</p>
                            {recentSearches.map((search) => (
                                <button
                                    key={search}
                                    onClick={() => setQuery(search)}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg"
                                >
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    {search}
                                </button>
                            ))}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            검색 결과가 없습니다
                        </div>
                    ) : (
                        <div className="p-2">
                            {results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg group"
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
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <span><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↑↓</kbd> 이동</span>
                        <span><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Enter</kbd> 선택</span>
                        <span><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd> 닫기</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
