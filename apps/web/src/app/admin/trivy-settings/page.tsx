'use client';

import { useState } from 'react';
import {
    Cpu,
    Save,
    RotateCcw,
    CheckCircle,
    AlertTriangle,
    Settings,
    Database,
    FileJson,
    Clock,
} from 'lucide-react';

interface TrivyConfig {
    outputFormat: 'json' | 'table' | 'sarif';
    schemaVersion: number;
    severities: string[];
    ignoreUnfixed: boolean;
    timeout: string;
    cacheDir: string;
    scanners: string[];
}

const defaultConfig: TrivyConfig = {
    outputFormat: 'json',
    schemaVersion: 2,
    severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    ignoreUnfixed: false,
    timeout: '10m',
    cacheDir: '/tmp/trivy-cache',
    scanners: ['vuln', 'secret', 'config'],
};

export default function TrivySettingsPage() {
    const [config, setConfig] = useState<TrivyConfig>(defaultConfig);
    const [saved, setSaved] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    const handleSave = async () => {
        // Mock save
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleReset = () => {
        setConfig(defaultConfig);
    };

    const handleTest = async () => {
        // Mock test
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTestResult('success');
        setTimeout(() => setTestResult(null), 3000);
    };

    const toggleSeverity = (severity: string) => {
        setConfig(prev => ({
            ...prev,
            severities: prev.severities.includes(severity)
                ? prev.severities.filter(s => s !== severity)
                : [...prev.severities, severity]
        }));
    };

    const toggleScanner = (scanner: string) => {
        setConfig(prev => ({
            ...prev,
            scanners: prev.scanners.includes(scanner)
                ? prev.scanners.filter(s => s !== scanner)
                : [...prev.scanners, scanner]
        }));
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trivy 설정</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Trivy 스캐너 동작 설정을 관리합니다
                </p>
            </div>

            {/* Output Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    출력 설정
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            출력 포맷
                        </label>
                        <div className="flex gap-2">
                            {(['json', 'table', 'sarif'] as const).map((format) => (
                                <button
                                    key={format}
                                    onClick={() => setConfig(prev => ({ ...prev, outputFormat: format }))}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${config.outputFormat === format
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    {format.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            스키마 버전
                        </label>
                        <select
                            value={config.schemaVersion}
                            onChange={(e) => setConfig(prev => ({ ...prev, schemaVersion: parseInt(e.target.value) }))}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value={1}>Version 1</option>
                            <option value={2}>Version 2 (권장)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Scan Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    스캔 설정
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            심각도 필터
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].map((severity) => (
                                <button
                                    key={severity}
                                    onClick={() => toggleSeverity(severity)}
                                    className={`px-3 py-1 rounded-lg border text-sm transition-colors ${config.severities.includes(severity)
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    {severity}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            스캐너 유형
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'vuln', label: '취약점' },
                                { id: 'secret', label: '시크릿' },
                                { id: 'config', label: '설정 오류' },
                                { id: 'license', label: '라이선스' },
                            ].map((scanner) => (
                                <button
                                    key={scanner.id}
                                    onClick={() => toggleScanner(scanner.id)}
                                    className={`px-3 py-1 rounded-lg border text-sm transition-colors ${config.scanners.includes(scanner.id)
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    {scanner.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">수정사항 없는 취약점 무시</p>
                            <p className="text-sm text-slate-500">수정 버전이 없는 취약점을 결과에서 제외</p>
                        </div>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, ignoreUnfixed: !prev.ignoreUnfixed }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${config.ignoreUnfixed ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.ignoreUnfixed ? 'translate-x-6' : ''
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Performance Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    성능 설정
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            타임아웃
                        </label>
                        <input
                            type="text"
                            value={config.timeout}
                            onChange={(e) => setConfig(prev => ({ ...prev, timeout: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="10m"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            캐시 경로
                        </label>
                        <input
                            type="text"
                            value={config.cacheDir}
                            onChange={(e) => setConfig(prev => ({ ...prev, cacheDir: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="/tmp/trivy-cache"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {saved && (
                        <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            저장됨
                        </span>
                    )}
                    {testResult === 'success' && (
                        <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            연결 성공
                        </span>
                    )}
                    {testResult === 'error' && (
                        <span className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            연결 실패
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        초기화
                    </button>
                    <button
                        onClick={handleTest}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Cpu className="h-4 w-4" />
                        테스트
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
        </div>
    );
}
