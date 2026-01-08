'use client';

import { useState, useEffect } from 'react';
import {
    Save,
    AlertTriangle,
    CheckCircle,
    Settings,
    Zap,
    FileText,
    Loader2,
    Key,
    Server,
    RefreshCw,
    Edit3,
    Activity,
    Clock,
    BarChart3,
    Play,
    Cpu,
    Timer,
    Stethoscope,
    AlertCircle,
} from 'lucide-react';
import { useAiSettings, useUpdateSettings, type AiSettings } from '@/lib/api-hooks';
import { useAuthStore } from '@/stores/auth-store';

const defaultConfig: AiSettings = {
    provider: 'openai',
    apiUrl: '',
    apiKey: '',
    summaryModel: 'gpt-4',
    remediationModel: 'gpt-4-turbo',
    maxTokens: 1024,
    temperature: 0.7,
    timeout: 60,
    enableAutoSummary: true,
    enableRemediationGuide: true,
};

const providers = [
    { id: 'openai', name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', description: 'GPT-4, GPT-3.5 Turbo' },
    { id: 'anthropic', name: 'Anthropic', defaultUrl: 'https://api.anthropic.com', description: 'Claude 3' },
    { id: 'vllm', name: 'vLLM', defaultUrl: 'http://localhost:8000/v1', description: '로컬 LLM 서버' },
    { id: 'ollama', name: 'Ollama', defaultUrl: 'http://localhost:11434', description: '로컬 Ollama' },
    { id: 'custom', name: 'Custom', defaultUrl: '', description: '커스텀 엔드포인트' },
];

const staticModelsByProvider: Record<string, { id: string; name: string }[]> = {
    openai: [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    anthropic: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
    vllm: [],
    ollama: [],
    custom: [
        { id: 'custom', name: '직접 입력' },
    ],
};

interface DynamicModel {
    id: string;
    name: string;
    size?: number;
    modifiedAt?: string;
}

interface AiUsageStats {
    totalCalls: number;
    totalTokens: number;
    avgResponseTime: number;
    lastUsed: string | null;
    callsByAction: Record<string, number>;
}

export default function AiSettingsPage() {
    const { data: settings, isLoading, error } = useAiSettings();
    const updateMutation = useUpdateSettings();

    const [config, setConfig] = useState<AiSettings>(defaultConfig);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'provider' | 'model' | 'advanced' | 'stats'>('provider');

    // Dynamic models from server
    const [ollamaModels, setOllamaModels] = useState<DynamicModel[]>([]);
    const [vllmModels, setVllmModels] = useState<DynamicModel[]>([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    // Custom model input for vLLM
    const [customVllmModel, setCustomVllmModel] = useState('');
    const [useCustomVllmModel, setUseCustomVllmModel] = useState(false);

    // Cache URLs per provider to prevent reset when switching
    const [providerUrls, setProviderUrls] = useState<Record<string, string>>({});

    // AI Usage stats (mock for now)
    const [usageStats, setUsageStats] = useState<AiUsageStats>({
        totalCalls: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        lastUsed: null,
        callsByAction: {},
    });

    // Quick test prompt
    const [quickTestPrompt, setQuickTestPrompt] = useState('안녕하세요. 이 취약점의 간단한 요약을 제공해주세요.');
    const [quickTestResult, setQuickTestResult] = useState<string | null>(null);
    const [quickTesting, setQuickTesting] = useState(false);

    // Connection diagnostics
    const [diagnosing, setDiagnosing] = useState(false);
    const [diagnosisResult, setDiagnosisResult] = useState<{
        success: boolean;
        message: string;
        settings?: {
            provider: string;
            apiUrl: string;
            model: string;
            timeout: number;
            enabled: boolean;
        };
        connection?: {
            status: string;
            responseTimeMs?: number;
            version?: string;
            modelCount?: number;
        };
        recentErrors?: Array<{
            action: string;
            error?: string;
            timestamp: string;
            durationMs: number;
        }>;
        diagnosedAt?: string;
    } | null>(null);

    useEffect(() => {
        if (settings) {
            setConfig({ ...defaultConfig, ...settings });
            if (settings.provider === 'vllm' && settings.summaryModel) {
                setCustomVllmModel(settings.summaryModel);
                setUseCustomVllmModel(true);
            }
            
            // Initialize provider URLs with default values and the current saved URL
            const initialUrls: Record<string, string> = { ...providerUrls };
            providers.forEach(p => {
                if (!initialUrls[p.id]) {
                    initialUrls[p.id] = p.defaultUrl;
                }
            });
            // Overwrite the current provider's URL with the saved one
            if (settings.provider && settings.apiUrl) {
                initialUrls[settings.provider] = settings.apiUrl;
            }
            setProviderUrls(initialUrls);
        }
    }, [settings]);

    const handleProviderChange = (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        const models = staticModelsByProvider[providerId] || [];
        
        // Use cached URL or default
        const nextUrl = providerUrls[providerId] || provider?.defaultUrl || '';
        
        setConfig(prev => ({
            ...prev,
            provider: providerId as AiSettings['provider'],
            apiUrl: nextUrl,
            summaryModel: models[0]?.id || '',
            remediationModel: models[0]?.id || '',
        }));
        setOllamaModels([]);
        setVllmModels([]);
        setTestResult(null);
        setCustomVllmModel('');
        setUseCustomVllmModel(false);
    };

    const handleApiUrlChange = (newUrl: string) => {
        setConfig(prev => ({ ...prev, apiUrl: newUrl }));
        // Update cache
        setProviderUrls(prev => ({
            ...prev,
            [config.provider]: newUrl
        }));
    };

    const handleSave = async () => {
        try {
            const configToSave = { ...config };
            if (config.provider === 'vllm' && useCustomVllmModel && customVllmModel) {
                configToSave.summaryModel = customVllmModel;
                configToSave.remediationModel = customVllmModel;
            }

            await updateMutation.mutateAsync({ key: 'ai', value: configToSave });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save AI settings:', err);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch('/api/ai/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    provider: config.provider,
                    apiUrl: config.apiUrl,
                    apiKey: config.apiKey,
                }),
            });

            const result = await response.json();
            setTestResult({
                success: result.success,
                message: result.message || (result.success ? '연결 성공' : '연결 실패'),
            });

            if (result.success && config.provider === 'ollama') {
                await fetchOllamaModels();
            }
            if (result.success && config.provider === 'vllm') {
                await fetchVllmModels();
            }
        } catch (err) {
            setTestResult({
                success: false,
                message: err instanceof Error ? err.message : '연결 테스트 실패',
            });
        } finally {
            setTesting(false);
        }
    };

    const handleQuickTest = async () => {
        setQuickTesting(true);
        setQuickTestResult(null);

        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch('/api/ai/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'dashboard.summary',
                    context: { text: quickTestPrompt },
                }),
            });

            const result = await response.json();
            if (result.content) {
                setQuickTestResult(result.content);
            } else if (result.message) {
                setQuickTestResult(`Error: ${result.message}`);
            }
        } catch (err) {
            setQuickTestResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setQuickTesting(false);
        }
    };

    const handleDiagnose = async () => {
        setDiagnosing(true);
        setDiagnosisResult(null);

        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch('/api/ai/diagnose', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            const result = await response.json();
            setDiagnosisResult(result);
        } catch (err) {
            setDiagnosisResult({
                success: false,
                message: err instanceof Error ? err.message : '진단 실패',
            });
        } finally {
            setDiagnosing(false);
        }
    };

    const fetchOllamaModels = async () => {
        if (!config.apiUrl) return;
        setFetchingModels(true);
        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`/api/ai/ollama/models?apiUrl=${encodeURIComponent(config.apiUrl)}`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: 'include',
            });
            const result = await response.json();
            if (result.success && result.models) {
                setOllamaModels(result.models);
                if (result.models.length > 0 && !config.summaryModel) {
                    setConfig(prev => ({
                        ...prev,
                        summaryModel: result.models[0].id,
                        remediationModel: result.models[0].id,
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch Ollama models:', err);
        } finally {
            setFetchingModels(false);
        }
    };

    const fetchVllmModels = async () => {
        if (!config.apiUrl) return;
        setFetchingModels(true);
        try {
            const token = useAuthStore.getState().accessToken;
            const url = new URL('/api/ai/vllm/models', window.location.origin);
            url.searchParams.set('apiUrl', config.apiUrl);
            if (config.apiKey) url.searchParams.set('apiKey', config.apiKey);

            const response = await fetch(url.toString(), {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: 'include',
            });
            const result = await response.json();
            if (result.success && result.models) {
                setVllmModels(result.models);
                if (result.models.length > 0) {
                    setUseCustomVllmModel(false);
                    if (!config.summaryModel) {
                        setConfig(prev => ({
                            ...prev,
                            summaryModel: result.models[0].id,
                            remediationModel: result.models[0].id,
                        }));
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch vLLM models:', err);
        } finally {
            setFetchingModels(false);
        }
    };

    const getAvailableModels = () => {
        if (config.provider === 'ollama' && ollamaModels.length > 0) return ollamaModels;
        if (config.provider === 'vllm' && vllmModels.length > 0 && !useCustomVllmModel) return vllmModels;
        return staticModelsByProvider[config.provider] || [];
    };

    const availableModels = getAvailableModels();
    const needsModelFetch = config.provider === 'ollama' || config.provider === 'vllm';
    const hasModels = config.provider === 'ollama' ? ollamaModels.length > 0 : vllmModels.length > 0;

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
                AI 설정을 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI 설정</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        AI 기반 취약점 요약 및 조치 가이드 설정
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {saved && (
                        <span className="flex items-center gap-2 text-green-600 mr-2">
                            <CheckCircle className="h-5 w-5" />
                            저장됨
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        저장
                    </button>
                </div>
            </div>

            {/* Connection Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${testResult?.success ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">연결 상태</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {testResult?.success ? '연결됨' : '미연결'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">제공자</p>
                            <p className="font-semibold text-slate-900 dark:text-white capitalize">
                                {config.provider}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">선택 모델</p>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[120px]">
                                {config.summaryModel || '-'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.enableAutoSummary ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">자동 요약</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {config.enableAutoSummary ? '활성화' : '비활성화'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
                {[
                    { id: 'provider', label: 'AI 제공자', icon: <Server className="h-4 w-4" /> },
                    { id: 'model', label: '모델 설정', icon: <FileText className="h-4 w-4" /> },
                    { id: 'advanced', label: '고급 설정', icon: <Settings className="h-4 w-4" /> },
                    { id: 'stats', label: '테스트', icon: <Play className="h-4 w-4" /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="max-w-3xl">
                {/* Provider Settings Tab */}
                {activeTab === 'provider' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                AI 제공자 선택
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {providers.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => handleProviderChange(provider.id)}
                                        className={`p-4 rounded-lg border text-left transition-all ${config.provider === provider.id
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-red-500'
                                            }`}
                                    >
                                        <p className={`font-medium ${config.provider === provider.id ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                                            {provider.name}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">{provider.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                API URL
                            </label>
                            <input
                                type="text"
                                value={config.apiUrl || ''}
                                onChange={(e) => handleApiUrlChange(e.target.value)}
                                placeholder="https://api.example.com/v1"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                API Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={config.apiKey || ''}
                                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder={config.provider === 'ollama' ? '(선택사항)' : 'sk-...'}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleTest}
                                disabled={testing || !config.apiUrl}
                                className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                연결 테스트
                            </button>
                            {needsModelFetch && hasModels && (
                                <button
                                    onClick={config.provider === 'ollama' ? fetchOllamaModels : fetchVllmModels}
                                    disabled={fetchingModels || !config.apiUrl}
                                    className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {fetchingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    모델 새로고침
                                </button>
                            )}
                        </div>

                        {testResult && (
                            <div className={`rounded-lg p-4 flex items-center gap-3 ${testResult.success
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                }`}>
                                {testResult.success ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                                {testResult.message}
                            </div>
                        )}

                        {/* Connection Diagnostics Panel */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="h-5 w-5 text-slate-500" />
                                    <h4 className="font-medium text-slate-900 dark:text-white">연결 진단</h4>
                                </div>
                                <button
                                    onClick={handleDiagnose}
                                    disabled={diagnosing}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
                                    진단 실행
                                </button>
                            </div>

                            {diagnosisResult && (
                                <div className="space-y-3">
                                    {/* Connection Status */}
                                    <div className={`rounded-lg p-4 ${diagnosisResult.success
                                        ? 'bg-green-50 dark:bg-green-900/20'
                                        : 'bg-red-50 dark:bg-red-900/20'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {diagnosisResult.success
                                                    ? <CheckCircle className="h-5 w-5 text-green-600" />
                                                    : <AlertCircle className="h-5 w-5 text-red-600" />}
                                                <span className={diagnosisResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                                    {diagnosisResult.message}
                                                </span>
                                            </div>
                                            {diagnosisResult.connection?.responseTimeMs && (
                                                <span className="text-sm text-slate-500">
                                                    응답 시간: {diagnosisResult.connection.responseTimeMs}ms
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Settings Info */}
                                    {diagnosisResult.settings && (
                                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">현재 설정</h5>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="text-slate-500">제공자:</div>
                                                <div className="text-slate-900 dark:text-white capitalize">{diagnosisResult.settings.provider}</div>
                                                <div className="text-slate-500">모델:</div>
                                                <div className="text-slate-900 dark:text-white">{diagnosisResult.settings.model}</div>
                                                <div className="text-slate-500">타임아웃:</div>
                                                <div className="text-slate-900 dark:text-white">{diagnosisResult.settings.timeout}초</div>
                                                {diagnosisResult.connection?.modelCount !== undefined && (
                                                    <>
                                                        <div className="text-slate-500">사용 가능한 모델:</div>
                                                        <div className="text-slate-900 dark:text-white">{diagnosisResult.connection.modelCount}개</div>
                                                    </>
                                                )}
                                                {diagnosisResult.connection?.version && (
                                                    <>
                                                        <div className="text-slate-500">서버 버전:</div>
                                                        <div className="text-slate-900 dark:text-white">{diagnosisResult.connection.version}</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Errors */}
                                    {diagnosisResult.recentErrors && diagnosisResult.recentErrors.length > 0 && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                                            <h5 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                최근 오류 ({diagnosisResult.recentErrors.length}건)
                                            </h5>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {diagnosisResult.recentErrors.map((error, idx) => (
                                                    <div key={idx} className="text-sm p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                                                        <div className="flex justify-between">
                                                            <span className="font-mono text-amber-800 dark:text-amber-300">{error.action}</span>
                                                            <span className="text-amber-600 dark:text-amber-400">{error.durationMs}ms</span>
                                                        </div>
                                                        {error.error && (
                                                            <p className="text-amber-700 dark:text-amber-300 mt-1 text-xs">{error.error}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {diagnosisResult.diagnosedAt && (
                                        <p className="text-xs text-slate-400 text-right">
                                            진단 시간: {new Date(diagnosisResult.diagnosedAt).toLocaleString('ko-KR')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Model Settings Tab */}
                {activeTab === 'model' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">자동 요약 생성</p>
                                <p className="text-sm text-slate-500">스캔 완료 시 취약점 요약을 자동 생성</p>
                            </div>
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, enableAutoSummary: !prev.enableAutoSummary }))}
                                className={`relative w-12 h-6 rounded-full transition-colors ${config.enableAutoSummary ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.enableAutoSummary ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {needsModelFetch && !hasModels && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg p-4 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                먼저 연결 테스트를 실행하여 사용 가능한 모델을 불러오세요.
                            </div>
                        )}

                        {config.provider === 'vllm' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="useCustomVllmModel"
                                    checked={useCustomVllmModel}
                                    onChange={(e) => setUseCustomVllmModel(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                />
                                <label htmlFor="useCustomVllmModel" className="text-sm text-slate-700 dark:text-slate-300">
                                    모델명 직접 입력
                                </label>
                            </div>
                        )}

                        {config.provider === 'vllm' && useCustomVllmModel && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    vLLM 모델명
                                </label>
                                <div className="relative">
                                    <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={customVllmModel}
                                        onChange={(e) => setCustomVllmModel(e.target.value)}
                                        placeholder="예: meta-llama/Llama-2-7b-chat-hf"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                        )}

                        {(availableModels.length > 0 || !needsModelFetch) && !useCustomVllmModel && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        요약 모델
                                    </label>
                                    <select
                                        value={config.summaryModel}
                                        onChange={(e) => setConfig(prev => ({ ...prev, summaryModel: e.target.value }))}
                                        disabled={needsModelFetch && availableModels.length === 0}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white disabled:opacity-50"
                                    >
                                        {availableModels.map((model) => (
                                            <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        조치 가이드 모델
                                    </label>
                                    <select
                                        value={config.remediationModel}
                                        onChange={(e) => setConfig(prev => ({ ...prev, remediationModel: e.target.value }))}
                                        disabled={needsModelFetch && availableModels.length === 0}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white disabled:opacity-50"
                                    >
                                        {availableModels.map((model) => (
                                            <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {config.provider === 'ollama' && ollamaModels.length > 0 && (
                            <p className="text-xs text-slate-500">
                                {ollamaModels.length}개 모델 발견: {ollamaModels.map(m => m.name).join(', ')}
                            </p>
                        )}
                    </div>
                )}

                {/* Advanced Settings Tab */}
                {activeTab === 'advanced' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    최대 토큰 수
                                </label>
                                <input
                                    type="number"
                                    value={config.maxTokens}
                                    onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-500 mt-1">AI 응답의 최대 길이</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Temperature
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={config.temperature}
                                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-500 mt-1">창의성 수준 (0=결정적, 1=창의적)</p>
                            </div>
                        </div>

                        {/* Timeout Configuration */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Timer className="h-5 w-5 text-slate-500" />
                                <h4 className="font-medium text-slate-900 dark:text-white">요청 타임아웃</h4>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">
                                AI 제공자로부터 응답을 기다리는 최대 시간입니다. 로컬 LLM이나 큰 모델을 사용할 경우 더 긴 시간이 필요할 수 있습니다.
                            </p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="30"
                                    max="300"
                                    step="10"
                                    value={config.timeout || 60}
                                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                                />
                                <div className="flex items-center gap-2 min-w-[100px]">
                                    <input
                                        type="number"
                                        min="30"
                                        max="300"
                                        value={config.timeout || 60}
                                        onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 60 }))}
                                        className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-900 dark:text-white text-center"
                                    />
                                    <span className="text-sm text-slate-500">초</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                권장: Ollama/vLLM - 120초, OpenAI/Anthropic - 60초
                            </p>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="font-medium text-slate-900 dark:text-white mb-3">PII 마스킹</h4>
                            <p className="text-sm text-slate-500 mb-3">
                                AI에 전송되는 데이터에서 개인정보를 자동으로 마스킹합니다.
                            </p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-red-600" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">이메일 주소 마스킹</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-red-600" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">IP 주소 마스킹</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-red-600" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">전화번호 마스킹</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Test Tab */}
                {activeTab === 'stats' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white mb-3">빠른 테스트</h4>
                            <p className="text-sm text-slate-500 mb-4">
                                현재 설정으로 AI 응답을 테스트합니다.
                            </p>
                            <textarea
                                value={quickTestPrompt}
                                onChange={(e) => setQuickTestPrompt(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="테스트 프롬프트를 입력하세요..."
                            />
                            <button
                                onClick={handleQuickTest}
                                disabled={quickTesting || !quickTestPrompt}
                                className="mt-3 flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {quickTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                테스트 실행
                            </button>
                        </div>

                        {quickTestResult && (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-3">응답 결과</h4>
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-80 overflow-y-auto">
                                    <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                                        {quickTestResult}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
