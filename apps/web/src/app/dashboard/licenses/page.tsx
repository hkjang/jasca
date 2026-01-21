'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
    Lightbulb,
    X,
    BookOpen,
    Scale,
    Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    useLicenseStats,
    useLicenses,
    useSeedLicenses,
    useTrackedLicenses,
    useProjectLicenseSummary,
    LicenseClassification,
    useProject,
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

// Help Guide Modal for Licenses
function LicenseHelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'classification' | 'terms' | 'tips'>('classification');
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-blue-500" /> 라이선스 관리 가이드
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'classification', label: '분류 설명', icon: <Scale className="h-4 w-4" /> },
                        { id: 'terms', label: '용어 해설', icon: <BookOpen className="h-4 w-4" /> },
                        { id: 'tips', label: '사용 팁', icon: <Lightbulb className="h-4 w-4" /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {activeTab === 'classification' && (
                        <div className="space-y-4">
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                라이선스는 다음 7가지 분류로 구분됩니다. 위험도 순서대로 나열되어 있습니다.
                            </p>
                            <div className="space-y-3">
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
                                        <Shield className="h-4 w-4" /> 금지 (FORBIDDEN)
                                    </div>
                                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                        AGPL, SSPL 등 네트워크 환경에서 소스코드 공개 의무가 있는 라이선스입니다. 
                                        <strong className="block mt-1">상업적 프로젝트에서는 사용을 금지합니다.</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center gap-2 font-medium text-orange-700 dark:text-orange-400">
                                        <AlertTriangle className="h-4 w-4" /> 제한적 (RESTRICTED)
                                    </div>
                                    <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                                        GPL, CC-BY-NC, CC-BY-ND 등 강한 Copyleft 라이선스입니다. 수정 시 전체 소스코드 공개 의무가 있거나 상업적/파생저작물 제한이 있습니다.
                                        <strong className="block mt-1">법적 검토 후 사용해야 합니다.</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <div className="flex items-center gap-2 font-medium text-yellow-700 dark:text-yellow-400">
                                        <AlertCircle className="h-4 w-4" /> 상호적 (RECIPROCAL)
                                    </div>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                                        LGPL, MPL, EPL, CC-BY-SA 등 약한 Copyleft 라이선스입니다. 수정된 파일만 공개하면 되는 경우가 많습니다.
                                        <strong className="block mt-1">수정 시 해당 파일 공개 필요합니다.</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-400">
                                        <Info className="h-4 w-4" /> 고지 (NOTICE)
                                    </div>
                                    <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                                        MIT, Apache, BSD, ISC, CC-BY, Python, OpenSSL 등 허용적 라이선스입니다. 
                                        <strong className="block mt-1">저작권 표시와 라이선스 고지만 하면 자유롭게 사용 가능합니다.</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                                        <CheckCircle className="h-4 w-4" /> 허용 / 무제한 (PERMISSIVE / UNENCUMBERED)
                                    </div>
                                    <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                                        CC0, Unlicense, 0BSD, WTFPL 등 Public Domain 또는 그에 준하는 라이선스입니다.
                                        <strong className="block mt-1">제한 없이 자유롭게 사용 가능합니다.</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                                        <HelpCircle className="h-4 w-4" /> 미확인 (UNKNOWN)
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        시스템에서 자동으로 분류하지 못한 라이선스입니다. 
                                        <strong className="block mt-1">수동으로 확인하고 관리자에게 분류를 요청하세요.</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'terms' && (
                        <div className="space-y-4">
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                라이선스 관리에서 자주 사용되는 용어를 설명합니다.
                            </p>
                            <div className="grid gap-3">
                                {[
                                    { term: 'SPDX ID', desc: 'Software Package Data Exchange에서 정의한 표준 라이선스 식별자입니다. 예: MIT, Apache-2.0, GPL-3.0-only' },
                                    { term: 'Copyleft', desc: '소스코드 공개 의무가 있는 라이선스입니다. 파생 저작물도 같은 라이선스로 배포해야 합니다.' },
                                    { term: 'OSI Approved', desc: 'Open Source Initiative에서 오픈소스 정의에 부합한다고 승인한 라이선스입니다.' },
                                    { term: 'FSF Libre', desc: 'Free Software Foundation에서 자유 소프트웨어 라이선스로 인정한 라이선스입니다.' },
                                    { term: 'Permissive', desc: '제한이 거의 없는 허용적 라이선스입니다. 저작권 고지만 하면 상업적 사용이 가능합니다.' },
                                    { term: 'Attribution', desc: '원저작자의 저작권을 표시해야 하는 의무입니다. 대부분의 오픈소스 라이선스에 있습니다.' },
                                    { term: 'ShareAlike (SA)', desc: '파생 저작물을 같은 라이선스로 배포해야 하는 조건입니다.' },
                                    { term: 'NonCommercial (NC)', desc: '상업적 목적으로 사용할 수 없는 조건입니다.' },
                                    { term: 'NoDerivatives (ND)', desc: '원본을 변경할 수 없고 그대로만 사용해야 하는 조건입니다.' },
                                ].map(item => (
                                    <div key={item.term} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <div className="font-medium text-slate-900 dark:text-white">{item.term}</div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'tips' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4" /> 빠른 분류 필터
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    "분류별 현황" 카드에서 원하는 분류를 클릭하면 해당 분류의 라이선스만 필터링됩니다.
                                </p>
                            </div>
                            <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                    <Database className="h-4 w-4" /> 기본 라이선스 등록
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    "기본 라이선스 등록" 버튼을 클릭하면 MIT, Apache, GPL 등 일반적인 라이선스가 사전 분류되어 등록됩니다. 
                                    새 라이선스가 추가되면 이 버튼을 다시 클릭하세요.
                                </p>
                            </div>
                            <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                    <FolderKanban className="h-4 w-4" /> 프로젝트별 보기
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    "프로젝트별" 탭에서 각 프로젝트의 라이선스 현황을 한눈에 확인할 수 있습니다. 
                                    위험 라이선스가 있는 프로젝트가 상단에 표시됩니다.
                                </p>
                            </div>
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                    <Search className="h-4 w-4" /> 패키지 검색
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    "패키지 추적" 탭에서 패키지명이나 라이선스명으로 검색할 수 있습니다. 
                                    특정 라이선스를 사용하는 모든 패키지를 찾을 때 유용합니다.
                                </p>
                            </div>
                            <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                                <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" /> 미확인 라이선스 처리
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    미확인(UNKNOWN) 라이선스는 SPDX 표준에 없거나 시스템이 인식하지 못한 라이선스입니다. 
                                    관리자에게 분류를 요청하거나, 원본 패키지의 라이선스 파일을 확인하세요.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LicensesPage() {
    const searchParams = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');
    
    const [activeTab, setActiveTab] = useState<ViewTab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassification, setSelectedClassification] = useState<LicenseClassification | ''>('');
    const [projectIdFilter, setProjectIdFilter] = useState<string | null>(null);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const [trackedPage, setTrackedPage] = useState(0);
    const [projectPage, setProjectPage] = useState(0);
    const PAGE_SIZE = 20;

    // Set project filter from URL on mount
    useEffect(() => {
        if (projectIdFromUrl) {
            setProjectIdFilter(projectIdFromUrl);
            setActiveTab('tracked'); // Switch to tracked tab when viewing project-specific
        }
    }, [projectIdFromUrl]);

    // Fetch project name if filtering by project
    const { data: filterProject } = useProject(projectIdFilter || '');

    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useLicenseStats(projectIdFilter || undefined);
    const { data: licenses, isLoading: licensesLoading } = useLicenses({
        classification: selectedClassification || undefined,
        search: searchQuery || undefined,
    });
    const { data: trackedData, isLoading: trackedLoading } = useTrackedLicenses({
        projectId: projectIdFilter || undefined,
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
                            프로젝트 의존성 라이선스를 확인하세요
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
                        프로젝트 의존성 라이선스를 확인하세요
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelpModal(true)}
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-500"
                        title="도움말"
                    >
                        <HelpCircle className="h-4 w-4" />
                    </button>
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
                </div>
            </div>

            {/* Project Filter Banner */}
            {projectIdFilter && (
                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <div>
                            <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                                프로젝트 필터 적용됨
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">
                                {filterProject?.name || '...'} 프로젝트의 라이선스만 표시 중
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/dashboard/projects/${projectIdFilter}`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
                        >
                            <FolderKanban className="h-3 w-3" />
                            프로젝트로 이동
                        </Link>
                        <button
                            onClick={() => {
                                setProjectIdFilter(null);
                                // Update URL without page reload
                                window.history.replaceState({}, '', '/dashboard/licenses');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            필터 해제
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
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
                <Card className="p-4">
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
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {(stats?.byClassification?.FORBIDDEN || 0) +
                                    (stats?.byClassification?.RESTRICTED || 0)}
                            </p>
                            <p className="text-xs text-slate-500">주의 필요</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats?.byClassification?.UNKNOWN || 0}
                            </p>
                            <p className="text-xs text-slate-500">미확인</p>
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
                        <Card>
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-purple-500" />
                                    분류별 현황
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
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
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                                        selectedClassification === key
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                                                            {config.icon}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {config.label}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{config.description}</p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="px-2.5 py-1 text-sm font-semibold rounded-full"
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
                    <Card>
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
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {licenses.slice(0, 12).map((license) => {
                                        const config = CLASSIFICATION_CONFIG[license.classification];
                                        return (
                                            <div
                                                key={license.id}
                                                className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                            >
                                                <span
                                                    className="px-2 py-1 text-xs font-medium rounded-full"
                                                    style={{
                                                        backgroundColor: `${config.color}20`,
                                                        color: config.color,
                                                    }}
                                                >
                                                    {config.label}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                                        {license.spdxId}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">{license.name}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                                    <FileText className="h-10 w-10 text-slate-400 mb-2" />
                                    <p>등록된 라이선스 없음</p>
                                    <button
                                        onClick={handleSeedLicenses}
                                        className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                <Card>
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
                                    onChange={(e) => { setSearchQuery(e.target.value); setTrackedPage(0); }}
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                />
                            </div>
                            {selectedClassification && (
                                <button
                                    onClick={() => { setSelectedClassification(''); setTrackedPage(0); }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"
                                >
                                    <Filter className="h-3 w-3" />
                                    {CLASSIFICATION_CONFIG[selectedClassification].label}
                                    <span className="ml-1">×</span>
                                </button>
                            )}
                            <div className="flex items-center gap-1 ml-2">
                                <button
                                    onClick={() => setTrackedPage(Math.max(0, trackedPage - 1))}
                                    disabled={trackedPage === 0}
                                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50"
                                >
                                    ◀
                                </button>
                                <span className="text-xs text-slate-500 px-1">
                                    {trackedPage + 1}/{Math.ceil((trackedData?.total || 0) / PAGE_SIZE) || 1}
                                </span>
                                <button
                                    onClick={() => setTrackedPage(trackedPage + 1)}
                                    disabled={(trackedPage + 1) * PAGE_SIZE >= (trackedData?.total || 0)}
                                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50"
                                >
                                    ▶
                                </button>
                            </div>
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
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                                                패키지
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                                                라이선스
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                                                프로젝트
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                                                스캔
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                                                스캔 일시
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {trackedData.data.map((item) => {
                                            const config = CLASSIFICATION_CONFIG[item.classification];
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-slate-400" />
                                                            <div>
                                                                <p className="font-medium text-sm text-slate-900 dark:text-white">
                                                                    {item.pkgName}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    v{item.pkgVersion}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="px-2 py-0.5 text-xs font-medium rounded-full"
                                                                style={{
                                                                    backgroundColor: `${config.color}20`,
                                                                    color: config.color,
                                                                }}
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
                                                            href={`/dashboard/projects/${item.projectId}`}
                                                            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            <FolderKanban className="h-3 w-3" />
                                                            {item.projectName}
                                                        </Link>
                                                        {item.organizationName && (
                                                            <p className="text-xs text-slate-500">
                                                                {item.organizationName}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Link
                                                            href={`/dashboard/scans/${item.scanId}`}
                                                            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-purple-500" />
                            프로젝트별 라이선스 현황
                            <span className="text-sm font-normal text-slate-500">
                                ({projectSummaryData?.total || 0}개)
                            </span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setProjectPage(Math.max(0, projectPage - 1))}
                                disabled={projectPage === 0}
                                className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-50"
                            >
                                이전
                            </button>
                            <span className="text-sm text-slate-500">
                                {projectPage + 1} / {Math.ceil((projectSummaryData?.total || 0) / PAGE_SIZE) || 1}
                            </span>
                            <button
                                onClick={() => setProjectPage(projectPage + 1)}
                                disabled={(projectPage + 1) * PAGE_SIZE >= (projectSummaryData?.total || 0)}
                                className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-50"
                            >
                                다음
                            </button>
                        </div>
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
                                        href={`/dashboard/projects/${project.projectId}`}
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
                                                        <p className="text-xs text-slate-500">
                                                            {project.organizationName}
                                                        </p>
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

            {/* Help Modal */}
            <LicenseHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
        </div>
    );
}
