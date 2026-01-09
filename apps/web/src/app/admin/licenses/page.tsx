'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import {
    Shield,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle,
    HelpCircle,
    Search,
    Filter,
    Package,
    FileText,
    RefreshCw,
    Database,
    FolderKanban,
    FileSearch,
    Calendar,
    ExternalLink,
    Settings,
    Plus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    useLicenseStats,
    useLicenses,
    useSeedLicenses,
    useTrackedLicenses,
    useProjectLicenseSummary,
    LicenseClassification,
} from '@/lib/api-hooks';

const CLASSIFICATION_CONFIG: Record<
    LicenseClassification,
    { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }
> = {
    FORBIDDEN: {
        label: '금지',
        color: '#dc2626',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: <Shield className="h-5 w-5 text-red-600" />,
        description: 'AGPL 등 상업적 사용 금지',
    },
    RESTRICTED: {
        label: '제한적',
        color: '#ea580c',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        description: 'GPL, LGPL 등 Copyleft',
    },
    RECIPROCAL: {
        label: '상호적',
        color: '#ca8a04',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
        description: 'MPL, EPL 등 파일단위 Copyleft',
    },
    NOTICE: {
        label: '고지',
        color: '#2563eb',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        icon: <Info className="h-5 w-5 text-blue-600" />,
        description: 'MIT, Apache, BSD 등',
    },
    PERMISSIVE: {
        label: '허용',
        color: '#16a34a',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        description: '제한이 거의 없음',
    },
    UNENCUMBERED: {
        label: '무제한',
        color: '#059669',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
        description: 'CC0, Unlicense 등 Public Domain',
    },
    UNKNOWN: {
        label: '미확인',
        color: '#64748b',
        bgColor: 'bg-slate-100 dark:bg-slate-700',
        icon: <HelpCircle className="h-5 w-5 text-slate-600" />,
        description: '수동 검토 필요',
    },
};

type ViewTab = 'overview' | 'tracked' | 'projects';

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export default function AdminLicensesPage() {
    const [activeTab, setActiveTab] = useState<ViewTab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassification, setSelectedClassification] = useState<LicenseClassification | ''>('');
    const [trackedPage, setTrackedPage] = useState(0);
    const [projectPage, setProjectPage] = useState(0);
    const PAGE_SIZE = 20;

    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useLicenseStats();
    const { data: licenses, isLoading: licensesLoading } = useLicenses({
        classification: selectedClassification || undefined,
        search: searchQuery || undefined,
    });
    const { data: trackedData, isLoading: trackedLoading } = useTrackedLicenses({
        classification: selectedClassification || undefined,
        search: searchQuery || undefined,
        limit: PAGE_SIZE,
        offset: trackedPage * PAGE_SIZE,
    });
    const { data: projectSummaryData, isLoading: projectLoading } = useProjectLicenseSummary({
        limit: PAGE_SIZE,
        offset: projectPage * PAGE_SIZE,
    });
    const seedLicenses = useSeedLicenses();

    // Prepare chart data
    const pieData = stats
        ? (Object.entries(stats.byClassification) as [LicenseClassification, number][])
              .filter(([, count]) => count > 0)
              .map(([classification, count]) => ({
                  name: CLASSIFICATION_CONFIG[classification].label,
                  value: count,
                  color: CLASSIFICATION_CONFIG[classification].color,
                  classification,
              }))
        : [];

    const handleSeedLicenses = async () => {
        try {
            await seedLicenses.mutateAsync();
        } catch (error) {
            console.error('Failed to seed licenses:', error);
        }
    };

    if (statsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">라이선스 관리</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            조직 전체 라이선스 정책 및 현황 관리
                        </p>
                    </div>
                </div>
                <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                        ))}
                    </div>
                    <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">라이선스 관리</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        조직 전체 라이선스 정책 및 현황 관리
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetchStats()}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        새로고침
                    </button>
                    <button
                        onClick={handleSeedLicenses}
                        disabled={seedLicenses.isPending}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Database className="h-4 w-4" />
                        {seedLicenses.isPending ? '처리 중...' : '기본 라이선스 등록'}
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <Plus className="h-4 w-4" />
                        정책 추가
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats?.total || 0}
                            </p>
                            <p className="text-xs text-slate-500">전체 패키지 라이선스</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats?.uniqueLicenses || 0}
                            </p>
                            <p className="text-xs text-slate-500">고유 라이선스</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-white dark:bg-slate-800 border-l-4 border-red-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {(stats?.byClassification?.FORBIDDEN || 0) +
                                    (stats?.byClassification?.RESTRICTED || 0)}
                            </p>
                            <p className="text-xs text-slate-500">주의 필요</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-white dark:bg-slate-800 border-l-4 border-yellow-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {stats?.byClassification?.UNKNOWN || 0}
                            </p>
                            <p className="text-xs text-slate-500">미확인 라이선스</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'overview'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <FileText className="h-4 w-4" />
                    라이선스 개요
                </button>
                <button
                    onClick={() => setActiveTab('tracked')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'tracked'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <FileSearch className="h-4 w-4" />
                    패키지 추적
                </button>
                <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'projects'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <FolderKanban className="h-4 w-4" />
                    프로젝트별
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <Card className="bg-white dark:bg-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    분류별 분포
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <Package className="h-12 w-12 text-slate-400 mb-3" />
                                            <p>라이선스 데이터 없음</p>
                                            <p className="text-sm mt-1">스캔을 실행하여 라이선스를 분석하세요</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Classification Summary */}
                        <Card className="bg-white dark:bg-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-purple-500" />
                                    분류별 현황
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {(Object.entries(CLASSIFICATION_CONFIG) as [LicenseClassification, typeof CLASSIFICATION_CONFIG[LicenseClassification]][]).map(
                                        ([key, config]) => {
                                            const count = stats?.byClassification?.[key] || 0;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        setSelectedClassification(key === selectedClassification ? '' : key);
                                                        setActiveTab('tracked');
                                                    }}
                                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                                        selectedClassification === key
                                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1 rounded ${config.bgColor}`}>
                                                            {config.icon}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-medium text-sm text-slate-900 dark:text-white">
                                                                {config.label}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{config.description}</p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="px-2 py-0.5 text-sm font-semibold rounded-full"
                                                        style={{
                                                            backgroundColor: `${config.color}20`,
                                                            color: config.color,
                                                        }}
                                                    >
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* License Catalog */}
                    <Card className="bg-white dark:bg-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-500" />
                                등록된 라이선스 카탈로그
                            </CardTitle>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {licensesLoading ? (
                                <div className="animate-pulse space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
                                    ))}
                                </div>
                            ) : licenses && licenses.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">SPDX ID</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">이름</th>
                                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">분류</th>
                                                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">OSI</th>
                                                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">FSF</th>
                                                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {licenses.slice(0, 15).map((license) => {
                                                const config = CLASSIFICATION_CONFIG[license.classification];
                                                return (
                                                    <tr key={license.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-3 px-4">
                                                            <code className="text-sm font-mono text-red-600 dark:text-red-400">{license.spdxId}</code>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{license.name}</td>
                                                        <td className="py-3 px-4">
                                                            <span
                                                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full"
                                                                style={{ backgroundColor: `${config.color}20`, color: config.color }}
                                                            >
                                                                {config.label}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {license.osiApproved ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-slate-400">-</span>}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {license.fsfLibre ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-slate-400">-</span>}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                                <Settings className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                                    <FileText className="h-10 w-10 text-slate-400 mb-2" />
                                    <p>등록된 라이선스 없음</p>
                                    <button
                                        onClick={handleSeedLicenses}
                                        className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        기본 라이선스 등록
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {activeTab === 'tracked' && (
                <Card className="bg-white dark:bg-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileSearch className="h-5 w-5 text-blue-500" />
                            패키지 라이선스 추적
                            <span className="text-sm font-normal text-slate-500">
                                ({trackedData?.total || 0}개)
                            </span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="패키지/라이선스 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
                                />
                            </div>
                            {selectedClassification && (
                                <button
                                    onClick={() => setSelectedClassification('')}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                                >
                                    <Filter className="h-3 w-3" />
                                    {CLASSIFICATION_CONFIG[selectedClassification].label}
                                    <span className="ml-1">×</span>
                                </button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {trackedLoading ? (
                            <div className="animate-pulse space-y-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded" />
                                ))}
                            </div>
                        ) : trackedData && trackedData.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">패키지</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">라이선스</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">프로젝트</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">스캔</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">스캔 일시</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {trackedData.data.map((item) => {
                                            const config = CLASSIFICATION_CONFIG[item.classification];
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-slate-400" />
                                                            <div>
                                                                <p className="font-medium text-sm text-slate-900 dark:text-white">{item.pkgName}</p>
                                                                <p className="text-xs text-slate-500">v{item.pkgVersion}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="px-2 py-0.5 text-xs font-medium rounded-full"
                                                                style={{ backgroundColor: `${config.color}20`, color: config.color }}
                                                            >
                                                                {config.label}
                                                            </span>
                                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                                {item.spdxId || item.licenseName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Link
                                                            href={`/admin/projects/${item.projectId}`}
                                                            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                                                        >
                                                            <FolderKanban className="h-3 w-3" />
                                                            {item.projectName}
                                                        </Link>
                                                        {item.organizationName && (
                                                            <p className="text-xs text-slate-500">{item.organizationName}</p>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Link
                                                            href={`/admin/scans/${item.scanId}`}
                                                            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                                                        >
                                                            <FileSearch className="h-3 w-3" />
                                                            {item.imageRef || item.artifactName || '스캔 보기'}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1 text-sm text-slate-500">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(item.scanCreatedAt)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <FileSearch className="h-12 w-12 text-slate-400 mb-3" />
                                <p>추적된 라이선스가 없습니다</p>
                                <p className="text-sm mt-1">스캔을 실행하여 패키지 라이선스를 분석하세요</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'projects' && (
                <Card className="bg-white dark:bg-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-purple-500" />
                            프로젝트별 라이선스 현황
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {projectLoading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                                ))}
                            </div>
                        ) : projectSummaryData?.data && projectSummaryData.data.length > 0 ? (
                            <div className="space-y-3">
                                {projectSummaryData.data.map((project) => (
                                    <Link
                                        key={project.projectId}
                                        href={`/admin/projects/${project.projectId}`}
                                        className="block p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                    <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {project.projectName}
                                                    </p>
                                                    {project.organizationName && (
                                                        <p className="text-xs text-slate-500">{project.organizationName}</p>
                                                    )}
                                                    {project.lastScanAt && (
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                            <Calendar className="h-3 w-3" />
                                                            마지막 스캔: {formatDate(project.lastScanAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {project.licenseStats.total}개 라이선스
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs mt-1">
                                                        {project.licenseStats.forbidden > 0 && (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                                                                금지 {project.licenseStats.forbidden}
                                                            </span>
                                                        )}
                                                        {project.licenseStats.restricted > 0 && (
                                                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                                                제한 {project.licenseStats.restricted}
                                                            </span>
                                                        )}
                                                        {project.licenseStats.unknown > 0 && (
                                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded">
                                                                미확인 {project.licenseStats.unknown}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <FolderKanban className="h-12 w-12 text-slate-400 mb-3" />
                                <p>프로젝트 라이선스 정보가 없습니다</p>
                                <p className="text-sm mt-1">프로젝트에서 스캔을 실행하세요</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
