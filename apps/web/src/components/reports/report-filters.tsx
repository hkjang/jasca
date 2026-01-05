'use client';

import { Search, Filter, X } from 'lucide-react';
import { ReportFilters as FiltersType } from '@/lib/api-hooks';

interface ReportFiltersProps {
    filters: FiltersType;
    onFilterChange: (filters: FiltersType) => void;
}

const reportTypes = [
    { id: '', name: '전체' },
    { id: 'vulnerability_summary', name: '취약점 요약' },
    { id: 'trend_analysis', name: '트렌드 분석' },
    { id: 'compliance_audit', name: '컴플라이언스 감사' },
    { id: 'project_status', name: '프로젝트 현황' },
];

const statuses = [
    { id: '', name: '전체' },
    { id: 'completed', name: '완료' },
    { id: 'generating', name: '생성 중' },
    { id: 'pending', name: '대기 중' },
    { id: 'failed', name: '실패' },
];

const formats = [
    { id: '', name: '전체' },
    { id: 'pdf', name: 'PDF' },
    { id: 'csv', name: 'CSV' },
    { id: 'xlsx', name: 'XLSX' },
];

export function ReportFilters({ filters, onFilterChange }: ReportFiltersProps) {
    const hasActiveFilters = Boolean(
        filters.search || filters.type || filters.status || filters.format || filters.dateFrom || filters.dateTo
    );

    const handleReset = () => {
        onFilterChange({
            page: 1,
            limit: filters.limit,
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">필터</h3>
                {hasActiveFilters && (
                    <button
                        onClick={handleReset}
                        className="ml-auto flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-red-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                        초기화
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        검색
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={filters.search || ''}
                            onChange={(e) => onFilterChange({ ...filters, search: e.target.value, page: 1 })}
                            placeholder="리포트 이름 검색..."
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        유형
                    </label>
                    <select
                        value={filters.type || ''}
                        onChange={(e) => onFilterChange({ ...filters, type: e.target.value || undefined, page: 1 })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        {reportTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        상태
                    </label>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => onFilterChange({ ...filters, status: e.target.value || undefined, page: 1 })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        {statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Format */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        형식
                    </label>
                    <select
                        value={filters.format || ''}
                        onChange={(e) => onFilterChange({ ...filters, format: e.target.value || undefined, page: 1 })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        {formats.map((format) => (
                            <option key={format.id} value={format.id}>
                                {format.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        시작일
                    </label>
                    <input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value || undefined, page: 1 })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        종료일
                    </label>
                    <input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value || undefined, page: 1 })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>
    );
}
