'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Copy,
    Check,
    Eye,
    EyeOff,
    ExternalLink,
    Terminal,
    Container,
    GitBranch,
    Server,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Key,
    Send,
    FileText,
    Shield,
    Info,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';
import { StepNavigator, type Step } from '@/components/ui/step-navigator';
import { useApiTokens, useScans } from '@/lib/api-hooks';
import { AiButton, AiResultPanel } from '@/components/ai';
import { useAiExecution } from '@/hooks/use-ai-execution';
import { useAiStore } from '@/stores/ai-store';

// Types
type Environment = 'local' | 'ci' | 'docker';
type ScanType = 'image' | 'filesystem' | 'repository' | 'config';

interface TransmissionLog {
    id: string;
    timestamp: string;
    status: 'success' | 'error';
    message: string;
}

// Constants
const STEPS: Step[] = [
    { id: 'prepare', title: '사전 준비', description: '프로젝트 및 토큰' },
    { id: 'token', title: 'API 토큰', description: '인증 설정' },
    { id: 'scan', title: 'Trivy 실행', description: '스캔 수행' },
    { id: 'send', title: '결과 전송', description: 'API 호출' },
    { id: 'verify', title: '결과 확인', description: '전송 검증' },
];

const ENVIRONMENTS: { id: Environment; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'local', label: '로컬', icon: Terminal },
    { id: 'ci', label: 'CI/CD', icon: GitBranch },
    { id: 'docker', label: 'Docker', icon: Container },
];

const SCAN_TYPES: { id: ScanType; label: string; description: string }[] = [
    { id: 'image', label: '이미지 스캔', description: 'Docker 이미지 취약점 분석' },
    { id: 'filesystem', label: '파일 시스템', description: '소스코드 디렉터리 분석' },
    { id: 'repository', label: '리포지토리', description: 'Git URL 원격 분석' },
    { id: 'config', label: 'Config Scan', description: 'K8s/Terraform 설정 분석' },
];

// Constants removed - using real API data

export default function TrivyGuidePage() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    // Fetch real tokens and scans from API
    const { data: tokens = [] } = useApiTokens();
    const { data: scansData } = useScans();
    const recentScans = scansData?.results?.slice(0, 5) || [];

    // Get first available token or empty string
    const currentToken = tokens.length > 0 ? tokens[0] : null;
    const tokenDisplay = currentToken ? currentToken.tokenPrefix + '****' : '토큰 없음';
    const fullTokenForCopy = currentToken ? `jasca_${currentToken.tokenPrefix}************` : '';

    // State
    const [currentStep, setCurrentStep] = useState(0);
    const [environment, setEnvironment] = useState<Environment>('local');
    const [scanType, setScanType] = useState<ScanType>('image');
    const [showToken, setShowToken] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);
    const [endpointCopied, setEndpointCopied] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [expandedErrors, setExpandedErrors] = useState<string[]>([]);

    // Refs for section scrolling
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // AI Execution for command generation
    const {
        execute: executeCommandGeneration,
        isLoading: aiLoading,
        result: aiResult,
        previousResults: aiPreviousResults,
        estimateTokens,
        cancel: cancelAi,
        progress: aiProgress,
    } = useAiExecution('guide.trivyCommand');

    const { activePanel, closePanel } = useAiStore();

    const handleAiCommandGeneration = () => {
        const context = {
            screen: 'trivy-guide',
            environment,
            scanType,
            projectId,
            timestamp: new Date().toISOString(),
        };
        executeCommandGeneration(context);
    };

    const handleAiRegenerate = () => {
        handleAiCommandGeneration();
    };

    const estimatedTokens = estimateTokens({
        environment,
        scanType,
    });

    // Get endpoint URL based on environment
    const getEndpointUrl = useCallback(() => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jasca.example.com';
        return `${baseUrl}/api/scans/upload`;
    }, []);

    // Copy handlers
    const handleCopyToken = useCallback(async () => {
        if (fullTokenForCopy) {
            await navigator.clipboard.writeText(fullTokenForCopy);
            setTokenCopied(true);
            setTimeout(() => setTokenCopied(false), 2000);
        }
    }, [fullTokenForCopy]);

    const handleCopyEndpoint = useCallback(async () => {
        await navigator.clipboard.writeText(getEndpointUrl());
        setEndpointCopied(true);
        setTimeout(() => setEndpointCopied(false), 2000);
    }, [getEndpointUrl]);

    // Test transmission handler - actually send sample data to API
    const handleTestTransmission = useCallback(async () => {
        setTestStatus('loading');

        // Sample Trivy scan result
        const sampleTrivyResult = {
            SchemaVersion: 2,
            ArtifactName: 'nginx:latest',
            ArtifactType: 'container_image',
            Metadata: {
                OS: { Family: 'debian', Name: '12' },
                ImageID: 'sha256:sample123',
                RepoTags: ['nginx:latest'],
            },
            Results: [
                {
                    Target: 'nginx:latest (debian 12)',
                    Class: 'os-pkgs',
                    Type: 'debian',
                    Vulnerabilities: [
                        {
                            VulnerabilityID: 'CVE-2024-0001',
                            PkgName: 'libssl3',
                            InstalledVersion: '3.0.11-1',
                            FixedVersion: '3.0.12-1',
                            Severity: 'HIGH',
                            Title: 'Sample vulnerability for testing',
                            Description: 'This is a sample vulnerability for testing JASCA integration.',
                        },
                        {
                            VulnerabilityID: 'CVE-2024-0002',
                            PkgName: 'zlib',
                            InstalledVersion: '1.2.13-1',
                            Severity: 'MEDIUM',
                            Title: 'Another sample vulnerability',
                            Description: 'Another sample vulnerability for testing.',
                        },
                    ],
                },
            ],
        };

        try {
            const token = (await import('@/stores/auth-store')).useAuthStore.getState().accessToken;

            // First, get organizations to find an organizationId
            const orgsResponse = await fetch('/api/organizations', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const organizations = await orgsResponse.json();
            const orgId = organizations?.[0]?.id;

            if (!orgId) {
                console.error('No organization found. Please create an organization first.');
                setTestStatus('error');
                setTimeout(() => setTestStatus('idle'), 5000);
                return;
            }

            const response = await fetch('/api/scans/upload/json', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    metadata: {
                        sourceType: 'TRIVY_JSON',
                        projectName: 'trivy-test-project',
                        organizationId: orgId,
                        imageRef: 'nginx:latest',
                    },
                    result: sampleTrivyResult,
                }),
            });

            if (response.ok) {
                setTestStatus('success');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Upload failed:', errorData);
                setTestStatus('error');
            }
        } catch (err) {
            console.error('Test transmission error:', err);
            setTestStatus('error');
        }

        setTimeout(() => setTestStatus('idle'), 5000);
    }, []);

    // Toggle error section
    const toggleError = (id: string) => {
        setExpandedErrors(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    // Step click handler
    const handleStepClick = (stepIndex: number) => {
        setCurrentStep(stepIndex);
        const stepId = STEPS[stepIndex].id;
        sectionRefs.current[stepId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Generate command examples based on environment and scan type
    const getCommandExample = () => {
        const commands: Record<Environment, Record<ScanType, string>> = {
            local: {
                image: `# Docker 이미지 스캔 (JSON 출력)
trivy image --format json --output result.json nginx:latest

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
                filesystem: `# 파일 시스템 스캔
trivy fs --format json --output result.json ./

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
                repository: `# Git 리포지토리 스캔
trivy repo --format json --output result.json https://github.com/your-org/your-repo

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
                config: `# Kubernetes/Terraform 설정 스캔
trivy config --format json --output result.json ./k8s/

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
            },
            ci: {
                image: `# GitLab CI 예시 (.gitlab-ci.yml)
trivy-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy image --format json --output result.json \${CI_REGISTRY_IMAGE}:\${CI_COMMIT_SHA}
    - |
      curl -X POST "${getEndpointUrl()}" \\
        -H "Authorization: Bearer \${JASCA_TOKEN}" \\
        -H "Content-Type: application/json" \\
        -d @result.json`,
                filesystem: `# Bitbucket Pipelines 예시 (bitbucket-pipelines.yml)
pipelines:
  default:
    - step:
        name: Trivy Scan
        image: aquasec/trivy:latest
        script:
          - trivy fs --format json --output result.json ./
          - |
            curl -X POST "${getEndpointUrl()}" \\
              -H "Authorization: Bearer \${JASCA_TOKEN}" \\
              -H "Content-Type: application/json" \\
              -d @result.json`,
                repository: `# GitHub Actions 예시 (.github/workflows/trivy.yml)
name: Trivy Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy
        run: |
          trivy repo --format json --output result.json .
          curl -X POST "${getEndpointUrl()}" \\
            -H "Authorization: Bearer \${{ secrets.JASCA_TOKEN }}" \\
            -d @result.json`,
                config: `# GitLab CI - Config Scan
config-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy config --format json --output result.json ./terraform/
    - |
      curl -X POST "${getEndpointUrl()}" \\
        -H "Authorization: Bearer \${JASCA_TOKEN}" \\
        -H "Content-Type: application/json" \\
        -d @result.json`,
            },
            docker: {
                image: `# Docker에서 Trivy 실행
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
  -v $(pwd):/output aquasec/trivy:latest \\
  image --format json --output /output/result.json nginx:latest

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
                filesystem: `# Docker에서 파일 시스템 스캔
docker run --rm -v $(pwd):/target -v $(pwd):/output \\
  aquasec/trivy:latest fs --format json \\
  --output /output/result.json /target

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
                repository: `# Docker에서 리포지토리 스캔
docker run --rm -v $(pwd):/output aquasec/trivy:latest \\
  repo --format json --output /output/result.json \\
  https://github.com/your-org/your-repo

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
                config: `# Docker에서 Config 스캔
docker run --rm -v $(pwd)/k8s:/config -v $(pwd):/output \\
  aquasec/trivy:latest config --format json \\
  --output /output/result.json /config

# 결과 전송
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d @result.json`,
            },
        };
        return commands[environment][scanType];
    };

    // Error handling content
    const ERROR_SCENARIOS = [
        {
            id: 'auth',
            title: '인증 실패 (401 Unauthorized)',
            icon: XCircle,
            color: 'red',
            content: `# 에러 응답 예시
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}

# 해결 방법
# 1. 토큰이 올바르게 설정되었는지 확인
echo $JASCA_TOKEN

# 2. 토큰 만료 여부 확인 (대시보드에서 확인)
# 3. 새 토큰 발급 필요시 API 토큰 페이지에서 재발급`,
        },
        {
            id: 'format',
            title: '포맷 오류 (400 Bad Request)',
            icon: AlertTriangle,
            color: 'yellow',
            content: `# 에러 응답 예시
{
  "statusCode": 400,
  "message": "Invalid JSON format: Expected Trivy JSON or SARIF schema"
}

# 해결 방법
# Trivy 출력 형식 확인 - JSON 또는 SARIF만 지원
trivy image --format json nginx:latest  # JSON 형식
trivy image --format sarif nginx:latest  # SARIF 형식

# table 형식은 지원되지 않습니다
# trivy image --format table nginx:latest  # ❌ 지원 안됨`,
        },
        {
            id: 'duplicate',
            title: '중복 전송 (409 Conflict)',
            icon: RefreshCw,
            color: 'blue',
            content: `# 에러 응답 예시
{
  "statusCode": 409,
  "message": "Scan result already exists",
  "existingScanId": "scan_abc123"
}

# 해결 방법
# 기존 스캔 결과 확인
# 대시보드에서 해당 스캔 ID로 검색 가능

# 강제 재전송이 필요한 경우 --force 옵션 사용
curl -X POST "${getEndpointUrl()}" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -H "X-Force-Upload: true" \\
  -d @result.json`,
        },
        {
            id: 'server',
            title: '서버 오류 (500 Internal Server Error)',
            icon: Server,
            color: 'red',
            content: `# 에러 응답 예시
{
  "statusCode": 500,
  "message": "Internal server error"
}

# 해결 방법: 재시도 로직 구현
for i in 1 2 3; do
  response=$(curl -s -w "%{http_code}" -o /tmp/response.json \\
    -X POST "${getEndpointUrl()}" \\
    -H "Authorization: Bearer \${JASCA_TOKEN}" \\
    -d @result.json)
  
  if [ "$response" = "200" ]; then
    echo "전송 성공"
    break
  fi
  
  echo "시도 $i 실패, 5초 후 재시도..."
  sleep 5
done`,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/settings"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Trivy 연동 가이드
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Trivy 진단 결과를 JASCA로 전송하는 방법을 안내합니다
                    </p>
                </div>
                <AiButton
                    action="guide.trivyCommand"
                    variant="primary"
                    size="md"
                    estimatedTokens={estimatedTokens}
                    loading={aiLoading}
                    onExecute={handleAiCommandGeneration}
                    onCancel={cancelAi}
                />
            </div>

            {/* Target Users */}
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4" /> 보안 담당자
                </span>
                <span className="flex items-center gap-1">
                    <Terminal className="h-4 w-4" /> DevOps 엔지니어
                </span>
                <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" /> 개발자
                </span>
            </div>

            {/* Overview Card */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    연동 개요
                </h3>
                <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
                    {['사이드바 메뉴', 'Trivy 연동', 'API 토큰 확인', 'Trivy 실행', '결과 전송', '수집 API', '결과 저장', '프로젝트 화면'].map((step, index) => (
                        <div key={index} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${index < 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                    index < 6 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                        'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className="text-xs text-slate-600 dark:text-slate-400 mt-2 whitespace-nowrap">
                                    {step}
                                </span>
                            </div>
                            {index < 7 && <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700 mx-1" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Navigator */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <StepNavigator
                    steps={STEPS}
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                />
            </div>

            {/* Section 1: Preparation */}
            <div
                ref={(el) => { sectionRefs.current['prepare'] = el }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm">1</span>
                    사전 준비
                </h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">프로젝트 생성</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                JASCA에서 스캔 결과를 수집할 프로젝트가 필요합니다.
                                {projectId && <span className="ml-2 text-blue-600">현재 선택: {projectId}</span>}
                            </p>
                            <Link
                                href="/dashboard/projects"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
                            >
                                프로젝트 관리 <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Trivy 설치</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                최신 버전의 Trivy가 설치되어 있어야 합니다.
                            </p>
                            <a
                                href="https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
                            >
                                Trivy 설치 가이드 <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: API Token */}
            <div
                ref={(el) => { sectionRefs.current['token'] = el }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm">2</span>
                    API 토큰 확인
                </h3>

                <div className="space-y-4">
                    {/* Token Display */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            API 토큰
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm">
                                <Key className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    {currentToken ? (showToken ? fullTokenForCopy : tokenDisplay) : '토큰이 없습니다. API 토큰 페이지에서 생성하세요.'}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowToken(!showToken)}
                                className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                aria-label={showToken ? '토큰 숨기기' : '토큰 보기'}
                            >
                                {showToken ? <EyeOff className="h-5 w-5 text-slate-600" /> : <Eye className="h-5 w-5 text-slate-600" />}
                            </button>
                            <button
                                onClick={handleCopyToken}
                                className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {tokenCopied ? (
                                    <><Check className="h-4 w-4 text-green-500" /><span className="text-sm text-green-600">복사됨</span></>
                                ) : (
                                    <><Copy className="h-4 w-4 text-slate-600" /><span className="text-sm text-slate-600 dark:text-slate-400">복사</span></>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            토큰이 없거나 만료된 경우{' '}
                            <Link href="/dashboard/api-tokens" className="text-blue-600 hover:underline">
                                API 토큰 페이지
                            </Link>
                            에서 새로 발급하세요.
                        </p>
                    </div>

                    {/* Endpoint URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            수집 엔드포인트
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm text-slate-700 dark:text-slate-300 overflow-x-auto">
                                {getEndpointUrl()}
                            </div>
                            <button
                                onClick={handleCopyEndpoint}
                                className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {endpointCopied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4 text-slate-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Security Warning */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">보안 권장 사항</p>
                            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                API 토큰은 환경 변수로 관리하세요. 코드나 CI/CD 설정에 직접 노출하지 마세요.
                            </p>
                            <CodeBlock
                                code={`# 환경 변수 설정
export JASCA_TOKEN="YOUR_API_TOKEN_HERE"`}
                                language="bash"
                                showLineNumbers={false}
                                className="mt-3"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Trivy Scan */}
            <div
                ref={(el) => { sectionRefs.current['scan'] = el }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm">3</span>
                    Trivy 실행
                </h3>

                {/* Environment Tabs */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        실행 환경 선택
                    </label>
                    <div className="flex gap-2">
                        {ENVIRONMENTS.map((env) => (
                            <button
                                key={env.id}
                                onClick={() => setEnvironment(env.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${environment === env.id
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <env.icon className="h-4 w-4" />
                                {env.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scan Type Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        스캔 유형
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {SCAN_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setScanType(type.id)}
                                className={`p-3 rounded-lg border text-left transition-colors ${scanType === type.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <p className={`font-medium text-sm ${scanType === type.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'
                                    }`}>
                                    {type.label}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {type.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Command Example */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            명령어 예시
                        </label>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                {ENVIRONMENTS.find(e => e.id === environment)?.label}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                {SCAN_TYPES.find(t => t.id === scanType)?.label}
                            </span>
                        </div>
                    </div>
                    <CodeBlock
                        code={getCommandExample()}
                        language={environment === 'ci' ? 'yaml' : 'bash'}
                        showLineNumbers={true}
                    />
                </div>

                {/* Output Format Note */}
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>출력 형식:</strong> JASCA는 Trivy의 <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">--format json</code> 또는{' '}
                        <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">--format sarif</code> 형식을 지원합니다.
                    </p>
                </div>
            </div>

            {/* Section 4: Send Results */}
            <div
                ref={(el) => { sectionRefs.current['send'] = el }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm">4</span>
                    결과 전송
                </h3>

                <div className="space-y-4">
                    {/* Pipe Method */}
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2">방법 1: Pipe로 직접 전송</h4>
                        <CodeBlock
                            code={`trivy image --format json nginx:latest | \\
  curl -X POST "${getEndpointUrl()}" \\
    -H "Authorization: Bearer \${JASCA_TOKEN}" \\
    -H "Content-Type: application/json" \\
    -d @-`}
                            language="bash"
                            showLineNumbers={true}
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2">방법 2: 파일 업로드</h4>
                        <CodeBlock
                            code={`# multipart/form-data로 파일 업로드
curl -X POST "${getEndpointUrl()}/file" \\
  -H "Authorization: Bearer \${JASCA_TOKEN}" \\
  -F "file=@result.json" \\
  -F "projectId=${projectId || 'YOUR_PROJECT_ID'}"`}
                            language="bash"
                            showLineNumbers={true}
                        />
                    </div>

                    {/* Test Transmission */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-3">테스트 전송</h4>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleTestTransmission}
                                disabled={testStatus === 'loading'}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${testStatus === 'loading'
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                {testStatus === 'loading' ? (
                                    <><RefreshCw className="h-4 w-4 animate-spin" /> 전송 중...</>
                                ) : (
                                    <><Send className="h-4 w-4" /> 샘플 결과 전송</>
                                )}
                            </button>
                            {testStatus === 'success' && (
                                <span className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" /> 전송 성공!
                                </span>
                            )}
                            {testStatus === 'error' && (
                                <span className="flex items-center gap-2 text-red-600">
                                    <XCircle className="h-5 w-5" /> 전송 실패
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            샘플 Trivy 결과를 전송하여 연동이 올바르게 설정되었는지 확인합니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* Section 5: Verify */}
            <div
                ref={(el) => { sectionRefs.current['verify'] = el }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm">5</span>
                    결과 확인
                </h3>

                <div className="space-y-4">
                    {/* Success Response */}
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2">성공 응답 예시</h4>
                        <CodeBlock
                            code={`{
  "success": true,
  "scanId": "scan_abc123xyz",
  "vulnerabilities": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "message": "Scan result uploaded successfully"
}`}
                            language="json"
                            showLineNumbers={true}
                        />
                    </div>

                    {/* Recent Logs */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-900 dark:text-white">최근 전송 로그</h4>
                            <Link
                                href="/dashboard/scans"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                                전체 로그 보기 <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            {recentScans.length > 0 ? recentScans.map((scan) => (
                                <div
                                    key={scan.id}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                                >
                                    {scan.status === 'COMPLETED' ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    ) : scan.status === 'FAILED' ? (
                                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 text-blue-500 flex-shrink-0 animate-spin" />
                                    )}
                                    <span className="text-xs text-slate-500 w-36 flex-shrink-0">
                                        {new Date(scan.startedAt).toLocaleString('ko-KR')}
                                    </span>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                        {scan.targetName} ({scan.scanType})
                                    </span>
                                </div>
                            )) : (
                                <div className="p-4 text-center text-slate-500 text-sm">
                                    최근 스캔 기록이 없습니다
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Handling */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    에러 처리
                </h3>

                <div className="space-y-3">
                    {ERROR_SCENARIOS.map((scenario) => (
                        <div key={scenario.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleError(scenario.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <scenario.icon className={`h-5 w-5 ${scenario.color === 'red' ? 'text-red-500' :
                                        scenario.color === 'yellow' ? 'text-yellow-500' :
                                            'text-blue-500'
                                        }`} />
                                    <span className="font-medium text-slate-900 dark:text-white">{scenario.title}</span>
                                </div>
                                {expandedErrors.includes(scenario.id) ? (
                                    <ChevronUp className="h-5 w-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                )}
                            </button>
                            {expandedErrors.includes(scenario.id) && (
                                <div className="px-4 pb-4">
                                    <CodeBlock
                                        code={scenario.content}
                                        language="bash"
                                        showLineNumbers={true}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/dashboard/api-tokens"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                    <Key className="h-8 w-8 text-blue-500" />
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">토큰 관리</p>
                        <p className="text-sm text-slate-500">API 토큰 발급/관리</p>
                    </div>
                </Link>
                <Link
                    href="/dashboard/scans"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">스캔 결과</p>
                        <p className="text-sm text-slate-500">전송된 스캔 결과 확인</p>
                    </div>
                </Link>
                <Link
                    href="/dashboard/projects"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                    <Shield className="h-8 w-8 text-purple-500" />
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">프로젝트</p>
                        <p className="text-sm text-slate-500">프로젝트 관리</p>
                    </div>
                </Link>
            </div>

            {/* AI Result Panel */}
            <AiResultPanel
                isOpen={activePanel?.key === 'guide.trivyCommand'}
                onClose={closePanel}
                result={aiResult}
                previousResults={aiPreviousResults}
                loading={aiLoading}
                loadingProgress={aiProgress}
                onRegenerate={handleAiRegenerate}
                action="guide.trivyCommand"
            />
        </div>
    );
}
