'use client';

import { X, Loader2 } from 'lucide-react';
import { useReportPreview, Report } from '@/lib/api-hooks';

interface ReportPreviewModalProps {
    report: Report | null;
    onClose: () => void;
}

export function ReportPreviewModal({ report, onClose }: ReportPreviewModalProps) {
    const { data: previewData, isLoading } = useReportPreview(report?.id || '');

    if (!report) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            );
        }

        if (!previewData) {
            return (
                <div className="text-center py-12 text-slate-500">
                    미리보기 데이터를 불러올 수 없습니다.
                </div>
            );
        }

        // Summary Section
        if (previewData.summary) {
            return (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">요약</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(previewData.summary as Record<string, any>).map(([key, value]) => (
                                <div key={key} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 capitalize">{key}</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Vulnerabilities */}
                    {previewData.topVulnerabilities && Array.isArray(previewData.topVulnerabilities) && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">주요 취약점</h3>
                            <div className="space-y-2">
                                {(previewData.topVulnerabilities as any[]).slice(0, 10).map((vuln, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            vuln.severity === 'CRITICAL' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                            vuln.severity === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            vuln.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                            {vuln.severity}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{vuln.cveId}</p>
                                            <p className="text-xs text-slate-500 truncate">{vuln.title}</p>
                                        </div>
                                        <span className="text-xs text-slate-500">{vuln.package}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Daily Trend */}
                    {previewData.dailyTrend && Array.isArray(previewData.dailyTrend) && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">일별 트렌드</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-2 text-left">날짜</th>
                                            <th className="px-4 py-2 text-right">전체</th>
                                            <th className="px-4 py-2 text-right">Critical</th>
                                            <th className="px-4 py-2 text-right">High</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {(previewData.dailyTrend as any[]).slice(0, 10).map((day, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2">{day.date}</td>
                                                <td className="px-4 py-2 text-right">{day.total}</td>
                                                <td className="px-4 py-2 text-right">{day.critical}</td>
                                                <td className="px-4 py-2 text-right">{day.high}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    {previewData.projects && Array.isArray(previewData.projects) && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">프로젝트</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-2 text-left">프로젝트명</th>
                                            <th className="px-4 py-2 text-right">스캔 수</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {(previewData.projects as any[]).map((project, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2">{project.name}</td>
                                                <td className="px-4 py-2 text-right">{project.scanCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(previewData, null, 2)}
            </pre>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{report.name}</h2>
                        <p className="text-sm text-slate-500 mt-1">리포트 미리보기</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderContent()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
