'use client';

import { useState, useEffect } from 'react';
import {
    Sparkles,
    Save,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle,
    Loader2,
    Play,
    Copy,
    Download,
    Upload,
    Search,
    FileCode,
    Wand2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface PromptData {
    prompt: string;
    isCustom: boolean;
    label: string;
    description: string;
}

export default function AiPromptsPage() {
    const { accessToken } = useAuthStore();
    const [prompts, setPrompts] = useState<Record<string, PromptData>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [expandedAction, setExpandedAction] = useState<string | null>(null);
    const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Prompt testing
    const [testingAction, setTestingAction] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, string>>({});
    const [testContext, setTestContext] = useState('{"vulnerabilities": [{"cveId": "CVE-2024-1234", "severity": "HIGH"}]}');

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        try {
            const response = await fetch('/api/ai/prompts', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch prompts');
            const data = await response.json();
            setPrompts(data);
        } catch (err) {
            setError('프롬프트를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (action: string) => {
        const prompt = editedPrompts[action];
        if (!prompt) return;

        setSaving(action);
        setError(null);

        try {
            const response = await fetch(`/api/ai/prompts/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) throw new Error('Failed to save prompt');

            setPrompts(prev => ({
                ...prev,
                [action]: { ...prev[action], prompt, isCustom: true },
            }));
            setEditedPrompts(prev => {
                const newEdited = { ...prev };
                delete newEdited[action];
                return newEdited;
            });
            setSuccessMessage(`${prompts[action]?.label || action} 프롬프트가 저장되었습니다.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('프롬프트 저장에 실패했습니다.');
        } finally {
            setSaving(null);
        }
    };

    const handleReset = async (action: string) => {
        setSaving(action);
        setError(null);

        try {
            const response = await fetch(`/api/ai/prompts/${action}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) throw new Error('Failed to reset prompt');

            await fetchPrompts();
            setEditedPrompts(prev => {
                const newEdited = { ...prev };
                delete newEdited[action];
                return newEdited;
            });
            setSuccessMessage(`${prompts[action]?.label || action} 프롬프트가 기본값으로 복원되었습니다.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('프롬프트 초기화에 실패했습니다.');
        } finally {
            setSaving(null);
        }
    };

    const handleTest = async (action: string) => {
        setTestingAction(action);
        setTestResults(prev => ({ ...prev, [action]: '' }));

        try {
            let context = {};
            try {
                context = JSON.parse(testContext);
            } catch {
                context = { text: testContext };
            }

            const response = await fetch('/api/ai/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ action, context }),
            });

            const result = await response.json();
            setTestResults(prev => ({
                ...prev,
                [action]: result.content || result.message || 'No response',
            }));
        } catch (err) {
            setTestResults(prev => ({
                ...prev,
                [action]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            }));
        } finally {
            setTestingAction(null);
        }
    };

    const handleExportPrompts = () => {
        const exportData: Record<string, string> = {};
        Object.entries(prompts).forEach(([action, data]) => {
            if (data.isCustom) {
                exportData[action] = data.prompt;
            }
        });
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-prompts-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportPrompts = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importedPrompts = JSON.parse(text) as Record<string, string>;
            
            for (const [action, prompt] of Object.entries(importedPrompts)) {
                if (prompts[action]) {
                    await fetch(`/api/ai/prompts/${action}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({ prompt }),
                    });
                }
            }
            
            await fetchPrompts();
            setSuccessMessage(`${Object.keys(importedPrompts).length}개 프롬프트를 불러왔습니다.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('프롬프트 파일을 불러오는데 실패했습니다.');
        }
        
        e.target.value = '';
    };

    const handleCopyPrompt = (prompt: string) => {
        navigator.clipboard.writeText(prompt);
        setSuccessMessage('프롬프트가 클립보드에 복사되었습니다.');
        setTimeout(() => setSuccessMessage(null), 2000);
    };

    const handlePromptChange = (action: string, value: string) => {
        setEditedPrompts(prev => ({ ...prev, [action]: value }));
    };

    const isEdited = (action: string) => {
        return editedPrompts[action] !== undefined && editedPrompts[action] !== prompts[action]?.prompt;
    };

    const actionGroups: Record<string, string[]> = {
        '대시보드': ['dashboard.summary', 'dashboard.riskAnalysis'],
        '프로젝트': ['project.analysis', 'scan.changeAnalysis'],
        '취약점': ['vuln.priorityReorder', 'vuln.actionGuide', 'vuln.impactAnalysis'],
        '정책': ['policy.interpretation', 'policy.recommendation'],
        '워크플로우': ['workflow.fixVerification'],
        '리포트': ['report.generation'],
        '알림': ['notification.summary'],
        '가이드': ['guide.trivyCommand'],
        '관리자': ['admin.permissionRecommendation', 'admin.complianceMapping'],
    };

    const filteredGroups = Object.entries(actionGroups).reduce((acc, [group, actions]) => {
        const filtered = actions.filter(action => {
            const data = prompts[action];
            if (!data) return false;
            if (!searchQuery) return true;
            return (
                data.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                data.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                action.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
        if (filtered.length > 0) {
            acc[group] = filtered;
        }
        return acc;
    }, {} as Record<string, string[]>);

    const customCount = Object.values(prompts).filter(p => p.isCustom).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI 프롬프트 관리</h1>
                        <p className="text-sm text-slate-500">각 AI 기능별 프롬프트를 수정하고 관리합니다</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4" />
                        불러오기
                        <input type="file" accept=".json" onChange={handleImportPrompts} className="hidden" />
                    </label>
                    <button
                        onClick={handleExportPrompts}
                        disabled={customCount === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        내보내기 ({customCount})
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500">총 프롬프트</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{Object.keys(prompts).length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500">커스텀 프롬프트</p>
                    <p className="text-2xl font-bold text-violet-600">{customCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500">기본값 사용</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{Object.keys(prompts).length - customCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm text-slate-500">카테고리</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{Object.keys(actionGroups).length}</p>
                </div>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Search & Test Context */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="프롬프트 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                </div>
            </div>

            {/* Test Context Input */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <FileCode className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">테스트 컨텍스트 (JSON)</span>
                </div>
                <textarea
                    value={testContext}
                    onChange={(e) => setTestContext(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder='{"key": "value"}'
                />
                <p className="text-xs text-slate-500 mt-1">프롬프트 테스트 시 사용될 컨텍스트 데이터</p>
            </div>

            {/* Prompt Groups */}
            <div className="space-y-6">
                {Object.entries(filteredGroups).map(([groupName, actions]) => (
                    <div key={groupName} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900 dark:text-white">{groupName}</h2>
                            <span className="text-xs text-slate-500">{actions.length}개 프롬프트</span>
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {actions.map(action => {
                                const data = prompts[action];
                                if (!data) return null;

                                const isExpanded = expandedAction === action;
                                const currentPrompt = editedPrompts[action] ?? data.prompt;
                                const hasChanges = isEdited(action);
                                const testResult = testResults[action];

                                return (
                                    <div key={action} className="p-4">
                                        <button
                                            onClick={() => setExpandedAction(isExpanded ? null : action)}
                                            className="w-full flex items-center justify-between text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-900 dark:text-white">{data.label}</span>
                                                        {data.isCustom && (
                                                            <span className="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full">
                                                                커스텀
                                                            </span>
                                                        )}
                                                        {hasChanges && (
                                                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                                                                수정됨
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500">{data.description}</p>
                                                </div>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="h-5 w-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-400" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-4 space-y-4">
                                                <div className="relative">
                                                    <textarea
                                                        value={currentPrompt}
                                                        onChange={e => handlePromptChange(action, e.target.value)}
                                                        rows={10}
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm resize-y focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                                        placeholder="프롬프트를 입력하세요..."
                                                    />
                                                    <button
                                                        onClick={() => handleCopyPrompt(currentPrompt)}
                                                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                                                        title="프롬프트 복사"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-slate-500">
                                                            액션 코드: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{action}</code>
                                                        </p>
                                                        <span className="text-xs text-slate-400">|</span>
                                                        <p className="text-xs text-slate-500">
                                                            {currentPrompt.length} 글자
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleTest(action)}
                                                            disabled={testingAction === action}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                                        >
                                                            {testingAction === action ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Wand2 className="h-4 w-4" />
                                                            )}
                                                            테스트
                                                        </button>
                                                        {data.isCustom && (
                                                            <button
                                                                onClick={() => handleReset(action)}
                                                                disabled={saving === action}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            >
                                                                {saving === action ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="h-4 w-4" />
                                                                )}
                                                                기본값 복원
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleSave(action)}
                                                            disabled={saving === action || !hasChanges}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {saving === action ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                            저장
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Test Result */}
                                                {testResult && (
                                                    <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                                            <Play className="h-4 w-4 text-violet-600" />
                                                            테스트 결과
                                                        </p>
                                                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-60 overflow-y-auto">
                                                            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                                                                {testResult}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
