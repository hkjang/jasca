'use client';

import { useState, useMemo } from 'react';
import {
    Shield,
    Plus,
    Search,
    Edit,
    Trash2,
    Power,
    PowerOff,
    X,
    AlertTriangle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Copy,
    FileText,
    Layers,
    Filter,
    BarChart3,
    CheckCircle,
    XCircle,
    AlertCircle,
    Zap,
    Globe,
    Building2,
    FolderKanban,
    Clock,
    Target,
    List,
    GripVertical,
    HelpCircle,
    ArrowRight,
    Scan,
    GitBranch,
    Info,
    Bell,
    BellOff,
} from 'lucide-react';
import {
    usePolicies,
    useCreatePolicy,
    useUpdatePolicy,
    useDeletePolicy,
    Policy,
} from '@/lib/api-hooks';

// Policy templates
const POLICY_TEMPLATES = [
    {
        id: 'critical-block',
        name: 'Critical 취약점 차단',
        description: 'Critical 심각도 취약점 발견 시 배포 차단',
        rules: [
            { ruleType: 'SEVERITY', operator: 'EQUALS', value: 'CRITICAL', action: 'BLOCK' },
        ],
    },
    {
        id: 'high-warn',
        name: 'High 취약점 경고',
        description: 'High 심각도 취약점 발견 시 경고',
        rules: [
            { ruleType: 'SEVERITY', operator: 'EQUALS', value: 'HIGH', action: 'WARN' },
        ],
    },
    {
        id: 'cve-block',
        name: 'CVE 블랙리스트',
        description: '특정 CVE 발견 시 차단',
        rules: [
            { ruleType: 'CVE_ID', operator: 'CONTAINS', value: 'CVE-2024-', action: 'BLOCK' },
        ],
    },
    {
        id: 'license-block',
        name: '라이선스 정책',
        description: 'GPL 라이선스 사용 차단',
        rules: [
            { ruleType: 'LICENSE', operator: 'CONTAINS', value: 'GPL', action: 'BLOCK' },
        ],
    },
    {
        id: 'age-warn',
        name: '오래된 취약점 경고',
        description: '30일 이상 해결되지 않은 취약점 경고',
        rules: [
            { ruleType: 'AGE_DAYS', operator: 'GREATER_THAN', value: '30', action: 'WARN' },
        ],
    },
];

const RULE_TYPES = [
    { value: 'SEVERITY', label: '심각도', description: 'CRITICAL, HIGH, MEDIUM, LOW', example: 'CRITICAL' },
    { value: 'CVE_ID', label: 'CVE ID', description: 'CVE 식별자', example: 'CVE-2024-1234' },
    { value: 'PACKAGE', label: '패키지명', description: '취약한 패키지 이름', example: 'log4j' },
    { value: 'LICENSE', label: '라이선스', description: '라이선스 유형', example: 'GPL-3.0' },
    { value: 'CVSS_SCORE', label: 'CVSS 점수', description: '0.0 ~ 10.0', example: '9.0' },
    { value: 'AGE_DAYS', label: '경과 일수', description: '발견 후 경과 일수', example: '30' },
    { value: 'FIX_AVAILABLE', label: '수정 가능', description: '패치 가용성', example: 'true' },
];

const OPERATORS = [
    { value: 'EQUALS', label: '같음', description: '정확히 일치' },
    { value: 'NOT_EQUALS', label: '같지 않음', description: '일치하지 않음' },
    { value: 'CONTAINS', label: '포함', description: '문자열 포함' },
    { value: 'GREATER_THAN', label: '보다 큼', description: '숫자 비교' },
    { value: 'LESS_THAN', label: '보다 작음', description: '숫자 비교' },
    { value: 'REGEX', label: '정규식', description: '패턴 매칭' },
];

const ACTIONS = [
    { value: 'BLOCK', label: '차단', color: 'red', icon: XCircle, description: '빌드/배포 중단' },
    { value: 'WARN', label: '경고', color: 'yellow', icon: AlertCircle, description: '경고만 표시, 진행 허용' },
    { value: 'AUDIT', label: '감사', color: 'blue', icon: FileText, description: '로그에 기록' },
    { value: 'ALLOW', label: '허용', color: 'green', icon: CheckCircle, description: '예외적 허용' },
];

interface RuleForm {
    ruleType: string;
    operator: string;
    value: string;
    action: string;
    sendNotification: boolean;
}

export default function AdminPoliciesPage() {
    const { data: policies, isLoading, error } = usePolicies();
    const createMutation = useCreatePolicy();
    const updateMutation = useUpdatePolicy();
    const deleteMutation = useDeletePolicy();

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'org' | 'project'>('all');
    const [showTemplates, setShowTemplates] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [activeTab, setActiveTab] = useState<'policies' | 'guide'>('policies');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isActive: true,
    });
    const [formRules, setFormRules] = useState<RuleForm[]>([]);
    const [newRule, setNewRule] = useState<RuleForm>({
        ruleType: 'SEVERITY',
        operator: 'EQUALS',
        value: '',
        action: 'BLOCK',
        sendNotification: false,
    });

    // Statistics
    const stats = useMemo(() => {
        if (!policies) return { total: 0, active: 0, inactive: 0, totalRules: 0 };
        const active = policies.filter(p => p.isActive).length;
        const totalRules = policies.reduce((sum, p) => sum + (p.rules?.length || 0), 0);
        return {
            total: policies.length,
            active,
            inactive: policies.length - active,
            totalRules,
        };
    }, [policies]);

    const filteredPolicies = useMemo(() => {
        if (!policies) return [];
        return policies.filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && p.isActive) ||
                (statusFilter === 'inactive' && !p.isActive);
            const matchesScope = scopeFilter === 'all' ||
                (scopeFilter === 'global' && !p.projectId && !p.organizationId) ||
                (scopeFilter === 'org' && p.organizationId && !p.projectId) ||
                (scopeFilter === 'project' && p.projectId);
            return matchesSearch && matchesStatus && matchesScope;
        });
    }, [policies, searchQuery, statusFilter, scopeFilter]);

    const openCreateModal = () => {
        setFormData({ name: '', description: '', isActive: true });
        setFormRules([]);
        setShowCreateModal(true);
    };

    const openEditModal = (policy: Policy) => {
        setFormData({
            name: policy.name || '',
            description: policy.description || '',
            isActive: policy.isActive ?? true,
        });
        setFormRules(
            (policy.rules || []).map(r => ({
                ruleType: r.ruleType,
                operator: r.operator || 'EQUALS',
                value: r.value || '',
                action: r.action,
                sendNotification: (r as any).sendNotification ?? false,
            }))
        );
        setEditingPolicy(policy);
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setEditingPolicy(null);
        setShowTemplates(false);
    };

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync({
                ...formData,
                rules: formRules,
            });
            closeModals();
        } catch (err) {
            console.error('Failed to create policy:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingPolicy) return;
        try {
            await updateMutation.mutateAsync({
                id: editingPolicy.id,
                ...formData,
                rules: formRules,
            });
            closeModals();
        } catch (err) {
            console.error('Failed to update policy:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 정책을 삭제하시겠습니까?')) return;
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to delete policy:', err);
        }
    };

    const togglePolicy = async (policy: Policy) => {
        try {
            await updateMutation.mutateAsync({ id: policy.id, isActive: !policy.isActive });
        } catch (err) {
            console.error('Failed to toggle policy:', err);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedPolicies(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const addRule = () => {
        if (!newRule.value) return;
        setFormRules([...formRules, { ...newRule }]);
        setNewRule({ ruleType: 'SEVERITY', operator: 'EQUALS', value: '', action: 'BLOCK', sendNotification: false });
    };

    const removeRule = (index: number) => {
        setFormRules(formRules.filter((_, i) => i !== index));
    };

    const applyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
        setFormData({
            name: template.name,
            description: template.description,
            isActive: true,
        });
        setFormRules(template.rules.map(r => ({
            ruleType: r.ruleType,
            operator: r.operator,
            value: r.value,
            action: r.action,
            sendNotification: true,
        })));
        setShowTemplates(false);
    };

    const duplicatePolicy = (policy: Policy) => {
        setFormData({
            name: `${policy.name} (복사본)`,
            description: policy.description || '',
            isActive: false,
        });
        setFormRules(
            (policy.rules || []).map(r => ({
                ruleType: r.ruleType,
                operator: r.operator || 'EQUALS',
                value: r.value || '',
                action: r.action,
                sendNotification: (r as any).sendNotification ?? false,
            }))
        );
        setShowCreateModal(true);
    };

    const getScopeLabel = (policy: Policy) => {
        if (policy.projectId) return { text: '프로젝트', icon: FolderKanban, color: 'blue' };
        if (policy.organizationId) return { text: '조직', icon: Building2, color: 'purple' };
        return { text: '전역', icon: Globe, color: 'green' };
    };

    const getActionColor = (action: string) => {
        const actionConfig = ACTIONS.find(a => a.value === action);
        return actionConfig?.color || 'slate';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                정책 목록을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">정책 관리</h1>
                        <p className="text-sm text-slate-500">보안 정책을 관리하고 규칙을 설정합니다</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab(activeTab === 'guide' ? 'policies' : 'guide')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${
                            activeTab === 'guide'
                                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <HelpCircle className="h-4 w-4" />
                        {activeTab === 'guide' ? '정책 목록' : '사용 가이드'}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        정책 추가
                    </button>
                </div>
            </div>

            {/* Guide Tab */}
            {activeTab === 'guide' && (
                <div className="space-y-6">
                    {/* Workflow Diagram */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <GitBranch className="h-5 w-5 text-blue-600" />
                            정책 적용 워크플로우
                        </h2>
                        <div className="flex flex-wrap items-center justify-center gap-4 py-6">
                            <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <Scan className="h-10 w-10 text-blue-600 mb-2" />
                                <span className="font-medium text-blue-900 dark:text-blue-300">1. 스캔 실행</span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">Trivy로 취약점 탐지</span>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                            <div className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                <Shield className="h-10 w-10 text-purple-600 mb-2" />
                                <span className="font-medium text-purple-900 dark:text-purple-300">2. 정책 평가</span>
                                <span className="text-xs text-purple-600 dark:text-purple-400 mt-1">활성 정책 규칙 검사</span>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                            <div className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                <Target className="h-10 w-10 text-orange-600 mb-2" />
                                <span className="font-medium text-orange-900 dark:text-orange-300">3. 규칙 매칭</span>
                                <span className="text-xs text-orange-600 dark:text-orange-400 mt-1">BLOCK / WARN / AUDIT</span>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                            <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
                                <span className="font-medium text-green-900 dark:text-green-300">4. 결과 적용</span>
                                <span className="text-xs text-green-600 dark:text-green-400 mt-1">빌드 통과/실패 결정</span>
                            </div>
                        </div>
                    </div>

                    {/* What is Policy */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-600" />
                            정책이란?
                        </h2>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <p className="text-slate-600 dark:text-slate-400">
                                <strong>정책(Policy)</strong>은 보안 스캔 결과에 대해 자동으로 적용되는 규칙 모음입니다.
                                취약점이 발견되었을 때 어떻게 대응할지를 정의합니다.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">📌 예시 시나리오</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    "Critical 심각도 취약점이 발견되면 배포를 차단한다"
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">심각도 = CRITICAL</span>
                                    <ArrowRight className="h-3 w-3 text-slate-400" />
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded">BLOCK</span>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">🎯 활용 사례</h4>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                    <li>• CI/CD 파이프라인에서 자동 품질 게이트</li>
                                    <li>• 특정 CVE 취약점 0-day 대응</li>
                                    <li>• 라이선스 컴플라이언스 검사</li>
                                    <li>• 오래된 취약점 관리</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Rule Types */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <List className="h-5 w-5 text-purple-600" />
                            규칙 유형
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {RULE_TYPES.map(type => (
                                <div key={type.value} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                                            {type.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">{type.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">예: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{type.example}</code></p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-600" />
                            액션 종류
                        </h2>
                        <div className="grid md:grid-cols-4 gap-4">
                            {ACTIONS.map(action => (
                                <div key={action.value} className={`p-4 rounded-xl border-2 border-${action.color}-200 dark:border-${action.color}-800 bg-${action.color}-50 dark:bg-${action.color}-900/20`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                                        <span className={`font-bold text-${action.color}-700 dark:text-${action.color}-400`}>{action.label}</span>
                                    </div>
                                    <p className={`text-sm text-${action.color}-600 dark:text-${action.color}-400`}>{action.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scope */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Layers className="h-5 w-5 text-green-600" />
                            적용 범위 (Scope)
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-green-900 dark:text-green-300">전역 (Global)</span>
                                </div>
                                <p className="text-sm text-green-700 dark:text-green-400">모든 조직과 프로젝트에 적용됩니다. 시스템 관리자가 설정합니다.</p>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-5 w-5 text-purple-600" />
                                    <span className="font-medium text-purple-900 dark:text-purple-300">조직 (Organization)</span>
                                </div>
                                <p className="text-sm text-purple-700 dark:text-purple-400">특정 조직 내 모든 프로젝트에 적용됩니다.</p>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <FolderKanban className="h-5 w-5 text-blue-600" />
                                    <span className="font-medium text-blue-900 dark:text-blue-300">프로젝트 (Project)</span>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-400">특정 프로젝트에만 적용됩니다. 가장 구체적인 범위입니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Policies Tab */}
            {activeTab === 'policies' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">총 정책</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                    <Power className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">활성</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                                    <PowerOff className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">비활성</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.inactive}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                    <List className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">총 규칙</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalRules}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="정책 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                        >
                            <option value="all">모든 상태</option>
                            <option value="active">활성만</option>
                            <option value="inactive">비활성만</option>
                        </select>
                        <select
                            value={scopeFilter}
                            onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                        >
                            <option value="all">모든 범위</option>
                            <option value="global">전역</option>
                            <option value="org">조직</option>
                            <option value="project">프로젝트</option>
                        </select>
                    </div>

                    {/* Policies List */}
                    <div className="space-y-4">
                        {filteredPolicies.map((policy) => {
                            const isExpanded = expandedPolicies.has(policy.id);
                            const scope = getScopeLabel(policy);

                            return (
                                <div
                                    key={policy.id}
                                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border ${
                                        policy.isActive
                                            ? 'border-slate-200 dark:border-slate-700'
                                            : 'border-slate-200 dark:border-slate-700 opacity-60'
                                    } overflow-hidden`}
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    policy.isActive
                                                        ? 'bg-gradient-to-br from-red-500 to-orange-500'
                                                        : 'bg-slate-200 dark:bg-slate-700'
                                                }`}>
                                                    <Shield className={`h-6 w-6 ${policy.isActive ? 'text-white' : 'text-slate-400'}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{policy.name}</h3>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                                                            scope.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            scope.color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        }`}>
                                                            <scope.icon className="h-3 w-3" />
                                                            {scope.text}
                                                        </span>
                                                        {!policy.isActive && (
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                                                비활성
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-1">{policy.description}</p>
                                                    {policy.rules && policy.rules.length > 0 && (
                                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                            <span className="text-xs text-slate-500">{policy.rules.length}개 규칙:</span>
                                                            {['BLOCK', 'WARN', 'AUDIT'].map(action => {
                                                                const count = policy.rules?.filter(r => r.action === action).length || 0;
                                                                if (count === 0) return null;
                                                                const color = getActionColor(action);
                                                                return (
                                                                    <span
                                                                        key={action}
                                                                        className={`px-1.5 py-0.5 rounded text-xs ${
                                                                            color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                                            color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
                                                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                                                        }`}
                                                                    >
                                                                        {action}: {count}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => togglePolicy(policy)}
                                                    disabled={updateMutation.isPending}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        policy.isActive
                                                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                    }`}
                                                    title={policy.isActive ? '비활성화' : '활성화'}
                                                >
                                                    {policy.isActive ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                                                </button>
                                                <button
                                                    onClick={() => duplicatePolicy(policy)}
                                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                    title="복제"
                                                >
                                                    <Copy className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(policy)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="수정"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(policy.id)}
                                                    disabled={deleteMutation.isPending}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(policy.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Rules */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                                <List className="h-4 w-4" />
                                                정책 규칙
                                            </h4>
                                            {policy.rules && policy.rules.length > 0 ? (
                                                <div className="space-y-2">
                                                    {policy.rules.map((rule, idx) => {
                                                        const ActionIcon = ACTIONS.find(a => a.value === rule.action)?.icon || AlertCircle;
                                                        const actionColor = getActionColor(rule.action);
                                                        return (
                                                            <div
                                                                key={rule.id || idx}
                                                                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                                            >
                                                                <div className="flex items-center gap-2 flex-1 flex-wrap">
                                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                        {RULE_TYPES.find(t => t.value === rule.ruleType)?.label || rule.ruleType}
                                                                    </span>
                                                                    <span className="text-slate-500 text-sm">
                                                                        {OPERATORS.find(o => o.value === rule.operator)?.label || rule.operator}
                                                                    </span>
                                                                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-mono">
                                                                        {rule.value}
                                                                    </span>
                                                                </div>
                                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                                                                    actionColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                    actionColor === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                    actionColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                }`}>
                                                                    <ActionIcon className="h-3.5 w-3.5" />
                                                                    {rule.action}
                                                                </span>
                                                                {(rule as any).sendNotification && (
                                                                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs" title="알림 활성화됨">
                                                                        <Bell className="h-3.5 w-3.5" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">정의된 규칙이 없습니다</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {filteredPolicies.length === 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                            <Shield className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                정책이 없습니다
                            </h3>
                            <p className="text-slate-500 mb-4">정책을 추가하여 보안 규칙을 설정하세요</p>
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => setActiveTab('guide')}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                    사용 가이드
                                </button>
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    정책 추가
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || editingPolicy) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {editingPolicy ? '정책 수정' : '정책 추가'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {!editingPolicy && (
                                    <button
                                        onClick={() => setShowTemplates(!showTemplates)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                    >
                                        <Zap className="h-4 w-4" />
                                        템플릿
                                    </button>
                                )}
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Templates Panel */}
                        {showTemplates && (
                            <div className="p-4 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800">
                                <p className="text-sm text-violet-700 dark:text-violet-400 mb-3">템플릿 선택:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {POLICY_TEMPLATES.map(template => (
                                        <button
                                            key={template.id}
                                            onClick={() => applyTemplate(template)}
                                            className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-violet-200 dark:border-violet-700 text-left hover:border-violet-400 transition-colors"
                                        >
                                            <p className="font-medium text-sm text-slate-900 dark:text-white">{template.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        정책 이름 *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="Critical 취약점 차단"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        설명
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                                        정책 활성화
                                    </label>
                                </div>
                            </div>

                            {/* Rules Section */}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Target className="h-4 w-4 text-red-600" />
                                    규칙 설정
                                    <span className="text-xs text-slate-500 font-normal">(조건에 맞는 취약점에 액션 적용)</span>
                                </h4>

                                {/* Existing Rules */}
                                {formRules.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {formRules.map((rule, idx) => {
                                            const actionColor = getActionColor(rule.action);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"
                                                >
                                                    <GripVertical className="h-4 w-4 text-slate-400" />
                                                    <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs">
                                                        {RULE_TYPES.find(t => t.value === rule.ruleType)?.label}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {OPERATORS.find(o => o.value === rule.operator)?.label}
                                                    </span>
                                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-mono flex-1">
                                                        {rule.value}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        actionColor === 'red' ? 'bg-red-100 text-red-700' :
                                                        actionColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                                        actionColor === 'blue' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                        {rule.action}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...formRules];
                                                            updated[idx] = { ...rule, sendNotification: !rule.sendNotification };
                                                            setFormRules(updated);
                                                        }}
                                                        className={`p-1 rounded transition-colors ${
                                                            rule.sendNotification
                                                                ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
                                                                : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={rule.sendNotification ? '알림 활성화됨' : '알림 비활성화됨'}
                                                    >
                                                        {rule.sendNotification ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => removeRule(idx)}
                                                        className="p-1 text-slate-400 hover:text-red-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add Rule Form */}
                                <div className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                                    <div className="flex-1 min-w-[120px]">
                                        <label className="block text-xs text-slate-500 mb-1">유형</label>
                                        <select
                                            value={newRule.ruleType}
                                            onChange={(e) => setNewRule({ ...newRule, ruleType: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm"
                                        >
                                            {RULE_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-[100px]">
                                        <label className="block text-xs text-slate-500 mb-1">조건</label>
                                        <select
                                            value={newRule.operator}
                                            onChange={(e) => setNewRule({ ...newRule, operator: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm"
                                        >
                                            {OPERATORS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-xs text-slate-500 mb-1">
                                            값 <span className="text-slate-400">({RULE_TYPES.find(t => t.value === newRule.ruleType)?.example})</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newRule.value}
                                            onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm"
                                            placeholder={RULE_TYPES.find(t => t.value === newRule.ruleType)?.example}
                                        />
                                    </div>
                                    <div className="w-[100px]">
                                        <label className="block text-xs text-slate-500 mb-1">액션</label>
                                        <select
                                            value={newRule.action}
                                            onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm"
                                        >
                                            {ACTIONS.map(a => (
                                                <option key={a.value} value={a.value}>{a.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="block text-xs text-slate-500 mb-1">알림</label>
                                        <button
                                            type="button"
                                            onClick={() => setNewRule({ ...newRule, sendNotification: !newRule.sendNotification })}
                                            className={`p-1.5 rounded transition-colors ${
                                                newRule.sendNotification
                                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                                            }`}
                                            title={newRule.sendNotification ? '알림 활성화됨' : '알림 비활성화됨'}
                                        >
                                            {newRule.sendNotification ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={addRule}
                                        disabled={!newRule.value}
                                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
                            <button
                                onClick={closeModals}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={editingPolicy ? handleUpdate : handleCreate}
                                disabled={createMutation.isPending || updateMutation.isPending || !formData.name}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? '처리 중...' : editingPolicy ? '저장' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
