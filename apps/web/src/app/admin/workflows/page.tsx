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
    HelpCircle,
    BookOpen,
    Workflow,
    ShieldCheck,
    Users,
    ArrowRightLeft,
    Info,
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
    const [activeTab, setActiveTab] = useState<'settings' | 'help'>('settings');

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
                    {activeTab === 'settings' && (
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
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'settings'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Workflow className="h-4 w-4" />
                    설정
                </button>
                <button
                    onClick={() => setActiveTab('help')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'help'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <HelpCircle className="h-4 w-4" />
                    사용법 안내
                </button>
            </div>

            {/* Help Content */}
            {activeTab === 'help' && (
                <div className="space-y-6">
                    {/* Overview */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                <Workflow className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                    워크플로우란?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    워크플로우는 취약점의 생명주기를 관리하는 상태 전이 규칙입니다. 
                                    취약점이 발견되면 어떤 상태를 거쳐 해결되는지, 누가 어떤 상태로 변경할 수 있는지를 정의합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                동작 방식
                            </h3>
                        </div>
                        
                        <div className="space-y-6">
                            {/* States Section */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">1</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">상태 정의</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                        취약점이 가질 수 있는 상태를 정의합니다. 각 상태는 고유 ID, 표시 이름, 색상, 설명을 가집니다.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">미해결</span>
                                        <ArrowRight className="h-4 w-4 text-slate-400 self-center" />
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs">진행 중</span>
                                        <ArrowRight className="h-4 w-4 text-slate-400 self-center" />
                                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">해결됨</span>
                                    </div>
                                </div>
                            </div>

                            {/* Transitions Section */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">2</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">전이 규칙</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                        어떤 상태에서 어떤 상태로 변경할 수 있는지, 그리고 누가 그 전이를 수행할 수 있는지를 정의합니다.
                                    </p>
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="px-2 py-0.5 bg-red-500 text-white rounded text-xs">미해결</span>
                                            <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                                            <span className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs">진행 중</span>
                                            <span className="text-slate-400">→</span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded text-xs">개발자 이상</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Validation Section */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">3</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">자동 검증</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        취약점 상태 변경 시 시스템이 자동으로 전이 규칙을 검증합니다. 
                                        허용되지 않은 전이나 권한이 없는 경우 상태 변경이 거부됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role Hierarchy */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-5 w-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                역할 계층 구조
                            </h3>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            역할은 계층 구조를 가집니다. 상위 역할은 하위 역할의 모든 권한을 포함합니다.
                        </p>
                        
                        <div className="flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <ShieldCheck className="h-8 w-8 text-white" />
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">조직 관리자</span>
                                <span className="text-[10px] text-slate-500">최상위 권한</span>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-300 mx-2" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                    <Users className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">프로젝트 관리자</span>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-300 mx-2" />
                            <div className="flex flex-col items-center">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow">
                                    <ShieldCheck className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">보안 엔지니어</span>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-300 mx-2" />
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">개발자</span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    예: "보안 엔지니어" 권한이 필요한 전이는 보안 엔지니어, 프로젝트 관리자, 조직 관리자 모두 수행할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Best Practices */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                권장 사항
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div>
                                    <h5 className="text-sm font-medium text-slate-900 dark:text-white">오탐 처리는 보안팀이</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        FALSE_POSITIVE 전이는 보안 엔지니어 이상으로 설정하세요.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div>
                                    <h5 className="text-sm font-medium text-slate-900 dark:text-white">예외 승인은 관리자가</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        위험 수용 결정은 조직 관리자 권한으로 제한하세요.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div>
                                    <h5 className="text-sm font-medium text-slate-900 dark:text-white">재오픈 허용</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        해결된 취약점도 필요시 재오픈할 수 있도록 전이를 설정하세요.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div>
                                    <h5 className="text-sm font-medium text-slate-900 dark:text-white">히스토리 추적</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        모든 상태 변경은 자동으로 기록되어 감사 추적이 가능합니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Start */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                        <h3 className="text-lg font-semibold mb-4">빠른 시작 가이드</h3>
                        <ol className="space-y-3">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">1</span>
                                <span className="text-slate-200">"설정" 탭에서 필요한 <strong className="text-white">상태</strong>를 정의합니다.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">2</span>
                                <span className="text-slate-200">상태 간의 <strong className="text-white">전이 규칙</strong>과 필요한 권한을 설정합니다.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">3</span>
                                <span className="text-slate-200"><strong className="text-white">저장</strong> 버튼을 클릭하면 즉시 적용됩니다.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">4</span>
                                <span className="text-slate-200">취약점 상세 페이지에서 설정된 규칙에 따라 <strong className="text-white">허용된 전이만</strong> 표시됩니다.</span>
                            </li>
                        </ol>
                    </div>
                </div>
            )}

            {/* Settings Content */}
            {activeTab === 'settings' && (
            <>
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
            </>
            )}

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
