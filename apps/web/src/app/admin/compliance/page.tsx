'use client';

import { useState } from 'react';
import {
    Scale,
    CheckCircle,
    AlertTriangle,
    XCircle,
    ExternalLink,
    FileText,
} from 'lucide-react';

interface ComplianceFramework {
    id: string;
    name: string;
    description: string;
    status: 'compliant' | 'partial' | 'non-compliant';
    coverage: number;
    controls: { total: number; passed: number; failed: number };
}

const mockFrameworks: ComplianceFramework[] = [
    {
        id: 'pci-dss',
        name: 'PCI DSS 4.0',
        description: 'Payment Card Industry Data Security Standard',
        status: 'partial',
        coverage: 85,
        controls: { total: 12, passed: 10, failed: 2 },
    },
    {
        id: 'iso-27001',
        name: 'ISO 27001',
        description: 'Information Security Management',
        status: 'compliant',
        coverage: 95,
        controls: { total: 14, passed: 14, failed: 0 },
    },
    {
        id: 'hipaa',
        name: 'HIPAA',
        description: 'Health Insurance Portability and Accountability Act',
        status: 'partial',
        coverage: 72,
        controls: { total: 8, passed: 6, failed: 2 },
    },
    {
        id: 'soc2',
        name: 'SOC 2 Type II',
        description: 'Service Organization Control 2',
        status: 'non-compliant',
        coverage: 45,
        controls: { total: 10, passed: 4, failed: 6 },
    },
];

function getStatusBadge(status: string) {
    const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
        compliant: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '준수' },
        partial: { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: '부분 준수' },
        'non-compliant': { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: '미준수' },
    };
    const { icon, color, label } = config[status] || config.partial;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
            {icon}
            {label}
        </span>
    );
}

export default function CompliancePage() {
    const [frameworks] = useState<ComplianceFramework[]>(mockFrameworks);

    const overallCompliance = Math.round(
        frameworks.reduce((sum, f) => sum + f.coverage, 0) / frameworks.length
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">컴플라이언스</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    규제 프레임워크 준수 현황을 확인합니다
                </p>
            </div>

            {/* Overall Score */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm">전체 컴플라이언스 점수</p>
                        <p className="text-5xl font-bold mt-2">{overallCompliance}%</p>
                        <p className="text-blue-100 mt-2">{frameworks.length}개 프레임워크 평가</p>
                    </div>
                    <div className="w-32 h-32 relative">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="12"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                fill="none"
                                stroke="white"
                                strokeWidth="12"
                                strokeDasharray={`${overallCompliance * 3.52} 352`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <Scale className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10" />
                    </div>
                </div>
            </div>

            {/* Frameworks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {frameworks.map((framework) => (
                    <div
                        key={framework.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">{framework.name}</h3>
                                <p className="text-sm text-slate-500">{framework.description}</p>
                            </div>
                            {getStatusBadge(framework.status)}
                        </div>

                        <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-500">커버리지</span>
                                <span className="font-medium text-slate-900 dark:text-white">{framework.coverage}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${framework.coverage >= 90 ? 'bg-green-500' :
                                            framework.coverage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${framework.coverage}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                                <span className="text-green-600 dark:text-green-400">
                                    ✓ {framework.controls.passed} 통과
                                </span>
                                <span className="text-red-600 dark:text-red-400">
                                    ✗ {framework.controls.failed} 실패
                                </span>
                            </div>
                            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                상세 보기
                                <ExternalLink className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Export */}
            <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <FileText className="h-4 w-4" />
                    컴플라이언스 리포트 다운로드
                </button>
            </div>
        </div>
    );
}
