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
    X,
} from 'lucide-react';
import { useWorkflowSettings, useUpdateSettings, type WorkflowSettings } from '@/lib/api-hooks';

interface WorkflowState {
    id: string;
    name: string;
    color: string;
    description: string;
}

interface WorkflowTransition {
    from: string;
    to: string;
    requiredRole: string;
}

const defaultStates: WorkflowState[] = [
    { id: 'OPEN', name: '미해결', color: 'bg-red-500', description: '새로 발견된 취약점' },
    { id: 'IN_PROGRESS', name: '진행 중', color: 'bg-yellow-500', description: '조치 진행 중' },
    { id: 'RESOLVED', name: '해결됨', color: 'bg-green-500', description: '수정 완료' },
    { id: 'FALSE_POSITIVE', name: '오탐', color: 'bg-slate-500', description: '취약점이 아님' },
    { id: 'ACCEPTED', name: '예외 승인', color: 'bg-purple-500', description: '위험 수용' },
];

const defaultTransitions: WorkflowTransition[] = [
    { from: 'OPEN', to: 'IN_PROGRESS', requiredRole: 'DEVELOPER' },
    { from: 'OPEN', to: 'FALSE_POSITIVE', requiredRole: 'SECURITY_ENGINEER' },
    { from: 'OPEN', to: 'ACCEPTED', requiredRole: 'ORG_ADMIN' },
    { from: 'IN_PROGRESS', to: 'RESOLVED', requiredRole: 'DEVELOPER' },
    { from: 'IN_PROGRESS', to: 'OPEN', requiredRole: 'DEVELOPER' },
    { from: 'RESOLVED', to: 'OPEN', requiredRole: 'SECURITY_ENGINEER' },
];

const colorOptions = [
    { value: 'bg-red-500', label: '빨강' },
    { value: 'bg-orange-500', label: '주황' },
    { value: 'bg-yellow-500', label: '노랑' },
    { value: 'bg-green-500', label: '초록' },
    { value: 'bg-blue-500', label: '파랑' },
    { value: 'bg-purple-500', label: '보라' },
    { value: 'bg-slate-500', label: '회색' },
];

const roleOptions = [
    { value: 'DEVELOPER', label: '개발자' },
    { value: 'SECURITY_ENGINEER', label: '보안 엔지니어' },
    { value: 'PROJECT_ADMIN', label: '프로젝트 관리자' },
    { value: 'ORG_ADMIN', label: '조직 관리자' },
];

export default function WorkflowsPage() {
    const { data: settings, isLoading, error } = useWorkflowSettings();
    const updateMutation = useUpdateSettings();

    const [states, setStates] = useState<WorkflowState[]>(defaultStates);
    const [transitions, setTransitions] = useState<WorkflowTransition[]>(defaultTransitions);
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Modal states
    const [showStateModal, setShowStateModal] = useState(false);
    const [showTransitionModal, setShowTransitionModal] = useState(false);
    const [editingState, setEditingState] = useState<WorkflowState | null>(null);
    const [editingTransitionIndex, setEditingTransitionIndex] = useState<number | null>(null);

    // Form states
    const [stateForm, setStateForm] = useState<WorkflowState>({ id: '', name: '', color: 'bg-blue-500', description: '' });
    const [transitionForm, setTransitionForm] = useState<WorkflowTransition>({ from: '', to: '', requiredRole: 'DEVELOPER' });

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
            setHasChanges(false);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save workflow settings:', err);
        }
    };

    // State CRUD
    const openAddState = () => {
        setEditingState(null);
        setStateForm({ id: '', name: '', color: 'bg-blue-500', description: '' });
        setShowStateModal(true);
    };

    const openEditState = (state: WorkflowState) => {
        setEditingState(state);
        setStateForm({ ...state });
        setShowStateModal(true);
    };

    const handleSaveState = () => {
        if (!stateForm.id || !stateForm.name) return;

        if (editingState) {
            // Update existing
            setStates(prev => prev.map(s => s.id === editingState.id ? stateForm : s));
        } else {
            // Add new
            if (states.some(s => s.id === stateForm.id)) {
                alert('이미 존재하는 상태 ID입니다.');
                return;
            }
            setStates(prev => [...prev, stateForm]);
        }
        setShowStateModal(false);
        setHasChanges(true);
    };

    const handleDeleteState = (stateId: string) => {
        if (!confirm('이 상태를 삭제하시겠습니까? 관련된 전이 규칙도 함께 삭제됩니다.')) return;
        setStates(prev => prev.filter(s => s.id !== stateId));
        setTransitions(prev => prev.filter(t => t.from !== stateId && t.to !== stateId));
        setHasChanges(true);
    };

    // Transition CRUD
    const openAddTransition = () => {
        setEditingTransitionIndex(null);
        setTransitionForm({ from: states[0]?.id || '', to: states[1]?.id || '', requiredRole: 'DEVELOPER' });
        setShowTransitionModal(true);
    };

    const openEditTransition = (index: number) => {
        setEditingTransitionIndex(index);
        setTransitionForm({ ...transitions[index] });
        setShowTransitionModal(true);
    };

    const handleSaveTransition = () => {
        if (!transitionForm.from || !transitionForm.to || transitionForm.from === transitionForm.to) {
            alert('유효한 전이 규칙을 입력하세요.');
            return;
        }

        if (editingTransitionIndex !== null) {
            // Update existing
            setTransitions(prev => prev.map((t, i) => i === editingTransitionIndex ? transitionForm : t));
        } else {
            // Check for duplicate
            if (transitions.some(t => t.from === transitionForm.from && t.to === transitionForm.to)) {
                alert('이미 존재하는 전이 규칙입니다.');
                return;
            }
            setTransitions(prev => [...prev, transitionForm]);
        }
        setShowTransitionModal(false);
        setHasChanges(true);
    };

    const handleDeleteTransition = (index: number) => {
        if (!confirm('이 전이 규칙을 삭제하시겠습니까?')) return;
        setTransitions(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
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
                    {hasChanges && (
                        <span className="text-sm text-orange-600">변경사항 있음</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">상태 정의</h3>
                    <button
                        onClick={openAddState}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <Plus className="h-4 w-4" />
                        상태 추가
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {states.map((state) => (
                        <div
                            key={state.id}
                            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg group"
                        >
                            <div className={`w-4 h-4 rounded-full ${state.color}`} />
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{state.name}</p>
                                <p className="text-xs text-slate-500">{state.description}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditState(state)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteState(state.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transitions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">상태 전이 규칙</h3>
                    <button
                        onClick={openAddTransition}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
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
                                    {roleOptions.find(r => r.value === transition.requiredRole)?.label || transition.requiredRole}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => openEditTransition(idx)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteTransition(idx)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {transitions.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            전이 규칙이 없습니다. 규칙을 추가하세요.
                        </div>
                    )}
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

            {/* State Modal */}
            {showStateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingState ? '상태 수정' : '상태 추가'}
                            </h3>
                            <button onClick={() => setShowStateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    상태 ID
                                </label>
                                <input
                                    type="text"
                                    value={stateForm.id}
                                    onChange={(e) => setStateForm({ ...stateForm, id: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                                    disabled={!!editingState}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50"
                                    placeholder="OPEN, IN_PROGRESS, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    이름
                                </label>
                                <input
                                    type="text"
                                    value={stateForm.name}
                                    onChange={(e) => setStateForm({ ...stateForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    placeholder="미해결"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    색상
                                </label>
                                <select
                                    value={stateForm.color}
                                    onChange={(e) => setStateForm({ ...stateForm, color: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                    {colorOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    설명
                                </label>
                                <input
                                    type="text"
                                    value={stateForm.description}
                                    onChange={(e) => setStateForm({ ...stateForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    placeholder="상태에 대한 설명"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => setShowStateModal(false)}
                                    className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveState}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transition Modal */}
            {showTransitionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingTransitionIndex !== null ? '전이 규칙 수정' : '전이 규칙 추가'}
                            </h3>
                            <button onClick={() => setShowTransitionModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    시작 상태
                                </label>
                                <select
                                    value={transitionForm.from}
                                    onChange={(e) => setTransitionForm({ ...transitionForm, from: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                    {states.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    종료 상태
                                </label>
                                <select
                                    value={transitionForm.to}
                                    onChange={(e) => setTransitionForm({ ...transitionForm, to: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                    {states.filter(s => s.id !== transitionForm.from).map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    필요 권한
                                </label>
                                <select
                                    value={transitionForm.requiredRole}
                                    onChange={(e) => setTransitionForm({ ...transitionForm, requiredRole: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                    {roleOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => setShowTransitionModal(false)}
                                    className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveTransition}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
