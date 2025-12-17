'use client';

import { useState } from 'react';
import {
    FileText,
    Download,
    Plus,
    Calendar,
    Clock,
    CheckCircle,
    AlertTriangle,
    Loader2,
    File,
    RefreshCw,
} from 'lucide-react';

// Mock reports
const mockReports = [
    {
        id: '1',
        name: '12월 취약점 현황 리포트',
        type: 'VULNERABILITY_SUMMARY',
        status: 'COMPLETED',
        format: 'PDF',
        createdAt: '2024-12-17T10:00:00Z',
        fileSize: '2.4 MB',
    },
    {
        id: '2',
        name: '주간 보안 트렌드 분석',
        type: 'TREND_ANALYSIS',
        status: 'COMPLETED',
        format: 'PDF',
        createdAt: '2024-12-16T15:30:00Z',
        fileSize: '1.8 MB',
    },
    {
        id: '3',
        name: 'PCI-DSS 컴플라이언스 감사',
        type: 'COMPLIANCE_AUDIT',
        status: 'GENERATING',
        format: 'PDF',
        createdAt: '2024-12-17T11:00:00Z',
        fileSize: '-',
    },
    {
        id: '4',
        name: 'backend-api 프로젝트 현황',
        type: 'PROJECT_STATUS',
        status: 'COMPLETED',
        format: 'CSV',
        createdAt: '2024-12-15T09:00:00Z',
        fileSize: '156 KB',
    },
];

const reportTypes = [
    { id: 'VULNERABILITY_SUMMARY', name: '취약점 요약', description: '프로젝트별 취약점 현황 요약' },
    { id: 'TREND_ANALYSIS', name: '트렌드 분석', description: '시간별 취약점 추이 분석' },
    { id: 'COMPLIANCE_AUDIT', name: '컴플라이언스 감사', description: '규제 준수 현황 리포트' },
    { id: 'PROJECT_STATUS', name: '프로젝트 현황', description: '개별 프로젝트 상세 리포트' },
];

function getStatusBadge(status: string) {
    switch (status) {
        case 'COMPLETED':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    완료
                </span>
            );
        case 'GENERATING':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    생성 중
                </span>
            );
        case 'FAILED':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    실패
                </span>
            );
        default:
            return null;
    }
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ReportsPage() {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'CSV'>('PDF');

    const handleDownload = (reportId: string, format: string) => {
        // Mock download - would trigger actual download
        alert(`Downloading report ${reportId} as ${format}`);
    };

    const handleCreate = () => {
        if (!selectedType) return;
        alert(`Creating ${selectedType} report as ${selectedFormat}`);
        setShowCreateForm(false);
        setSelectedType('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">리포트</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        보안 리포트를 생성하고 다운로드합니다
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    리포트 생성
                </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">새 리포트 생성</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                리포트 유형
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {reportTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={`p-4 rounded-lg border text-left transition-colors ${selectedType === type.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <p className="font-medium text-slate-900 dark:text-white">{type.name}</p>
                                        <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                출력 형식
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedFormat('PDF')}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${selectedFormat === 'PDF'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    PDF
                                </button>
                                <button
                                    onClick={() => setSelectedFormat('CSV')}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${selectedFormat === 'CSV'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!selectedType}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                생성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                리포트
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                유형
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                상태
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                생성일
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                크기
                            </th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {mockReports.map((report) => (
                            <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.format === 'PDF' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                                            <File className={`h-5 w-5 ${report.format === 'PDF' ? 'text-red-600' : 'text-green-600'}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{report.name}</p>
                                            <p className="text-sm text-slate-500">{report.format}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {reportTypes.find(t => t.id === report.type)?.name || report.type}
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(report.status)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(report.createdAt)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {report.fileSize}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {report.status === 'COMPLETED' && (
                                        <button
                                            onClick={() => handleDownload(report.id, report.format)}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            <Download className="h-4 w-4" />
                                            다운로드
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
