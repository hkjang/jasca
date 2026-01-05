'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileJson, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUploadScan, useProjects, useOrganizations } from '@/lib/api-hooks';

export default function NewScanPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [sourceType, setSourceType] = useState<'TRIVY_JSON' | 'TRIVY_SARIF' | 'MANUAL'>('TRIVY_JSON');
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { data: projectsData } = useProjects();
    const { data: orgsData } = useOrganizations();
    const uploadMutation = useUploadScan();

    const projects = projectsData?.data || [];
    const organizations = orgsData || [];

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.json') || droppedFile.name.endsWith('.sarif')) {
                setFile(droppedFile);
                setUploadStatus('idle');
                setErrorMessage('');
            } else {
                setErrorMessage('JSON 또는 SARIF 파일만 업로드할 수 있습니다.');
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStatus('idle');
            setErrorMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setErrorMessage('파일을 선택해주세요.');
            return;
        }

        if (!selectedProjectId && !projectName) {
            setErrorMessage('프로젝트를 선택하거나 새 프로젝트 이름을 입력해주세요.');
            return;
        }

        setUploadStatus('uploading');
        setErrorMessage('');

        try {
            await uploadMutation.mutateAsync({
                projectId: selectedProjectId || undefined,
                file,
                metadata: {
                    sourceType,
                    projectName: !selectedProjectId ? projectName : undefined,
                    organizationId: selectedOrgId || undefined,
                },
            });

            setUploadStatus('success');
            setTimeout(() => {
                router.push('/dashboard/scans');
            }, 1500);
        } catch (error: any) {
            setUploadStatus('error');
            setErrorMessage(error.message || '업로드에 실패했습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/scans"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        스캔 목록으로 돌아가기
                    </Link>
                    <h1 className="text-2xl font-bold text-white">새 스캔 업로드</h1>
                    <p className="text-slate-400 mt-2">
                        Trivy 스캔 결과 파일을 업로드하여 취약점을 분석합니다.
                    </p>
                </div>

                {/* Upload Form */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    {/* File Drop Zone */}
                    <div
                        className={`
                            relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
                            ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}
                            ${file ? 'border-green-500 bg-green-500/10' : ''}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".json,.sarif"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        
                        {file ? (
                            <div className="flex flex-col items-center gap-3">
                                <FileJson className="h-12 w-12 text-green-400" />
                                <div>
                                    <p className="text-white font-medium">{file.name}</p>
                                    <p className="text-slate-400 text-sm">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                    }}
                                    className="text-sm text-slate-400 hover:text-white"
                                >
                                    다른 파일 선택
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Upload className="h-12 w-12 text-slate-500" />
                                <div>
                                    <p className="text-white">여기에 파일을 드래그하거나 클릭하여 선택</p>
                                    <p className="text-slate-400 text-sm mt-1">
                                        JSON 또는 SARIF 형식 지원
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Source Type */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            소스 유형
                        </label>
                        <select
                            value={sourceType}
                            onChange={(e) => setSourceType(e.target.value as any)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="TRIVY_JSON">Trivy JSON</option>
                            <option value="TRIVY_SARIF">Trivy SARIF</option>
                            <option value="MANUAL">수동 업로드</option>
                        </select>
                    </div>

                    {/* Project Selection */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            프로젝트
                        </label>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">새 프로젝트 생성</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* New Project Name (if no project selected) */}
                    {!selectedProjectId && (
                        <>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    새 프로젝트 이름
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="예: my-web-app"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    조직
                                </label>
                                <select
                                    value={selectedOrgId}
                                    onChange={(e) => setSelectedOrgId(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">조직 선택 (선택사항)</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>
                                            {org.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-300">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{errorMessage}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {uploadStatus === 'success' && (
                        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-300">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">업로드 완료! 스캔 목록으로 이동합니다...</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploadStatus === 'uploading' || uploadStatus === 'success' || !file}
                        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {uploadStatus === 'uploading' ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                업로드 중...
                            </>
                        ) : uploadStatus === 'success' ? (
                            <>
                                <CheckCircle className="h-5 w-5" />
                                완료
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                스캔 업로드
                            </>
                        )}
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Trivy 스캔 실행 방법</h3>
                    <pre className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded overflow-x-auto">
{`# Docker 이미지 스캔
trivy image --format json --output result.json your-image:tag

# 파일시스템 스캔
trivy fs --format json --output result.json ./your-project`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
