'use client';

import { useState, useEffect } from 'react';
import {
    GitBranch,
    Plus,
    ArrowRight,
    Edit,
    Trash2,
    Save,
    CheckCircle,
    Circle,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { useWorkflowSettings, useUpdateSettings, type WorkflowSettings } from '@/lib/api-hooks';

const defaultStates = [
    { id: 'OPEN', name: '미해결', color: 'bg-red-500', description: '새로 발견된 취약점' },
    { id: 'IN_PROGRESS', name: '진행 중', color: 'bg-yellow-500', description: '조치 진행 중' },
    { id: 'RESOLVED', name: '해결됨', color: 'bg-green-500', description: '수정 완료' },
    { id: 'FALSE_POSITIVE', name: '오탐', color: 'bg-slate-500', description: '취약점이 아님' },
    { id: 'ACCEPTED', name: '예외 승인', color: 'bg-purple-500', description: '위험 수용' },
];

const defaultTransitions = [
    { from: 'OPEN', to: 'IN_PROGRESS', requiredRole: 'DEVELOPER' },
    { from: 'OPEN', to: 'FALSE_POSITIVE', requiredRole: 'SECURITY_ENGINEER' },
    { from: 'OPEN', to: 'ACCEPTED', requiredRole: 'ORG_ADMIN' },
    { from: 'IN_PROGRESS', to: 'RESOLVED', requiredRole: 'DEVELOPER' },
    { from: 'IN_PROGRESS', to: 'OPEN', requiredRole: 'DEVELOPER' },
    { from: 'RESOLVED', to: 'OPEN', requiredRole: 'SECURITY_ENGINEER' },
];

export default function WorkflowsPage() {
    const { data: settings, isLoading, error } = useWorkflowSettings();
    const updateMutation = useUpdateSettings();

    const [states, setStates] = useState(defaultStates);
    const [transitions, setTransitions] = useState(defaultTransitions);
    const [saved, setSaved] = useState(false);

    // Load settings from API
    useEffect(() => {
        if (settings) {
            if (settings.states?.length) setStates(settings.states);
            if (settings.transitions?.length) setTransitions(settings.transitions);
        }
    }, [settings]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({
                key: 'workflows',
                value: { states, transitions },
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save workflow settings:', err);
        }
    };

    const getStateName = (id: string) => {
        return states.find(s => s.id === id)?.name || id;
    };

    const getStateColor = (id: string) => {
        return states.find(s => s.id === id)?.color || 'bg-slate-500';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                워크플로우 설정을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">워크플로우 관리</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        취약점 상태 전이 규칙을 설정합니다
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {saved && (
                        <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            저장됨
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        저장
                    </button>
                </div>
            </div>

            {/* States */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">상태 정의</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {states.map((state) => (
                        <div
                            key={state.id}
                            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        >
                            <div className={`w-4 h-4 rounded-full ${state.color}`} />
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{state.name}</p>
                                <p className="text-xs text-slate-500">{state.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transitions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">상태 전이 규칙</h3>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Plus className="h-4 w-4" />
                        규칙 추가
                    </button>
                </div>

                <div className="space-y-3">
                    {transitions.map((transition, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${getStateColor(transition.from)}`} />
                                <span className="font-medium text-slate-900 dark:text-white">
                                    {getStateName(transition.from)}
                                </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${getStateColor(transition.to)}`} />
                                <span className="font-medium text-slate-900 dark:text-white">
                                    {getStateName(transition.to)}
                                </span>
                            </div>
                            <div className="flex-1 text-right">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                                    {transition.requiredRole}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Diagram */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">워크플로우 다이어그램</h3>
                <div className="flex items-center justify-center gap-4 flex-wrap py-8">
                    {states.slice(0, 3).map((state, idx) => (
                        <div key={state.id} className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-16 h-16 ${state.color} rounded-full flex items-center justify-center`}>
                                    <Circle className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{state.name}</span>
                            </div>
                            {idx < 2 && <ArrowRight className="h-6 w-6 text-slate-300" />}
                        </div>
                    ))}
                </div>
                <p className="text-center text-sm text-slate-500 mt-4">
                    기본 워크플로우: 미해결 → 진행 중 → 해결됨
                </p>
            </div>
        </div>
    );
}

