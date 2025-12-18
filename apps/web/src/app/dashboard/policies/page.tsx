'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { usePolicies, useCreatePolicy, useUpdatePolicy, useDeletePolicy, useOrganizations, Policy } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution, usePolicyAiContext } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

export default function PoliciesPage() {
    const { data: policies, isLoading, error, refetch } = usePolicies();
    const { data: organizations } = useOrganizations();
    const createPolicy = useCreatePolicy();
    const updatePolicy = useUpdatePolicy();
    const deletePolicy = useDeletePolicy();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        organizationId: '',
        projectId: '',
        isActive: true,
    });

    // AI Execution for policy recommendation
    const collectPolicyContext = usePolicyAiContext();
    const {
        execute: executePolicyRecommend,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('policy.recommendation');

    const { activePanel, closePanel } = useAiStore();

    const handleAiRecommend = () => {
        const context = collectPolicyContext(policies || [], undefined);
        executePolicyRecommend(context);
    };

    const handleAiRegenerate = () => {
        handleAiRecommend();
    };

    const estimatedTokens = estimateTokens(collectPolicyContext(policies?.slice(0, 5) || [], undefined));

    const handleCreate = async () => {
        try {
            await createPolicy.mutateAsync({
                name: formData.name,
                description: formData.description || undefined,
                organizationId: formData.organizationId || undefined,
                projectId: formData.projectId || undefined,
                isActive: formData.isActive,
            });
            setShowCreateForm(false);
            setFormData({ name: '', description: '', organizationId: '', projectId: '', isActive: true });
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
                isActive: formData.isActive,
            });
            setEditingPolicy(null);
            setFormData({ name: '', description: '', organizationId: '', projectId: '', isActive: true });
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
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
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
        });
        setShowCreateForm(false);
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
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-slate-600 dark:text-slate-400">정책을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">정책 관리</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        보안 정책을 관리하고 예외를 설정합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AiButton
                        action="policy.recommendation"
                        variant="primary"
                        size="md"
                        estimatedTokens={estimatedTokens}
                        loading={aiLoading}
                        onExecute={handleAiRecommend}
                        onCancel={cancelAi}
                    />
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        새로고침
                    </button>
                    <button
                        onClick={() => {
                            setShowCreateForm(true);
                            setEditingPolicy(null);
                            setFormData({ name: '', description: '', organizationId: '', projectId: '', isActive: true });
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        정책 추가
                    </button>
                </div>
            </div>

            {/* Create/Edit Form */}
            {(showCreateForm || editingPolicy) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        {editingPolicy ? '정책 수정' : '새 정책 추가'}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                정책 이름 *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="예: Critical 취약점 차단"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                설명
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="정책에 대한 설명을 입력하세요."
                            />
                        </div>
                        {!editingPolicy && organizations && organizations.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    조직 (선택사항)
                                </label>
                                <select
                                    value={formData.organizationId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">전체 (조직 지정 안함)</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                className="text-slate-600 dark:text-slate-400"
                            >
                                {formData.isActive ? (
                                    <ToggleRight className="h-6 w-6 text-blue-600" />
                                ) : (
                                    <ToggleLeft className="h-6 w-6" />
                                )}
                            </button>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                {formData.isActive ? '활성화' : '비활성화'}
                            </span>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setEditingPolicy(null);
                                }}
                                className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={editingPolicy ? handleUpdate : handleCreate}
                                disabled={!formData.name.trim() || createPolicy.isPending || updatePolicy.isPending}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {(createPolicy.isPending || updatePolicy.isPending) && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {editingPolicy ? '수정' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Policies List */}
            {!policies || policies.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        정책이 없습니다
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        보안 정책을 추가하여 취약점 관리를 시작하세요.
                    </p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        첫 정책 추가
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {policies.map((policy: Policy) => (
                        <div
                            key={policy.id}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleExpanded(policy.id)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        {expandedPolicies.has(policy.id) ? (
                                            <ChevronDown className="h-5 w-5" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5" />
                                        )}
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <Shield className={`h-5 w-5 ${policy.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <div>
                                            <h3 className={`font-medium ${policy.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                {policy.name}
                                            </h3>
                                            {policy.description && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {policy.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {policy.organization && (
                                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                            {policy.organization.name}
                                        </span>
                                    )}
                                    {policy.project && (
                                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            {policy.project.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => toggleEnabled(policy)}
                                        disabled={updatePolicy.isPending}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
                                    >
                                        {policy.isActive ? (
                                            <ToggleRight className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <ToggleLeft className="h-5 w-5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => startEdit(policy)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(policy.id)}
                                        disabled={deletePolicy.isPending}
                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {expandedPolicies.has(policy.id) && policy.rules && policy.rules.length > 0 && (
                                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">규칙</h4>
                                    <div className="space-y-2">
                                        {policy.rules.map((rule) => (
                                            <div key={rule.id} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                                                <span className="text-slate-600 dark:text-slate-400">{rule.ruleType}:</span>
                                                <span className="text-slate-900 dark:text-white">{rule.condition} {rule.value}</span>
                                                <span className="text-slate-500">→</span>
                                                <span className="font-medium text-blue-600 dark:text-blue-400">{rule.action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'policy.recommendation'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="policy.recommendation"
            />
        </div>
    );
}
