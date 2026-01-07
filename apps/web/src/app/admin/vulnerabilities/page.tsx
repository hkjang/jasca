'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AlertTriangle,
    Shield,
    ShieldCheck,
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
    Search,
    LayoutList,
    Timer,
    ExternalLink,
    FolderKanban,
    Building2,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import {
    useVulnerabilities,
    useUpdateVulnerabilityStatus,
    Vulnerability,
    useStatsOverview,
    useProjects,
    useStatsByProject,
} from '@/lib/api-hooks';
import { ThemeToggle } from '@/components/theme-toggle';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'FALSE_POSITIVE'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    UNKNOWN: '#64748b',
};

type SortField = 'severity' | 'status' | 'cveId' | 'pkgName' | 'createdAt' | 'project';
type SortOrder = 'asc' | 'desc';

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
    color: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'purple' | 'slate';
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
        slate: 'from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700',
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
            <td colSpan={9} className="bg-slate-50 dark:bg-slate-700/30 px-8 py-4 border-t border-slate-200 dark:border-slate-700">
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

export default function AdminVulnerabilitiesPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<{ severity?: string[]; status?: string[]; projectId?: string }>({});
    const [showFilters, setShowFilters] = useState(false);
    const [editingStatus, setEditingStatus] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    
    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Expanded rows
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    
    // Sorting
    const [sortField, setSortField] = useState<SortField>('severity');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    
    // Export
    const [showExportMenu, setShowExportMenu] = useState(false);

    const { data, isLoading, error, refetch } = useVulnerabilities(filters);
    const { data: statsOverview, isLoading: statsLoading } = useStatsOverview();
    const { data: projectsData } = useProjects();
    const { data: projectStats } = useStatsByProject();
    const updateStatus = useUpdateVulnerabilityStatus();

    const vulnerabilities = data?.results || [];
    const projects = projectsData || [];

    // Search filter
    const searchFiltered = vulnerabilities.filter((v: Vulnerability) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return v.cveId.toLowerCase().includes(q) || 
               v.pkgName.toLowerCase().includes(q) || 
               (v.title?.toLowerCase().includes(q)) ||
               (v.scanResult?.project?.name?.toLowerCase().includes(q));
    });

    // Stats
    const stats = {
        total: searchFiltered.length,
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

    // Project chart data
    const projectChartData = useMemo(() => {
        if (!projectStats) return [];
        return projectStats.slice(0, 5).map((ps: any) => ({
            name: ps.name.length > 12 ? ps.name.substring(0, 12) + '...' : ps.name,
            fullName: ps.name,
            critical: ps.lastScan?.summary?.critical || 0,
            high: ps.lastScan?.summary?.high || 0,
            medium: ps.lastScan?.summary?.medium || 0,
            low: ps.lastScan?.summary?.low || 0,
        }));
    }, [projectStats]);

    // Sort
    const sorted = [...searchFiltered].sort((a: Vulnerability, b: Vulnerability) => {
        let cmp = 0;
        switch (sortField) {
            case 'severity': cmp = getSeverityOrder(a.severity) - getSeverityOrder(b.severity); break;
            case 'cveId': cmp = a.cveId.localeCompare(b.cveId); break;
            case 'pkgName': cmp = a.pkgName.localeCompare(b.pkgName); break;
            case 'status': cmp = a.status.localeCompare(b.status); break;
            case 'project': 
                cmp = (a.scanResult?.project?.name || '').localeCompare(b.scanResult?.project?.name || ''); 
                break;
            default: cmp = 0;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Paginate
    const totalPages = Math.ceil(sorted.length / pageSize);
    const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    };

    const handleProjectFilter = (projectId: string) => {
        setFilters(prev => ({
            ...prev,
            projectId: prev.projectId === projectId ? undefined : projectId,
        }));
        setCurrentPage(1);
    };

    const isAllSelected = paginated.length > 0 && selectedIds.size === paginated.length;
    const isSomeSelected = selectedIds.size > 0;

    if (isLoading || statsLoading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
    );
    
    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <p className="text-slate-600 dark:text-slate-400">취약점을 불러오는데 실패했습니다.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"><RefreshCw className="h-4 w-4" /> 다시 시도</button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">취약점 현황</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        전체 프로젝트 취약점 현황 관리 • 총 {data?.total || 0}개 {searchQuery && `(검색: ${searchFiltered.length}개)`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="CVE ID, 패키지명, 프로젝트 검색..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-red-500"
                        />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
                    </div>
                    <ThemeToggle />
                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg ${showFilters ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30' : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800'}`}><Filter className="h-4 w-4" /> 필터</button>
                    <div className="relative">
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"><Download className="h-4 w-4" /> 내보내기</button>
                        {showExportMenu && (
                            <><div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} /><div className="absolute right-0 top-full mt-2 z-20 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border py-1">
                                <button onClick={() => handleExport('csv')} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"><FileSpreadsheet className="h-4 w-4" /> CSV</button>
                                <button onClick={() => handleExport('json')} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"><FileJson className="h-4 w-4" /> JSON</button>
                            </div></>
                        )}
                    </div>
                    <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"><RefreshCw className="h-4 w-4" /></button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <StatCard title="전체" value={stats.total} icon={<BarChart3 className="h-5 w-5" />} color="slate" />
                <StatCard title="Critical" value={stats.critical} icon={<Shield className="h-5 w-5" />} color="red" onClick={() => toggleFilter('severity', 'CRITICAL')} active={filters.severity?.includes('CRITICAL')} />
                <StatCard title="High" value={stats.high} icon={<AlertTriangle className="h-5 w-5" />} color="orange" onClick={() => toggleFilter('severity', 'HIGH')} active={filters.severity?.includes('HIGH')} />
                <StatCard title="Medium" value={stats.medium} icon={<AlertTriangle className="h-5 w-5" />} color="yellow" onClick={() => toggleFilter('severity', 'MEDIUM')} active={filters.severity?.includes('MEDIUM')} />
                <StatCard title="Low" value={stats.low} icon={<Shield className="h-5 w-5" />} color="blue" onClick={() => toggleFilter('severity', 'LOW')} active={filters.severity?.includes('LOW')} />
                <StatCard title="미해결" value={stats.open} icon={<XCircle className="h-5 w-5" />} color="purple" onClick={() => toggleFilter('status', 'OPEN')} active={filters.status?.includes('OPEN')} />
                <StatCard title="해결됨" value={stats.resolved} icon={<CheckCircle className="h-5 w-5" />} color="green" onClick={() => toggleFilter('status', 'RESOLVED')} active={filters.status?.includes('RESOLVED')} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">심각도 분포</h3>
                    <div className="h-48">
                        {severityChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={severityChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" onClick={entry => toggleFilter('severity', entry.name.toUpperCase())}>{severityChartData.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer hover:opacity-80" />)}</Pie><Tooltip /></PieChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-500 text-sm">데이터 없음</div>}
                    </div>
                    <div className="flex justify-center gap-4 mt-2">{severityChartData.map(i => <div key={i.name} className="flex items-center gap-1 text-xs"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} /><span className="text-slate-600 dark:text-slate-400">{i.name}: {i.value}</span></div>)}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">프로젝트별 취약점 현황</h3>
                        <Link href="/admin/projects" className="text-xs text-blue-500 hover:underline">전체 보기</Link>
                    </div>
                    <div className="h-48">
                        {projectChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f017" />
                                    <XAxis dataKey="name" fontSize={10} stroke="#64748b" />
                                    <YAxis fontSize={10} stroke="#64748b" />
                                    <Tooltip />
                                    <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.CRITICAL} />
                                    <Bar dataKey="high" stackId="a" fill={SEVERITY_COLORS.HIGH} />
                                    <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLORS.MEDIUM} />
                                    <Bar dataKey="low" stackId="a" fill={SEVERITY_COLORS.LOW} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-500 text-sm">데이터 없음</div>}
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {isSomeSelected && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top">
                    <div className="flex items-center gap-4"><span className="text-red-700 dark:text-red-300 font-medium">{selectedIds.size}개 선택됨</span><button onClick={clearSelection} className="text-red-600 hover:underline text-sm">선택 해제</button></div>
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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">심각도</label>
                        <div className="flex flex-wrap gap-2">{SEVERITY_OPTIONS.map(s => <button key={s} onClick={() => toggleFilter('severity', s)} className={`px-3 py-1.5 text-sm rounded-lg border ${filters.severity?.includes(s) ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700'}`}>{s}</button>)}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">상태</label>
                        <div className="flex flex-wrap gap-2">{STATUS_OPTIONS.map(s => <button key={s} onClick={() => toggleFilter('status', s)} className={`px-3 py-1.5 text-sm rounded-lg border ${filters.status?.includes(s) ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700'}`}>{s.replace('_', ' ')}</button>)}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">프로젝트</label>
                        <div className="flex flex-wrap gap-2">
                            {projects.slice(0, 10).map((p: any) => (
                                <button key={p.id} onClick={() => handleProjectFilter(p.id)} className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border ${filters.projectId === p.id ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-700'}`}>
                                    <FolderKanban className="h-3 w-3" />{p.name}
                                </button>
                            ))}
                            {projects.length > 10 && <span className="text-xs text-slate-400 self-center">+{projects.length - 10} more</span>}
                        </div>
                    </div>
                    {(filters.severity?.length || filters.status?.length || filters.projectId) && (
                        <button onClick={() => setFilters({})} className="text-sm text-red-600 hover:underline">필터 초기화</button>
                    )}
                </div>
            )}

            {/* Content */}
            {searchFiltered.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-12 text-center">
                    <ShieldCheck className="h-16 w-16 mx-auto text-green-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">취약점이 없습니다</h3>
                    <p className="text-slate-600 dark:text-slate-400">{searchQuery ? '검색 결과가 없습니다' : '현재 조건에 맞는 취약점이 없습니다'}</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left"><button onClick={toggleSelectAll} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600">{isAllSelected ? <CheckSquare className="h-5 w-5 text-red-600" /> : <Square className="h-5 w-5 text-slate-400" />}</button></th>
                                <th className="px-2 py-3 w-6"></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('cveId')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">CVE ID {sortField === 'cveId' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('pkgName')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">패키지 {sortField === 'pkgName' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('severity')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">심각도 {sortField === 'severity' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('status')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">상태 {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">경과</th>
                                <th className="px-4 py-3 text-left"><button onClick={() => handleSort('project')} className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase hover:text-slate-700">프로젝트 {sortField === 'project' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {paginated.map((v: Vulnerability, idx: number) => (
                                <React.Fragment key={v.id}>
                                    <tr onClick={() => router.push(`/dashboard/vulnerabilities/${v.id}`)} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${selectedIds.has(v.id) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}><button onClick={() => toggleSelect(v.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600">{selectedIds.has(v.id) ? <CheckSquare className="h-5 w-5 text-red-600" /> : <Square className="h-5 w-5 text-slate-400" />}</button></td>
                                        <td className="px-2 py-3" onClick={e => e.stopPropagation()}><button onClick={() => toggleExpand(v.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><ChevronRight className={`h-4 w-4 transition-transform ${expandedRows.has(v.id) ? 'rotate-90' : ''}`} /></button></td>
                                        <td className="px-4 py-3">
                                            <span className="text-red-600 font-medium">{v.cveId}</span>
                                            {v.title && <p className="text-xs text-slate-500 truncate max-w-[200px]">{v.title}</p>}
                                        </td>
                                        <td className="px-4 py-3"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" /><span className="text-slate-900 dark:text-white">{v.pkgName}</span></div></td>
                                        <td className="px-4 py-3">{getSeverityBadge(v.severity)}</td>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            {editingStatus === v.id ? <select className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-700" value={v.status} onChange={e => handleStatusChange(v.id, e.target.value)} onBlur={() => setEditingStatus(null)} autoFocus>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select> : <button onClick={() => setEditingStatus(v.id)} className="hover:opacity-80">{getStatusBadge(v.status)}</button>}
                                        </td>
                                        <td className="px-4 py-3"><TimeSince date={v.createdAt || new Date().toISOString()} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <FolderKanban className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm text-slate-600 dark:text-slate-300">{v.scanResult?.project?.name || '-'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(v.id) && <ExpandedRowDetail vuln={v} />}
                                </React.Fragment>
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
        </div>
    );
}
