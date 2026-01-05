'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Plus,
    Trash2,
    Edit,
    Shield,
    AlertTriangle,
    Loader2,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    FolderOpen,
    Zap,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    TrendingUp,
    Info,
    Settings,
    Play,
    GitBranch,
    Filter,
    Search,
    LayoutGrid,
    LayoutList,
    Copy,
    ExternalLink,
    ArrowRight,
    Eye,
    Users,
} from 'lucide-react';
import { usePolicies, useCreatePolicy, useUpdatePolicy, useDeletePolicy, useOrganizations, useProjects, Policy, PolicyRule } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution, usePolicyAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';
import { ThemeToggle } from '@/components/theme-toggle';

const RULE_TYPES = [
    { value: 'SEVERITY_THRESHOLD', label: '심각도 임계값', icon: AlertTriangle, desc: '특정 심각도 이상의 취약점 감지 시 작동' },
    { value: 'CVSS_THRESHOLD', label: 'CVSS 점수 임계값', icon: TrendingUp, desc: '특정 CVSS 점수 이상의 취약점 감지 시 작동' },
    { value: 'CVE_BLOCKLIST', label: 'CVE 차단 목록', icon: ShieldX, desc: '특정 CVE ID가 발견되면 작동' },
];

const ACTIONS = [
    { value: 'BLOCK', label: '차단', color: 'text-red-600 bg-red-50 dark:bg-red-900/30', icon: XCircle },
    { value: 'WARN', label: '경고', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30', icon: AlertCircle },
    { value: 'NOTIFY', label: '알림', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', icon: Info },
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

type ViewMode = 'list' | 'card';

// Stats Card Component
function StatCard({ title, value, icon, color, description }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        red: 'from-red-500 to-red-600',
        yellow: 'from-yellow-500 to-yellow-600',
        purple: 'from-purple-500 to-purple-600',
    };
    return (
        <div className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-white/80">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {description && <p className="text-xs text-white/70 mt-1">{description}</p>}
                </div>
                <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
            </div>
        </div>
    );
}

// Policy Flow Diagram
function PolicyFlowDiagram() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-blue-600" />
                정책 동작 흐름
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                    <Zap className="h-4 w-4" />
                    <span>스캔 실행</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                <ChevronDown className="h-4 w-4 text-slate-400 md:hidden" />
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg">
                    <Filter className="h-4 w-4" />
                    <span>정책 평가</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                <ChevronDown className="h-4 w-4 text-slate-400 md:hidden" />
                <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                        <ShieldX className="h-4 w-4" />
                        <span>차단 (BLOCK)</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <span>경고 (WARN)</span>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                <ChevronDown className="h-4 w-4 text-slate-400 md:hidden" />
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                    <span>결과 기록</span>
                </div>
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                    <ShieldX className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                        <strong>차단 (BLOCK)</strong>: 배포/빌드 중단, CI/CD 파이프라인 실패
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                        <strong>경고 (WARN)</strong>: 통과하지만 리포트에 경고 표시
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                        <strong>예외</strong>: 승인된 예외는 규칙 평가에서 제외
                    </div>
                </div>
            </div>
        </div>
    );
}

// Rule Builder Modal
function RuleBuilderModal({ isOpen, onClose, onSave, initialRule }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: any) => void;
    initialRule?: PolicyRule;
}) {
    const [ruleType, setRuleType] = useState(initialRule?.ruleType || 'SEVERITY_THRESHOLD');
    const [action, setAction] = useState(initialRule?.action || 'BLOCK');
    const [message, setMessage] = useState(initialRule?.message || '');
    const [conditions, setConditions] = useState<any>(initialRule?.conditions || {});
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>((initialRule?.conditions as any)?.severity || ['CRITICAL']);
    const [cvssScore, setCvssScore] = useState((initialRule?.conditions as any)?.cvssScore?.gte || 9.0);
    const [cveIds, setCveIds] = useState<string>((initialRule?.conditions as any)?.cveIds?.join('\n') || '');

    if (!isOpen) return null;

    const handleSave = () => {
        let cond: any = {};
        switch (ruleType) {
            case 'SEVERITY_THRESHOLD':
                cond = { severity: selectedSeverities };
                break;
            case 'CVSS_THRESHOLD':
                cond = { cvssScore: { gte: cvssScore } };
                break;
            case 'CVE_BLOCKLIST':
                cond = { cveIds: cveIds.split('\n').map(s => s.trim()).filter(Boolean) };
                break;
        }
        onSave({ ruleType, action, message, conditions: cond });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-blue-600" />
                        규칙 {initialRule ? '수정' : '추가'}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    {/* Rule Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">규칙 유형</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {RULE_TYPES.map(rt => (
                                <button key={rt.value} onClick={() => setRuleType(rt.value)} className={`p-3 rounded-lg border text-left transition-all ${ruleType === rt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <rt.icon className={`h-4 w-4 ${ruleType === rt.value ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <span className={`text-sm font-medium ${ruleType === rt.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{rt.label}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{rt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conditions based on rule type */}
                    {ruleType === 'SEVERITY_THRESHOLD' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">심각도 선택</label>
                            <div className="flex flex-wrap gap-2">
                                {SEVERITIES.map(sev => (
                                    <button key={sev} onClick={() => setSelectedSeverities(prev => prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev])} className={`px-3 py-1.5 rounded-lg border text-sm ${selectedSeverities.includes(sev) ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                        {sev}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">선택한 심각도의 취약점이 발견되면 규칙이 작동합니다.</p>
                        </div>
                    )}

                    {ruleType === 'CVSS_THRESHOLD' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">CVSS 점수 (이상)</label>
                            <div className="flex items-center gap-4">
                                <input type="range" min="0" max="10" step="0.1" value={cvssScore} onChange={e => setCvssScore(parseFloat(e.target.value))} className="flex-1" />
                                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${cvssScore >= 9 ? 'text-red-600 bg-red-100' : cvssScore >= 7 ? 'text-orange-600 bg-orange-100' : cvssScore >= 4 ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100'}`}>{cvssScore.toFixed(1)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">CVSS 점수가 {cvssScore} 이상인 취약점이 발견되면 규칙이 작동합니다.</p>
                        </div>
                    )}

                    {ruleType === 'CVE_BLOCKLIST' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">차단할 CVE ID (줄바꿈으로 구분)</label>
                            <textarea value={cveIds} onChange={e => setCveIds(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm" rows={5} placeholder="CVE-2021-44228&#10;CVE-2021-45046" />
                            <p className="text-xs text-slate-500 mt-2">목록에 있는 CVE가 발견되면 규칙이 작동합니다.</p>
                        </div>
                    )}

                    {/* Action */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">작업</label>
                        <div className="flex gap-2">
                            {ACTIONS.map(a => (
                                <button key={a.value} onClick={() => setAction(a.value)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${action === a.value ? `${a.color} border-current` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    <a.icon className="h-4 w-4" />
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">메시지 (선택)</label>
                        <input type="text" value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" placeholder="위반 시 표시할 메시지" />
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">취소</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
                </div>
            </div>
        </div>
    );
}

// Policy Card Component
function PolicyCard({ policy, expanded, onToggleExpand, onEdit, onDelete, onToggleActive, isUpdating }: {
    policy: Policy;
    expanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
    isUpdating: boolean;
}) {
    const ruleCount = policy.rules?.length || 0;
    const exceptionCount = (policy as any)._count?.exceptions || 0;

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border ${policy.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200/50 dark:border-slate-700/50 opacity-60'} overflow-hidden transition-all`}>
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onToggleExpand} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <div className={`p-2 rounded-lg ${policy.isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <Shield className={`h-5 w-5 ${policy.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                        <h3 className={`font-medium ${policy.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{policy.name}</h3>
                        {policy.description && <p className="text-sm text-slate-500 dark:text-slate-400">{policy.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                <Settings className="h-3 w-3" /> {ruleCount}개 규칙
                            </span>
                            {exceptionCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                    <ShieldCheck className="h-3 w-3" /> {exceptionCount}개 예외
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {policy.organization && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            <Building2 className="h-3 w-3" /> {policy.organization.name}
                        </span>
                    )}
                    {policy.project && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <FolderOpen className="h-3 w-3" /> {policy.project.name}
                        </span>
                    )}
                    <button onClick={onToggleActive} disabled={isUpdating} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50">
                        {policy.isActive ? <ToggleRight className="h-5 w-5 text-blue-600" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit className="h-4 w-4" /></button>
                    <button onClick={onDelete} disabled={isUpdating} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                    {policy.rules && policy.rules.length > 0 ? (
                        <div className="p-4">
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" /> 규칙
                            </h4>
                            <div className="space-y-2">
                                {policy.rules.map((rule, idx) => {
                                    const ruleTypeMeta = RULE_TYPES.find(rt => rt.value === rule.ruleType);
                                    const actionMeta = ACTIONS.find(a => a.value === rule.action);
                                    return (
                                        <div key={rule.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                            <span className="text-xs text-slate-400 font-mono">#{idx + 1}</span>
                                            <div className="flex items-center gap-2 flex-1">
                                                {ruleTypeMeta && <ruleTypeMeta.icon className="h-4 w-4 text-slate-500" />}
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{ruleTypeMeta?.label || rule.ruleType}</span>
                                                <span className="text-slate-400">:</span>
                                                <code className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded">{JSON.stringify(rule.condition || rule.conditions)}</code>
                                            </div>
                                            <span className="text-slate-400">→</span>
                                            {actionMeta && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${actionMeta.color}`}>
                                                    <actionMeta.icon className="h-3 w-3" /> {actionMeta.label}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                            <Settings className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">규칙이 없습니다</p>
                            <p className="text-xs">정책을 편집하여 규칙을 추가하세요</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function PoliciesPage() {
    const { data: policies, isLoading, error, refetch } = usePolicies();
    const { data: organizations } = useOrganizations();
    const { data: projectsData } = useProjects();
    const projects = projectsData?.data || [];
    const createPolicy = useCreatePolicy();
    const updatePolicy = useUpdatePolicy();
    const deletePolicy = useDeletePolicy();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterScope, setFilterScope] = useState<'all' | 'org' | 'project'>('all');
    const [showRuleBuilder, setShowRuleBuilder] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        organizationId: '',
        projectId: '',
        isActive: true,
        rules: [] as any[],
    });

    // AI
    const collectPolicyContext = usePolicyAiContext();
    const { execute: executePolicyRecommend, isLoading: aiLoading, result: aiResult, previousResults: aiPreviousResults, estimateTokens, cancel: cancelAi, progress: aiProgress } = useAiExecution('policy.recommendation');
    const { activePanel, closePanel } = useAiStore();

    const handleAiRecommend = () => {
        const context = collectPolicyContext(policies || [], undefined);
        executePolicyRecommend(context);
    };

    const estimatedTokens = estimateTokens(collectPolicyContext(policies?.slice(0, 5) || [], undefined));

    // Filter policies
    const filteredPolicies = (policies || []).filter((p: Policy) => {
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.description?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
        if (filterScope === 'org' && !p.organizationId) return false;
        if (filterScope === 'project' && !p.projectId) return false;
        return true;
    });

    // Stats
    const stats = {
        total: policies?.length || 0,
        active: policies?.filter((p: Policy) => p.isActive).length || 0,
        orgLevel: policies?.filter((p: Policy) => p.organizationId && !p.projectId).length || 0,
        projectLevel: policies?.filter((p: Policy) => p.projectId).length || 0,
    };

    const handleCreate = async () => {
        try {
            await createPolicy.mutateAsync({
                name: formData.name,
                description: formData.description || undefined,
                organizationId: formData.organizationId || undefined,
                projectId: formData.projectId || undefined,
                isActive: formData.isActive,
                rules: formData.rules.length > 0 ? formData.rules : undefined,
            } as any);
            setShowCreateForm(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create policy:', error);
        }
    };

    const handleUpdate = async () => {
        if (!editingPolicy) return;
        try {
            await updatePolicy.mutateAsync({
                id: editingPolicy.id,
                name: formData.name,
                description: formData.description || undefined,
                organizationId: formData.organizationId || undefined,
                isActive: formData.isActive,
            });
            setEditingPolicy(null);
            resetForm();
        } catch (error) {
            console.error('Failed to update policy:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말로 이 정책을 삭제하시겠습니까?')) return;
        try {
            await deletePolicy.mutateAsync(id);
        } catch (error) {
            console.error('Failed to delete policy:', error);
        }
    };

    const toggleEnabled = async (policy: Policy) => {
        try {
            await updatePolicy.mutateAsync({ id: policy.id, isActive: !policy.isActive });
        } catch (error) {
            console.error('Failed to toggle policy:', error);
        }
    };

    const toggleExpanded = (id: string) => {
        setExpandedPolicies(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const startEdit = (policy: Policy) => {
        setEditingPolicy(policy);
        setFormData({
            name: policy.name,
            description: policy.description || '',
            organizationId: policy.organizationId || '',
            projectId: policy.projectId || '',
            isActive: policy.isActive,
            rules: policy.rules || [],
        });
        setShowCreateForm(false);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', organizationId: '', projectId: '', isActive: true, rules: [] });
    };

    const addRule = (rule: any) => {
        setFormData(prev => ({ ...prev, rules: [...prev.rules, rule] }));
    };

    const removeRule = (index: number) => {
        setFormData(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <p className="text-slate-600 dark:text-slate-400">정책을 불러오는데 실패했습니다.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><RefreshCw className="h-4 w-4" /> 다시 시도</button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">정책 관리</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">보안 정책을 관리하고 예외를 설정합니다.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="정책 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 w-48 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                    </div>
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutList className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('card')} className={`p-2 ${viewMode === 'card' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button>
                    </div>
                    <ThemeToggle />
                    <AiButton action="policy.recommendation" variant="primary" size="md" estimatedTokens={estimatedTokens} loading={aiLoading} onExecute={handleAiRecommend} onCancel={cancelAi} />
                    <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"><RefreshCw className="h-4 w-4" /></button>
                    <button onClick={() => { setShowCreateForm(true); setEditingPolicy(null); resetForm(); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> 정책 추가</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="전체 정책" value={stats.total} icon={<Shield className="h-5 w-5" />} color="blue" />
                <StatCard title="활성 정책" value={stats.active} icon={<Play className="h-5 w-5" />} color="green" />
                <StatCard title="조직 수준" value={stats.orgLevel} icon={<Building2 className="h-5 w-5" />} color="purple" description="조직 전체 적용" />
                <StatCard title="프로젝트 수준" value={stats.projectLevel} icon={<FolderOpen className="h-5 w-5" />} color="yellow" description="특정 프로젝트 적용" />
            </div>

            {/* Policy Flow Diagram */}
            <PolicyFlowDiagram />

            {/* Scope Filter */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">범위:</span>
                {[{ id: 'all', label: '전체' }, { id: 'org', label: '조직 수준' }, { id: 'project', label: '프로젝트 수준' }].map(f => (
                    <button key={f.id} onClick={() => setFilterScope(f.id as any)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterScope === f.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>{f.label}</button>
                ))}
            </div>

            {/* Create/Edit Form */}
            {(showCreateForm || editingPolicy) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{editingPolicy ? '정책 수정' : '새 정책 추가'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">정책 이름 *</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" placeholder="예: Critical 취약점 차단" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">조직</label>
                            <select value={formData.organizationId} onChange={e => setFormData(prev => ({ ...prev, organizationId: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                                <option value="">전체 (조직 지정 안함)</option>
                                {organizations?.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">설명</label>
                            <textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" rows={2} placeholder="정책에 대한 설명" />
                        </div>
                    </div>

                    {/* Rules Section */}
                    {!editingPolicy && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">규칙</label>
                                <button onClick={() => setShowRuleBuilder(true)} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> 규칙 추가</button>
                            </div>
                            {formData.rules.length > 0 ? (
                                <div className="space-y-2">
                                    {formData.rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                            <span className="text-xs text-slate-400 font-mono">#{idx + 1}</span>
                                            <span className="text-sm flex-1">{RULE_TYPES.find(r => r.value === rule.ruleType)?.label} → {ACTIONS.find(a => a.value === rule.action)?.label}</span>
                                            <button onClick={() => removeRule(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">규칙이 없습니다. 규칙을 추가하여 정책 동작을 정의하세요.</p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-4">
                        <button onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}>{formData.isActive ? <ToggleRight className="h-6 w-6 text-blue-600" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{formData.isActive ? '활성화' : '비활성화'}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => { setShowCreateForm(false); setEditingPolicy(null); }} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">취소</button>
                        <button onClick={editingPolicy ? handleUpdate : handleCreate} disabled={!formData.name.trim() || createPolicy.isPending || updatePolicy.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                            {(createPolicy.isPending || updatePolicy.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingPolicy ? '수정' : '추가'}
                        </button>
                    </div>
                </div>
            )}

            {/* Policies List */}
            {filteredPolicies.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{searchQuery ? '검색 결과가 없습니다' : '정책이 없습니다'}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">보안 정책을 추가하여 취약점 관리를 시작하세요.</p>
                    <button onClick={() => setShowCreateForm(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> 첫 정책 추가</button>
                </div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPolicies.map((policy: Policy) => (
                        <div key={policy.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${policy.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200/50 opacity-60'} p-4`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${policy.isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                    <Shield className={`h-5 w-5 ${policy.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                </div>
                                <button onClick={() => toggleEnabled(policy)} className="text-slate-400 hover:text-slate-600">
                                    {policy.isActive ? <ToggleRight className="h-5 w-5 text-blue-600" /> : <ToggleLeft className="h-5 w-5" />}
                                </button>
                            </div>
                            <h3 className={`font-medium mb-1 ${policy.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{policy.name}</h3>
                            {policy.description && <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{policy.description}</p>}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{policy.rules?.length || 0}개 규칙</span>
                                {policy.organization && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{policy.organization.name}</span>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => startEdit(policy)} className="flex-1 text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50"><Edit className="h-3 w-3 inline mr-1" /> 편집</button>
                                <button onClick={() => handleDelete(policy.id)} className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPolicies.map((policy: Policy) => (
                        <PolicyCard key={policy.id} policy={policy} expanded={expandedPolicies.has(policy.id)} onToggleExpand={() => toggleExpanded(policy.id)} onEdit={() => startEdit(policy)} onDelete={() => handleDelete(policy.id)} onToggleActive={() => toggleEnabled(policy)} isUpdating={updatePolicy.isPending || deletePolicy.isPending} />
                    ))}
                </div>
            )}

            {/* Rule Builder Modal */}
            <RuleBuilderModal isOpen={showRuleBuilder} onClose={() => setShowRuleBuilder(false)} onSave={addRule} />

            {/* AI Result Panel */}
            <AiResultPanel isOpen={activePanel?.key === 'policy.recommendation'} onClose={closePanel} result={aiResult} previousResults={aiPreviousResults} loading={aiLoading} loadingProgress={aiProgress} onRegenerate={handleAiRecommend} action="policy.recommendation" />
        </div>
    );
}
