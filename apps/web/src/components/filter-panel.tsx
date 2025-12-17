'use client';

import { useState } from 'react';
import {
    Filter,
    X,
    ChevronDown,
    Calendar,
} from 'lucide-react';

export interface FilterState {
    severities: string[];
    statuses: string[];
    dateRange: { start: string; end: string };
    projects: string[];
}

interface FilterPanelProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    projects?: { id: string; name: string }[];
}

const defaultFilters: FilterState = {
    severities: [],
    statuses: [],
    dateRange: { start: '', end: '' },
    projects: [],
};

const severityOptions = [
    { id: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
    { id: 'HIGH', label: 'High', color: 'bg-orange-500' },
    { id: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500' },
    { id: 'LOW', label: 'Low', color: 'bg-blue-500' },
];

const statusOptions = [
    { id: 'OPEN', label: '미해결' },
    { id: 'IN_PROGRESS', label: '진행 중' },
    { id: 'RESOLVED', label: '해결됨' },
    { id: 'FALSE_POSITIVE', label: '오탐' },
    { id: 'ACCEPTED', label: '예외 승인' },
];

export default function FilterPanel({ filters, onChange, projects = [] }: FilterPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleSeverity = (severity: string) => {
        const newSeverities = filters.severities.includes(severity)
            ? filters.severities.filter(s => s !== severity)
            : [...filters.severities, severity];
        onChange({ ...filters, severities: newSeverities });
    };

    const toggleStatus = (status: string) => {
        const newStatuses = filters.statuses.includes(status)
            ? filters.statuses.filter(s => s !== status)
            : [...filters.statuses, status];
        onChange({ ...filters, statuses: newStatuses });
    };

    const toggleProject = (projectId: string) => {
        const newProjects = filters.projects.includes(projectId)
            ? filters.projects.filter(p => p !== projectId)
            : [...filters.projects, projectId];
        onChange({ ...filters, projects: newProjects });
    };

    const clearFilters = () => {
        onChange(defaultFilters);
    };

    const activeFilterCount =
        filters.severities.length +
        filters.statuses.length +
        filters.projects.length +
        (filters.dateRange.start || filters.dateRange.end ? 1 : 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3"
            >
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-slate-500" />
                    <span className="font-medium text-slate-900 dark:text-white">필터</span>
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                    {/* Severity */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            심각도
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {severityOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => toggleSeverity(option.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${filters.severities.includes(option.id)
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${option.color}`} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            상태
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => toggleStatus(option.id)}
                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${filters.statuses.includes(option.id)
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            기간
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => onChange({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => onChange({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Projects */}
                    {projects.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                프로젝트
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => toggleProject(project.id)}
                                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${filters.projects.includes(project.id)
                                                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        {project.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clear */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                            <X className="h-4 w-4" />
                            필터 초기화
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export { defaultFilters };
