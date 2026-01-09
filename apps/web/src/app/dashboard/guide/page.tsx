'use client';

import { useState } from 'react';
import {
    Book,
    Terminal,
    Copy,
    Check,
    Shield,
    Scale,
    Package,
    Upload,
    GitBranch,
    Server,
    FileJson,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';

type TabType = 'overview' | 'trivy-vuln' | 'trivy-license' | 'ci-cd' | 'api';

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{code}</code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
        </div>
    );
}

export default function GuidePage() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    const tabs = [
        { id: 'overview' as const, label: '개요', icon: Book },
        { id: 'trivy-vuln' as const, label: '취약점 스캔', icon: Shield },
        { id: 'trivy-license' as const, label: '라이선스 스캔', icon: Scale },
        { id: 'ci-cd' as const, label: 'CI/CD 연동', icon: GitBranch },
        { id: 'api' as const, label: 'API 연동', icon: Server },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">연동 가이드</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    JASCA와 보안 스캔 도구를 연동하는 방법을 안내합니다
                </p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">JASCA 연동 개요</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                            JASCA는 Trivy를 기반으로 컨테이너 이미지, 파일시스템, Git 저장소의 보안 취약점과 
                            라이선스를 분석합니다.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <Shield className="h-6 w-6 text-red-500 mt-1" />
                                <div>
                                    <h3 className="font-medium text-slate-900 dark:text-white">취약점 스캔</h3>
                                    <p className="text-sm text-slate-500">CVE 기반 보안 취약점 탐지</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <Scale className="h-6 w-6 text-purple-500 mt-1" />
                                <div>
                                    <h3 className="font-medium text-slate-900 dark:text-white">라이선스 스캔</h3>
                                    <p className="text-sm text-slate-500">오픈소스 라이선스 분석</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <GitBranch className="h-6 w-6 text-blue-500 mt-1" />
                                <div>
                                    <h3 className="font-medium text-slate-900 dark:text-white">CI/CD 파이프라인</h3>
                                    <p className="text-sm text-slate-500">GitHub Actions, GitLab CI, Jenkins 연동</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <Server className="h-6 w-6 text-green-500 mt-1" />
                                <div>
                                    <h3 className="font-medium text-slate-900 dark:text-white">REST API</h3>
                                    <p className="text-sm text-slate-500">직접 스캔 결과 업로드</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-900 dark:text-blue-200">Trivy 설치</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    스캔을 실행하려면 먼저 Trivy가 설치되어 있어야 합니다.
                                </p>
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs text-blue-600 font-medium">macOS / Linux:</p>
                                    <CodeBlock code="brew install trivy" />
                                    <p className="text-xs text-blue-600 font-medium mt-2">Windows (Chocolatey):</p>
                                    <CodeBlock code="choco install trivy" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trivy-vuln' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            Trivy 취약점 스캔
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            Trivy를 사용하여 컨테이너 이미지나 파일시스템의 보안 취약점을 스캔하고 JASCA에 업로드합니다.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    1. 컨테이너 이미지 스캔
                                </h3>
                                <CodeBlock code={`# 이미지 취약점 스캔 (JSON 출력)
trivy image --format json --output scan-result.json nginx:latest

# 특정 심각도만 스캔
trivy image --severity CRITICAL,HIGH --format json --output scan-result.json myapp:v1.0`} />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <FileJson className="h-4 w-4" />
                                    2. 파일시스템 스캔
                                </h3>
                                <CodeBlock code={`# 현재 디렉토리 스캔
trivy fs --format json --output scan-result.json .

# Node.js 프로젝트
trivy fs --format json --output scan-result.json ./package-lock.json`} />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    3. JASCA에 결과 업로드
                                </h3>
                                <CodeBlock code={`curl -X POST "https://jasca.example.com/api/scans/upload?projectId=YOUR_PROJECT_ID" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "file=@scan-result.json" \\
  -F "sourceType=TRIVY_JSON"`} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trivy-license' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Scale className="h-5 w-5 text-purple-500" />
                            Trivy 라이선스 스캔
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            Trivy를 사용하여 프로젝트에 포함된 오픈소스 패키지의 라이선스를 분석합니다.
                        </p>

                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                                <div className="text-sm text-purple-700 dark:text-purple-300">
                                    <strong>참고:</strong> JASCA는 업로드된 스캔 결과에서 자동으로 라이선스 정보를 추출합니다.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    1. 이미지 라이선스 스캔
                                </h3>
                                <CodeBlock code={`# 라이선스 포함 전체 스캔 (취약점 + 라이선스)
trivy image --format json --scanners vuln,license --output scan-result.json nginx:latest

# 라이선스만 스캔
trivy image --format json --scanners license --output scan-result.json nginx:latest`} />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <FileJson className="h-4 w-4" />
                                    2. 파일시스템 라이선스 스캔
                                </h3>
                                <CodeBlock code={`# 취약점 + 라이선스 동시 스캔 (권장)
trivy fs --format json --scanners vuln,license --output scan-result.json .

# Python 프로젝트
trivy fs --format json --scanners license --output scan-result.json ./requirements.txt

# Node.js 프로젝트
trivy fs --format json --scanners license --output scan-result.json ./package-lock.json

# Go 프로젝트
trivy fs --format json --scanners license --output scan-result.json ./go.sum`} />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Terminal className="h-4 w-4" />
                                    3. 라이선스 정책 설정 (trivy.yaml)
                                </h3>
                                <CodeBlock code={`# trivy.yaml
license:
  forbidden:
    - AGPL-3.0
    - GPL-3.0
    - SSPL-1.0
  restricted:
    - LGPL-2.1
    - LGPL-3.0
    - MPL-2.0`} language="yaml" />
                                <div className="mt-2">
                                    <CodeBlock code="trivy fs --config trivy.yaml --format json --scanners license --output scan-result.json ." />
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    4. JASCA에 업로드
                                </h3>
                                <CodeBlock code={`curl -X POST "https://jasca.example.com/api/scans/upload?projectId=YOUR_PROJECT_ID" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "file=@scan-result.json" \\
  -F "sourceType=TRIVY_JSON"`} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="font-medium text-slate-900 dark:text-white mb-4">JASCA 라이선스 분류 기준</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="font-medium text-red-700 dark:text-red-400">금지 (Forbidden)</p>
                                <p className="text-xs text-red-600 dark:text-red-300 mt-1">AGPL-3.0, SSPL-1.0</p>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <p className="font-medium text-orange-700 dark:text-orange-400">제한 (Restricted)</p>
                                <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">GPL-2.0, GPL-3.0, LGPL</p>
                            </div>
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <p className="font-medium text-yellow-700 dark:text-yellow-400">상호 (Reciprocal)</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">MPL-2.0, EPL-1.0</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="font-medium text-blue-700 dark:text-blue-400">고지 (Notice)</p>
                                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">Apache-2.0, BSD-3</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="font-medium text-green-700 dark:text-green-400">허용 (Permissive)</p>
                                <p className="text-xs text-green-600 dark:text-green-300 mt-1">MIT, BSD-2, ISC</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                <p className="font-medium text-slate-700 dark:text-slate-300">미확인 (Unknown)</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">분류되지 않은 라이선스</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ci-cd' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <GitBranch className="h-5 w-5 text-blue-500" />
                            CI/CD 파이프라인 연동
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">GitHub Actions</h3>
                                <CodeBlock code={`# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scanners: 'vuln,license'
          format: 'json'
          output: 'trivy-results.json'
      
      - name: Upload to JASCA
        run: |
          curl -X POST "\${{ secrets.JASCA_URL }}/api/scans/upload" \\
            -H "Authorization: Bearer \${{ secrets.JASCA_TOKEN }}" \\
            -F "file=@trivy-results.json" \\
            -F "sourceType=TRIVY_JSON" \\
            -F "projectName=\${{ github.repository }}" \\
            -F "organizationId=\${{ secrets.JASCA_ORG_ID }}"`} language="yaml" />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">GitLab CI</h3>
                                <CodeBlock code={`# .gitlab-ci.yml
security-scan:
  stage: test
  image: aquasec/trivy:latest
  script:
    - trivy fs --format json --scanners vuln,license --output trivy-results.json .
    - |
      curl -X POST "$JASCA_URL/api/scans/upload" \\
        -H "Authorization: Bearer $JASCA_TOKEN" \\
        -F "file=@trivy-results.json" \\
        -F "sourceType=TRIVY_JSON" \\
        -F "projectName=$CI_PROJECT_NAME" \\
        -F "organizationId=$JASCA_ORG_ID"`} language="yaml" />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">Jenkins Pipeline</h3>
                                <CodeBlock code={`// Jenkinsfile
pipeline {
    agent any
    environment {
        JASCA_URL = credentials('jasca-url')
        JASCA_TOKEN = credentials('jasca-token')
    }
    stages {
        stage('Security Scan') {
            steps {
                sh 'trivy fs --format json --scanners vuln,license --output trivy-results.json .'
                sh '''
                    curl -X POST "$JASCA_URL/api/scans/upload" \\
                        -H "Authorization: Bearer $JASCA_TOKEN" \\
                        -F "file=@trivy-results.json" \\
                        -F "sourceType=TRIVY_JSON" \\
                        -F "projectName=$JOB_NAME"
                '''
            }
        }
    }
}`} language="groovy" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'api' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Server className="h-5 w-5 text-green-500" />
                            REST API 연동
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">API 토큰 발급</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    <a href="/dashboard/api-tokens" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                        API 토큰 관리 페이지 <ExternalLink className="h-3 w-3" />
                                    </a>
                                    에서 토큰을 발급받으세요.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">스캔 결과 업로드</h3>
                                <CodeBlock code={`POST /api/scans/upload
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_TOKEN

Parameters:
- file: 스캔 결과 파일 (JSON)
- sourceType: TRIVY_JSON | TRIVY_SARIF
- projectId: 프로젝트 ID (선택)
- projectName: 프로젝트 이름 (선택, 없으면 자동 생성)
- organizationId: 조직 ID (projectName 사용 시 필수)`} />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">스캔 결과 조회</h3>
                                <CodeBlock code={`GET /api/scans?projectId=xxx&limit=20&offset=0
GET /api/scans/:scanId
GET /api/scans/:scanId/compare/:compareScanId`} />
                            </div>

                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white mb-2">라이선스 조회</h3>
                                <CodeBlock code={`GET /api/licenses/stats?projectId=xxx
GET /api/licenses/by-project/:projectId
GET /api/licenses/by-scan/:scanId
GET /api/licenses/tracked?projectId=xxx&classification=FORBIDDEN&limit=20`} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
