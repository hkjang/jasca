'use client';

import { useState } from 'react';
import {
    Bot,
    Sparkles,
    Save,
    AlertTriangle,
    CheckCircle,
    Settings,
    Zap,
    FileText,
} from 'lucide-react';

interface AiConfig {
    summaryModel: string;
    remediationModel: string;
    maxTokens: number;
    temperature: number;
    enableAutoSummary: boolean;
    enableRemediationGuide: boolean;
}

const defaultConfig: AiConfig = {
    summaryModel: 'gpt-4',
    remediationModel: 'gpt-4-turbo',
    maxTokens: 1024,
    temperature: 0.7,
    enableAutoSummary: true,
    enableRemediationGuide: true,
};

const availableModels = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
];

export default function AiSettingsPage() {
    const [config, setConfig] = useState<AiConfig>(defaultConfig);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);

    const handleSave = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTesting(false);
        setTestResult('success');
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI 설정</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    AI 기반 취약점 요약 및 조치 가이드 모델을 설정합니다
                </p>
            </div>

            {/* Summary Model */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    취약점 요약 모델
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">자동 요약 생성</p>
                            <p className="text-sm text-slate-500">스캔 완료 시 취약점 요약을 자동 생성</p>
                        </div>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, enableAutoSummary: !prev.enableAutoSummary }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${config.enableAutoSummary ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.enableAutoSummary ? 'translate-x-6' : ''
                                    }`}
                            />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            요약 모델
                        </label>
                        <select
                            value={config.summaryModel}
                            onChange={(e) => setConfig(prev => ({ ...prev, summaryModel: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            {availableModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} ({model.provider})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Remediation Model */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    조치 가이드 모델
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">조치 가이드 생성</p>
                            <p className="text-sm text-slate-500">취약점별 맞춤 조치 가이드 제공</p>
                        </div>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, enableRemediationGuide: !prev.enableRemediationGuide }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${config.enableRemediationGuide ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.enableRemediationGuide ? 'translate-x-6' : ''
                                    }`}
                            />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            조치 가이드 모델
                        </label>
                        <select
                            value={config.remediationModel}
                            onChange={(e) => setConfig(prev => ({ ...prev, remediationModel: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            {availableModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} ({model.provider})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    고급 설정
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            최대 토큰 수
                        </label>
                        <input
                            type="number"
                            value={config.maxTokens}
                            onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
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
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>
            </div>

            {/* Test */}
            {testResult && (
                <div className={`rounded-lg p-4 flex items-center gap-3 ${testResult === 'success'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                    {testResult === 'success' ? (
                        <>
                            <CheckCircle className="h-5 w-5" />
                            AI 모델 연결 테스트 성공
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="h-5 w-5" />
                            AI 모델 연결 실패
                        </>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                {saved && (
                    <span className="flex items-center gap-2 text-green-600 mr-4">
                        <CheckCircle className="h-5 w-5" />
                        저장됨
                    </span>
                )}
                <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <Zap className="h-4 w-4" />
                    {testing ? '테스트 중...' : '연결 테스트'}
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Save className="h-4 w-4" />
                    저장
                </button>
            </div>
        </div>
    );
}
