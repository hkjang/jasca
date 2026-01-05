'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    Shield,
    CheckCircle,
    Clock,
    XCircle,
    Filter,
    Loader2,
    RefreshCw,
    Package,
    CheckSquare,
    Square,
    Download,
    Edit,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    X,
    FileJson,
    FileSpreadsheet,
    Play,
    Pause,
    TrendingUp,
    TrendingDown,
    Minus,
    Search,
    LayoutGrid,
    LayoutList,
    Keyboard,
    Zap,
    Timer,
    ExternalLink,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    AreaChart,
    Area,
    XAxis,
} from 'recharts';
import { useVulnerabilities, useUpdateVulnerabilityStatus, Vulnerability, useStatsTrend } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { ThemeToggle } from '@/components/theme-toggle';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'FALSE_POSITIVE'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const AUTO_REFRESH_INTERVALS = [
    { label: '10초', value: 10000 },
    { label: '30초', value: 30000 },
    { label: '1분', value: 60000 },
    { label: '5분', value: 300000 },
];

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    UNKNOWN: '#64748b',
};

const QUICK_FILTERS = [
    { id: 'critical-only', label: 'Critical만', severity: ['CRITICAL'], status: undefined },
    { id: 'high-critical', label: 'High+', severity: ['CRITICAL', 'HIGH'], status: undefined },
    { id: 'open-only', label: '미해결만', severity: undefined, status: ['OPEN'] },
    { id: 'in-progress', label: '진행중', severity: undefined, status: ['IN_PROGRESS'] },
];

type SortField = 'severity' | 'status' | 'cveId' | 'pkgName' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'card';

function getSeverityBadge(severity: string) {
    const colors: Record<string, string> = {
        CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
        LOW: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    };
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${colors[severity] || colors.UNKNOWN}`}>
            {severity}
        </span>
    );
}

function getStatusBadge(status: string) {
    const config: Record<string, { icon: React.ReactNode; color: string }> = {
        OPEN: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
        IN_PROGRESS: { icon: <Clock className="h-3 w-3" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
        RESOLVED: { icon: <CheckCircle className="h-3 w-3" />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        WONT_FIX: { icon: <XCircle className="h-3 w-3" />, color: 'text-slate-600 bg-slate-50 dark:bg-slate-700' },
        FALSE_POSITIVE: { icon: <Shield className="h-3 w-3" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    };
    const { icon, color } = config[status] || config.OPEN;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
            {icon}
            {status.replace('_', ' ')}
        </span>
    );
}

function getSeverityOrder(severity: string): number {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
    return order[severity] ?? 5;
}

// CVSS Score gauge
function CVSSGauge({ score }: { score?: number }) {
    if (score === undefined) return <span className="text-xs text-slate-400">N/A</span>;
    const percentage = (score / 10) * 100;
    const color = score >= 9 ? '#dc2626' : score >= 7 ? '#ea580c' : score >= 4 ? '#eab308' : '#22c55e';
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-mono font-medium" style={{ color }}>{score.toFixed(1)}</span>
        </div>
    );
}

// Time since discovery
function TimeSince({ date }: { date: string }) {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let color = 'text-green-600';
    if (days >= 30) color = 'text-red-600';
    else if (days >= 7) color = 'text-orange-600';
    else if (days >= 3) color = 'text-yellow-600';
    
    return (
        <span className={`flex items-center gap-1 text-xs ${color}`}>
            <Timer className="h-3 w-3" />
            {days > 0 ? `${days}일` : `${hours}시간`}
        </span>
    );
}

// Stats Card
function StatCard({ title, value, icon, color, trend, onClick, active }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'purple';
    trend?: number;
    onClick?: () => void;
    active?: boolean;
}) {
    const colorClasses = {
        red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
        orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
        yellow: 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
        blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
        green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
        purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    };

    return (
        <button
            onClick={onClick}
            className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl group w-full text-left ${active ? 'ring-4 ring-white/50' : ''}`}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-white/80">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {trend !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            <span className="text-xs">{trend > 0 ? '+' : ''}{trend}%</span>
                        </div>
                    )}
                </div>
                <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
            </div>
        </button>
    );
}

// Expanded Row Detail
function ExpandedRowDetail({ vuln }: { vuln: Vulnerability }) {
    return (
        <tr>
            <td colSpan={8} className="bg-slate-50 dark:bg-slate-700/30 px-8 py-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">설명</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                            {vuln.description || '설명이 없습니다.'}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">패키지 정보</h4>
                        <div className="space-y-1 text-sm">
                            <p><span className="text-slate-500">설치됨:</span> <code className="text-red-600 dark:text-red-400">{vuln.installedVersion}</code></p>
                            {vuln.fixedVersion && (
                                <p><span className="text-slate-500">수정됨:</span> <code className="text-green-600 dark:text-green-400">{vuln.fixedVersion}</code></p>
                            )}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">참조</h4>
                        <div className="flex gap-2">
                            <a href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:underline">
                                NVD <ExternalLink className="h-3 w-3" />
                            </a>
                            <a href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cveId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded hover:underline">
                                MITRE <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    );
}

// Card View Item
function VulnerabilityCard({ vuln, selected, onSelect, onExpand, onClick }: {
    vuln: Vulnerability;
    selected: boolean;
    onSelect: () => void;
    onExpand: () => void;
    onClick: () => void;
}) {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border ${selected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200 dark:border-slate-700'} p-4 hover:shadow-lg transition-all cursor-pointer`} onClick={onClick}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="p-1">
                        {selected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                    </button>
                    {getSeverityBadge(vuln.severity)}
                </div>
                <TimeSince date={vuln.createdAt || new Date().toISOString()} />
            </div>
            <h3 className="font-mono font-medium text-blue-600 mb-1">{vuln.cveId}</h3>
            {vuln.title && <p className="text-sm text-slate-500 dark:text-slate-400 truncate mb-2">{vuln.title}</p>}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-3">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="truncate">{vuln.pkgName}</span>
            </div>
            <div className="flex items-center justify-between">
                {getStatusBadge(vuln.status)}
                <span className="text-xs text-slate-500">{vuln.scanResult?.project?.name || '-'}</span>
            </div>
        </div>
    );
}

// Keyboard shortcuts help modal
function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    const shortcuts = [
        { key: 'j / ↓', desc: '다음 행 선택' },
        { key: 'k / ↑', desc: '이전 행 선택' },
        { key: 'Enter', desc: '상세 페이지로 이동' },
        { key: 'Space', desc: '행 선택/해제' },
        { key: 'x', desc: '행 확장/축소' },
        { key: 'r', desc: '새로고침' },
        { key: '/', desc: '검색 포커스' },
        { key: 'Esc', desc: '선택 해제 또는 모달 닫기' },
    ];
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Keyboard className="h-5 w-5" /> 키보드 단축키
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map(s => (
                        <div key={s.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm font-mono">{s.key}</kbd>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{s.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function VulnerabilitiesPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<{ severity?: string[]; status?: string[] }>({});
    const [showFilters, setShowFilters] = useState(false);
    const [editingStatus, setEditingStatus] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    
    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // View mode
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    
    // Expanded rows
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    
    // Keyboard navigation
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    
    // Quick filter
    const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
    
    // Sorting
    const [sortField, setSortField] = useState<SortField>('severity');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    
    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30000);
    
    // Export
    const [showExportMenu, setShowExportMenu] = useState(false);

    const { data, isLoading, error, refetch } = useVulnerabilities(filters);
    const { data: trendData } = useStatsTrend(undefined, 7);
    const updateStatus = useUpdateVulnerabilityStatus();

    // AI
    const { execute: executePriorityReorder, isLoading: aiLoading, result: aiResult, previousResults: aiPreviousResults, estimateTokens, cancel: cancelAi, progress: aiProgress } = useAiExecution('vuln.priorityReorder');
    const { activePanel, closePanel } = useAiStore();

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const timer = setInterval(() => refetch(), refreshInterval);
        return () => clearInterval(timer);
    }, [autoRefresh, refreshInterval, refetch]);

    const vulnerabilities = data?.results || [];

    // Search filter
    const searchFiltered = vulnerabilities.filter((v: Vulnerability) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return v.cveId.toLowerCase().includes(q) || v.pkgName.toLowerCase().includes(q) || (v.title?.toLowerCase().includes(q));
    });

    // Stats
    const stats = {
        critical: searchFiltered.filter((v: Vulnerability) => v.severity === 'CRITICAL').length,
        high: searchFiltered.filter((v: Vulnerability) => v.severity === 'HIGH').length,
        medium: searchFiltered.filter((v: Vulnerability) => v.severity === 'MEDIUM').length,
        low: searchFiltered.filter((v: Vulnerability) => v.severity === 'LOW').length,
        open: searchFiltered.filter((v: Vulnerability) => v.status === 'OPEN').length,
        resolved: searchFiltered.filter((v: Vulnerability) => v.status === 'RESOLVED').length,
    };

    // Chart data
    const severityChartData = [
        { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.CRITICAL },
        { name: 'High', value: stats.high, color: SEVERITY_COLORS.HIGH },
        { name: 'Medium', value: stats.medium, color: SEVERITY_COLORS.MEDIUM },
        { name: 'Low', value: stats.low, color: SEVERITY_COLORS.LOW },
    ].filter(d => d.value > 0);

    // Sort
    const sorted = [...searchFiltered].sort((a: Vulnerability, b: Vulnerability) => {
        let cmp = 0;
        switch (sortField) {
            case 'severity': cmp = getSeverityOrder(a.severity) - getSeverityOrder(b.severity); break;
            case 'cveId': cmp = a.cveId.localeCompare(b.cveId); break;
            case 'pkgName': cmp = a.pkgName.localeCompare(b.pkgName); break;
            case 'status': cmp = a.status.localeCompare(b.status); break;
            default: cmp = 0;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Paginate
    const totalPages = Math.ceil(sorted.length / pageSize);
    const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === 'Escape') (e.target as HTMLElement).blur();
                return;
            }
            
            switch (e.key) {
                case 'j': case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(i => Math.min(i + 1, paginated.length - 1));
                    break;
                case 'k': case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(i => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    if (focusedIndex >= 0 && paginated[focusedIndex]) {
                        router.push(`/dashboard/vulnerabilities/${paginated[focusedIndex].id}`);
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (focusedIndex >= 0 && paginated[focusedIndex]) toggleSelect(paginated[focusedIndex].id);
                    break;
                case 'x':
                    if (focusedIndex >= 0 && paginated[focusedIndex]) toggleExpand(paginated[focusedIndex].id);
                    break;
                case 'r':
                    if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); refetch(); }
                    break;
                case '/':
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    break;
                case 'Escape':
                    setSelectedIds(new Set());
                    setFocusedIndex(-1);
                    setShowShortcutsModal(false);
                    break;
                case '?':
                    setShowShortcutsModal(true);
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusedIndex, paginated, refetch, router]);

    // Handlers
    const handleSort = (field: SortField) => {
        if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortOrder('asc'); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    };

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.size === paginated.length ? new Set() : new Set(paginated.map((v: Vulnerability) => v.id)));
    };

    const toggleExpand = (id: string) => {
        setExpandedRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkStatusChange = async (status: string) => {
        if (selectedIds.size === 0) return;
        setBulkActionLoading(true);
        try {
            await Promise.all(Array.from(selectedIds).map(id => updateStatus.mutateAsync({ id, status })));
            clearSelection(); refetch();
        } catch (e) { console.error(e); }
        finally { setBulkActionLoading(false); }
    };

    const handleExport = (format: 'csv' | 'json') => {
        const items = selectedIds.size > 0 ? searchFiltered.filter((v: Vulnerability) => selectedIds.has(v.id)) : searchFiltered;
        if (format === 'csv') {
            const csv = [['CVE ID', 'Package', 'Severity', 'Status', 'Installed', 'Fixed', 'Project'].join(','), ...items.map((v: Vulnerability) => [v.cveId, v.pkgName, v.severity, v.status, v.installedVersion, v.fixedVersion || '', v.scanResult?.project?.name || ''].join(','))].join('\n');
            download(csv, `vulnerabilities-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        } else {
            download(JSON.stringify(items, null, 2), `vulnerabilities-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        }
        setShowExportMenu(false);
    };

    const download = (content: string, filename: string, type: string) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type }));
        a.download = filename;
        a.click();
    };

    const handleStatusChange = async (id: string, status: string) => {
        try { await updateStatus.mutateAsync({ id, status }); setEditingStatus(null); } catch (e) { console.error(e); }
    };

    const toggleFilter = (type: 'severity' | 'status', value: string) => {
        setFilters(prev => {
            const curr = prev[type] || [];
            const upd = curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value];
            return { ...prev, [type]: upd.length ? upd : undefined };
        });
        setCurrentPage(1);
        setActiveQuickFilter(null);
    };

    const applyQuickFilter = (f: typeof QUICK_FILTERS[0]) => {
        if (activeQuickFilter === f.id) {
            setFilters({});
            setActiveQuickFilter(null);
        } else {
            setFilters({ severity: f.severity, status: f.status });
            setActiveQuickFilter(f.id);
        }
        setCurrentPage(1);
    };

    const handleAiPriorityReorder = () => {
        executePriorityReorder({ screen: 'vulnerabilities', vulnerabilities: data?.results || [], total: data?.total || 0, filters, timestamp: new Date().toISOString() });
    };

    const estimatedTokens = estimateTokens({ vulnerabilities: data?.results?.slice(0, 10) || [], total: data?.total || 0 });
    const isAllSelected = paginated.length > 0 && selectedIds.size === paginated.length;
    const isSomeSelected = selectedIds.size > 0;

    const trendChartData = trendData?.map(t => ({ date: new Date(t.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }), value: t.critical + t.high })) || [];

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <p className="text-slate-600 dark:text-slate-400">취약점을 불러오는데 실패했습니다.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><RefreshCw className="h-4 w-4" /> 다시 시도</button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">취약점</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">총 {data?.total || 0}개 {searchQuery && `(검색: ${searchFiltered.length}개)`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="CVE ID, 패키지명 검색... (/)"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
                    </div>
                    {/* View Mode */}
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutList className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('card')} className={`p-2 ${viewMode === 'card' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
                    </div>
                    {/* Auto Refresh */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <button onClick={() => setAutoRefresh(!autoRefresh)} className={`p-1 rounded ${autoRefresh ? 'text-green-600' : 'text-slate-400'}`}>
                            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))} className="text-xs bg-transparent border-none focus:ring-0 dark:text-slate-300">
                            {AUTO_REFRESH_INTERVALS.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <ThemeToggle />
                    <button onClick={() => setShowShortcutsModal(true)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700" title="키보드 단축키 (?)"><Keyboard className="h-4 w-4" /></button>
                    <AiButton action="vuln.priorityReorder" variant="primary" size="md" estimatedTokens={estimatedTokens} loading={aiLoading} onExecute={handleAiPriorityReorder} onCancel={cancelAi} />
                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30' : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800'}`}><Filter className="h-4 w-4" /> 필터</button>
                    <div className="relative">
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"><Download className="h-4 w-4" /> 내보내기</button>
                        {showExportMenu && (
                            <><div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} /><div className="absolute right-0 top-full mt-2 z-20 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border py-1">
                                <button onClick={() => handleExport('csv')} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"><FileSpreadsheet className="h-4 w-4" /> CSV</button>
                                <button onClick={() => handleExport('json')} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"><FileJson className="h-4 w-4" /> JSON</button>
                            </div></>
                        )}
                    </div>
                    <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><RefreshCw className="h-4 w-4" /></button>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-slate-500 mr-2">빠른 필터:</span>
                {QUICK_FILTERS.map(f => (
                    <button key={f.id} onClick={() => applyQuickFilter(f)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${activeQuickFilter === f.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>{f.label}</button>
                ))}
                {(filters.severity?.length || filters.status?.length) && (
                    <button onClick={() => { setFilters({}); setActiveQuickFilter(null); }} className="px-3 py-1 text-xs text-red-600 hover:underline">초기화</button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="Critical" value={stats.critical} icon={<Shield className="h-5 w-5" />} color="red" onClick={() => toggleFilter('severity', 'CRITICAL')} active={filters.severity?.includes('CRITICAL')} />
                <StatCard title="High" value={stats.high} icon={<AlertTriangle className="h-5 w-5" />} color="orange" onClick={() => toggleFilter('severity', 'HIGH')} active={filters.severity?.includes('HIGH')} />
                <StatCard title="Medium" value={stats.medium} icon={<AlertTriangle className="h-5 w-5" />} color="yellow" onClick={() => toggleFilter('severity', 'MEDIUM')} active={filters.severity?.includes('MEDIUM')} />
                <StatCard title="Low" value={stats.low} icon={<Shield className="h-5 w-5" />} color="blue" onClick={() => toggleFilter('severity', 'LOW')} active={filters.severity?.includes('LOW')} />
                <StatCard title="미해결" value={stats.open} icon={<XCircle className="h-5 w-5" />} color="purple" onClick={() => toggleFilter('status', 'OPEN')} active={filters.status?.includes('OPEN')} />
                <StatCard title="해결됨" value={stats.resolved} icon={<CheckCircle className="h-5 w-5" />} color="green" onClick={() => toggleFilter('status', 'RESOLVED')} active={filters.status?.includes('RESOLVED')} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">심각도 분포</h3>
                    <div className="h-40">
                        {severityChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={severityChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" onClick={entry => toggleFilter('severity', entry.name.toUpperCase())}>{severityChartData.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer hover:opacity-80" />)}</Pie><Tooltip /></PieChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-500 text-sm">데이터 없음</div>}
                    </div>
                    <div className="flex justify-center gap-4 mt-2">{severityChartData.map(i => <div key={i.name} className="flex items-center gap-1 text-xs"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} /><span className="text-slate-600 dark:text-slate-400">{i.value}</span></div>)}</div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">취약점 추세 (7일)</h3>
                    <div className="h-40">
                        {trendChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendChartData}><defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" /><Tooltip /><Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" /></AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-500 text-sm">데이터 없음</div>}
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {isSomeSelected && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top">
                    <div className="flex items-center gap-4"><span className="text-blue-700 dark:text-blue-300 font-medium">{selectedIds.size}개 선택됨</span><button onClick={clearSelection} className="text-blue-600 hover:underline text-sm">선택 해제</button></div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setShowBulkActions(!showBulkActions)} disabled={bulkActionLoading} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg hover:bg-slate-50 disabled:opacity-50">
                                {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />} 상태 변경
                            </button>
                            {showBulkActions && <><div className="fixed inset-0 z-10" onClick={() => setShowBulkActions(false)} /><div className="absolute right-0 top-full mt-2 z-20 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border py-1">{STATUS_OPTIONS.map(s => <button key={s} onClick={() => { handleBulkStatusChange(s); setShowBulkActions(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700">{s.replace('_', ' ')}</button>)}</div></>}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">심각도</label><div className="flex flex-wrap gap-2">{SEVERITY_OPTIONS.map(s => <button key={s} onClick={() => toggleFilter('severity', s)} className={`px-3 py-1.5 text-sm rounded-lg border ${filters.severity?.includes(s) ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700'}`}>{s}</button>)}</div></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">상태</label><div className="flex flex-wrap gap-2">{STATUS_OPTIONS.map(s => <button key={s} onClick={() => toggleFilter('status', s)} className={`px-3 py-1.5 text-sm rounded-lg border ${filters.status?.includes(s) ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700'}`}>{s.replace('_', ' ')}</button>)}</div></div>
                </div>
            )}

            {/* Content */}
            {searchFiltered.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-12 text-center">
                    <Shield className="h-16 w-16 mx-auto text-green-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">취약점이 없습니다</h3>
                    <p className="text-slate-600 dark:text-slate-400">{searchQuery ? '검색 결과가 없습니다' : '현재 조건에 맞는 취약점이 없습니다'}</p>
                </div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginated.map((v: Vulnerability) => <VulnerabilityCard key={v.id} vuln={v} selected={selectedIds.has(v.id)} onSelect={() => toggleSelect(v.id)} onExpand={() => {}} onClick={() => router.push(`/dashboard/vulnerabilities/${v.id}`)} />)}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left"><button onClick={toggleSelectAll} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600">{isAllSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-slate-400" />}</button></th>
                                <th className="px-2 py-3 w-6"></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('cveId')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">CVE ID {sortField === 'cveId' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('pkgName')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">패키지 {sortField === 'pkgName' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('severity')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">심각도 {sortField === 'severity' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('status')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">상태 {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">경과</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">프로젝트</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {paginated.map((v: Vulnerability, idx: number) => (
                                <>
                                    <tr key={v.id} onClick={() => router.push(`/dashboard/vulnerabilities/${v.id}`)} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${selectedIds.has(v.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${focusedIndex === idx ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}><button onClick={() => toggleSelect(v.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600">{selectedIds.has(v.id) ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-slate-400" />}</button></td>
                                        <td className="px-2 py-3" onClick={e => e.stopPropagation()}><button onClick={() => toggleExpand(v.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><ChevronRight className={`h-4 w-4 transition-transform ${expandedRows.has(v.id) ? 'rotate-90' : ''}`} /></button></td>
                                        <td className="px-4 py-3"><span className="text-blue-600 font-medium">{v.cveId}</span>{v.title && <p className="text-xs text-slate-500 truncate max-w-[200px]">{v.title}</p>}</td>
                                        <td className="px-4 py-3"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" /><span className="text-slate-900 dark:text-white">{v.pkgName}</span></div></td>
                                        <td className="px-4 py-3">{getSeverityBadge(v.severity)}</td>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            {editingStatus === v.id ? <select className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-700" value={v.status} onChange={e => handleStatusChange(v.id, e.target.value)} onBlur={() => setEditingStatus(null)} autoFocus>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select> : <button onClick={() => setEditingStatus(v.id)} className="hover:opacity-80">{getStatusBadge(v.status)}</button>}
                                        </td>
                                        <td className="px-4 py-3"><TimeSince date={v.createdAt || new Date().toISOString()} /></td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{v.scanResult?.project?.name || '-'}</td>
                                    </tr>
                                    {expandedRows.has(v.id) && <ExpandedRowDetail vuln={v} />}
                                </>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-600"><span>페이지당</span><select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-700">{PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select><span>개 | 총 {sorted.length}개 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sorted.length)}</span></div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50">처음</button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50">이전</button>
                            <span className="px-3 py-1 text-sm">{currentPage} / {totalPages || 1}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50">다음</button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50">마지막</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
            <AiResultPanel isOpen={activePanel?.key === 'vuln.priorityReorder'} onClose={closePanel} result={aiResult} previousResults={aiPreviousResults} loading={aiLoading} loadingProgress={aiProgress} onRegenerate={handleAiPriorityReorder} action="vuln.priorityReorder" />
        </div>
    );
}
