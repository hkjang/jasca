'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Code,
    Play,
    Copy,
    Check,
    ChevronRight,
    ChevronDown,
    Key,
    Lock,
    ExternalLink,
    Search,
    Clock,
    Trash2,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Info,
    Terminal,
    FileCode,
    Star,
    Download,
    Maximize2,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';

// API Endpoint interface based on OpenAPI spec
interface ApiParameter {
    name: string;
    in: 'query' | 'path' | 'header' | 'body';
    required: boolean;
    type?: string;
    description?: string;
    schema?: Record<string, unknown>;
}

interface ApiEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    summary: string;
    description?: string;
    tags: string[];
    parameters: ApiParameter[];
    requestBody?: {
        description?: string;
        content?: Record<string, { schema: Record<string, unknown> }>;
    };
    responses?: Record<string, { description: string; content?: Record<string, unknown> }>;
    security?: Array<Record<string, string[]>>;
}

interface RequestHistory {
    id: string;
    timestamp: Date;
    method: string;
    path: string;
    status: number;
    duration: number;
}

// Pre-defined API endpoints from controller analysis
const API_ENDPOINTS: ApiEndpoint[] = [
    // Auth endpoints
    { path: '/api/auth/register', method: 'POST', summary: '사용자 등록', tags: ['Auth'], parameters: [], security: [] },
    { path: '/api/auth/login', method: 'POST', summary: '로그인', tags: ['Auth'], parameters: [], security: [] },
    { path: '/api/auth/refresh', method: 'POST', summary: '토큰 갱신', tags: ['Auth'], parameters: [], security: [] },
    { path: '/api/auth/logout', method: 'POST', summary: '로그아웃', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/logout-all', method: 'POST', summary: '모든 세션 로그아웃', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/mfa/setup', method: 'POST', summary: 'MFA 설정', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/mfa/enable', method: 'POST', summary: 'MFA 활성화', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/mfa/disable', method: 'POST', summary: 'MFA 비활성화', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/mfa/status', method: 'GET', summary: 'MFA 상태 조회', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/sessions', method: 'GET', summary: '세션 목록 조회', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/sessions/{id}', method: 'DELETE', summary: '세션 삭제', tags: ['Auth'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/password', method: 'PUT', summary: '비밀번호 변경', tags: ['Auth'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/auth/login-history', method: 'GET', summary: '로그인 기록 조회', tags: ['Auth'], parameters: [{ name: 'limit', in: 'query', required: false, type: 'number' }, { name: 'offset', in: 'query', required: false, type: 'number' }], security: [{ BearerAuth: [] }] },

    // Scans endpoints
    { path: '/api/scans', method: 'GET', summary: '스캔 결과 목록 조회', tags: ['Scans'], parameters: [{ name: 'projectId', in: 'query', required: false, type: 'string' }, { name: 'limit', in: 'query', required: false, type: 'number' }, { name: 'offset', in: 'query', required: false, type: 'number' }], security: [{ BearerAuth: [] }] },
    { path: '/api/scans/{id}', method: 'GET', summary: '스캔 결과 상세 조회', tags: ['Scans'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/scans/upload', method: 'POST', summary: 'Trivy 스캔 결과 업로드 (JSON)', tags: ['Scans'], parameters: [{ name: 'projectId', in: 'query', required: false, type: 'string' }, { name: 'projectName', in: 'query', required: false, type: 'string' }, { name: 'organizationId', in: 'query', required: false, type: 'string' }], security: [{ BearerAuth: [] }, { ApiKey: [] }] },
    { path: '/api/scans/upload/file', method: 'POST', summary: 'Trivy 스캔 결과 업로드 (파일)', tags: ['Scans'], parameters: [{ name: 'projectId', in: 'query', required: false, type: 'string' }], security: [{ BearerAuth: [] }, { ApiKey: [] }] },
    { path: '/api/scans/{id}', method: 'DELETE', summary: '스캔 결과 삭제', tags: ['Scans'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/scans/{id}/compare/{compareId}', method: 'GET', summary: '스캔 결과 비교', tags: ['Scans'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }, { name: 'compareId', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Projects endpoints
    { path: '/api/projects', method: 'GET', summary: '프로젝트 목록 조회', tags: ['Projects'], parameters: [{ name: 'organizationId', in: 'query', required: false, type: 'string' }, { name: 'limit', in: 'query', required: false, type: 'number' }, { name: 'offset', in: 'query', required: false, type: 'number' }, { name: 'search', in: 'query', required: false, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/projects/{id}', method: 'GET', summary: '프로젝트 상세 조회', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/projects', method: 'POST', summary: '프로젝트 생성', tags: ['Projects'], parameters: [{ name: 'organizationId', in: 'query', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/projects/{id}', method: 'PUT', summary: '프로젝트 수정', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/projects/{id}', method: 'DELETE', summary: '프로젝트 삭제', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/projects/{id}/vulnerability-trend', method: 'GET', summary: '취약점 트렌드 조회', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }, { name: 'days', in: 'query', required: false, type: 'number' }], security: [{ BearerAuth: [] }] },

    // Organizations endpoints
    { path: '/api/organizations', method: 'GET', summary: '조직 목록 조회', tags: ['Organizations'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/organizations/{id}', method: 'GET', summary: '조직 상세 조회', tags: ['Organizations'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/organizations', method: 'POST', summary: '조직 생성', tags: ['Organizations'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/organizations/{id}', method: 'PUT', summary: '조직 수정', tags: ['Organizations'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/organizations/{id}', method: 'DELETE', summary: '조직 삭제', tags: ['Organizations'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Users endpoints
    { path: '/api/users', method: 'GET', summary: '사용자 목록 조회', tags: ['Users'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/users/{id}', method: 'GET', summary: '사용자 상세 조회', tags: ['Users'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/users/{id}', method: 'PUT', summary: '사용자 수정', tags: ['Users'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/users/{id}', method: 'DELETE', summary: '사용자 삭제', tags: ['Users'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/users/me', method: 'GET', summary: '내 정보 조회', tags: ['Users'], parameters: [], security: [{ BearerAuth: [] }] },

    // Vulnerabilities endpoints
    { path: '/api/vulnerabilities', method: 'GET', summary: '취약점 목록 조회', tags: ['Vulnerabilities'], parameters: [{ name: 'severity', in: 'query', required: false, type: 'string' }, { name: 'status', in: 'query', required: false, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/vulnerabilities/{id}', method: 'GET', summary: '취약점 상세 조회', tags: ['Vulnerabilities'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/vulnerabilities/{id}/status', method: 'PUT', summary: '취약점 상태 변경', tags: ['Vulnerabilities'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Licenses endpoints
    { path: '/api/licenses', method: 'GET', summary: '라이선스 목록 조회', tags: ['Licenses'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/licenses/{id}', method: 'GET', summary: '라이선스 상세 조회', tags: ['Licenses'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Policies endpoints
    { path: '/api/policies', method: 'GET', summary: '정책 목록 조회', tags: ['Policies'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/policies/{id}', method: 'GET', summary: '정책 상세 조회', tags: ['Policies'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/policies', method: 'POST', summary: '정책 생성', tags: ['Policies'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/policies/{id}', method: 'PUT', summary: '정책 수정', tags: ['Policies'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/policies/{id}', method: 'DELETE', summary: '정책 삭제', tags: ['Policies'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Reports endpoints
    { path: '/api/reports', method: 'GET', summary: '리포트 목록 조회', tags: ['Reports'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/reports/{id}', method: 'GET', summary: '리포트 상세 조회', tags: ['Reports'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/reports', method: 'POST', summary: '리포트 생성', tags: ['Reports'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/reports/{id}/download', method: 'GET', summary: '리포트 다운로드', tags: ['Reports'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Stats endpoints
    { path: '/api/stats/dashboard', method: 'GET', summary: '대시보드 통계', tags: ['Stats'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/stats/vulnerabilities', method: 'GET', summary: '취약점 통계', tags: ['Stats'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/stats/trends', method: 'GET', summary: '트렌드 통계', tags: ['Stats'], parameters: [{ name: 'days', in: 'query', required: false, type: 'number' }], security: [{ BearerAuth: [] }] },

    // AI endpoints
    { path: '/api/ai/analyze', method: 'POST', summary: 'AI 분석', tags: ['AI'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/ai/settings', method: 'GET', summary: 'AI 설정 조회', tags: ['AI'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/ai/settings', method: 'PUT', summary: 'AI 설정 수정', tags: ['AI'], parameters: [], security: [{ BearerAuth: [] }] },

    // API Tokens endpoints
    { path: '/api/api-tokens', method: 'GET', summary: 'API 토큰 목록 조회', tags: ['API Tokens'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/api-tokens', method: 'POST', summary: 'API 토큰 생성', tags: ['API Tokens'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/api-tokens/{id}', method: 'DELETE', summary: 'API 토큰 삭제', tags: ['API Tokens'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Audit endpoints
    { path: '/api/audit', method: 'GET', summary: '감사 로그 조회', tags: ['Audit'], parameters: [{ name: 'limit', in: 'query', required: false, type: 'number' }, { name: 'offset', in: 'query', required: false, type: 'number' }], security: [{ BearerAuth: [] }] },

    // Notifications endpoints
    { path: '/api/notifications', method: 'GET', summary: '알림 목록 조회', tags: ['Notifications'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/notifications/{id}/read', method: 'PUT', summary: '알림 읽음 처리', tags: ['Notifications'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Exceptions endpoints
    { path: '/api/exceptions', method: 'GET', summary: '예외 목록 조회', tags: ['Exceptions'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/exceptions/{id}', method: 'GET', summary: '예외 상세 조회', tags: ['Exceptions'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/exceptions', method: 'POST', summary: '예외 생성', tags: ['Exceptions'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/exceptions/{id}/approve', method: 'POST', summary: '예외 승인', tags: ['Exceptions'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },
    { path: '/api/exceptions/{id}/reject', method: 'POST', summary: '예외 거부', tags: ['Exceptions'], parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }], security: [{ BearerAuth: [] }] },

    // Compliance endpoints
    { path: '/api/compliance/check', method: 'POST', summary: '컴플라이언스 검사', tags: ['Compliance'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/compliance/reports', method: 'GET', summary: '컴플라이언스 리포트 조회', tags: ['Compliance'], parameters: [], security: [{ BearerAuth: [] }] },

    // Settings endpoints
    { path: '/api/settings', method: 'GET', summary: '설정 조회', tags: ['Settings'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/settings', method: 'PUT', summary: '설정 수정', tags: ['Settings'], parameters: [], security: [{ BearerAuth: [] }] },

    // Trivy DB endpoints
    { path: '/api/trivy-db/status', method: 'GET', summary: 'Trivy DB 상태 조회', tags: ['Trivy DB'], parameters: [], security: [{ BearerAuth: [] }] },
    { path: '/api/trivy-db/update', method: 'POST', summary: 'Trivy DB 업데이트', tags: ['Trivy DB'], parameters: [], security: [{ BearerAuth: [] }] },
];

// API Categories
const API_CATEGORIES = [
    { name: 'Auth', icon: Lock, description: '인증 및 권한' },
    { name: 'Scans', icon: Code, description: '스캔 관리' },
    { name: 'Projects', icon: Code, description: '프로젝트 관리' },
    { name: 'Organizations', icon: Code, description: '조직 관리' },
    { name: 'Users', icon: Code, description: '사용자 관리' },
    { name: 'Vulnerabilities', icon: AlertCircle, description: '취약점 관리' },
    { name: 'Licenses', icon: Code, description: '라이선스 관리' },
    { name: 'Policies', icon: Code, description: '정책 관리' },
    { name: 'Reports', icon: Code, description: '리포트 관리' },
    { name: 'Stats', icon: Code, description: '통계' },
    { name: 'AI', icon: Code, description: 'AI 분석' },
    { name: 'API Tokens', icon: Key, description: 'API 토큰 관리' },
    { name: 'Audit', icon: Code, description: '감사 로그' },
    { name: 'Notifications', icon: Code, description: '알림' },
    { name: 'Exceptions', icon: Code, description: '예외 관리' },
    { name: 'Compliance', icon: Code, description: '컴플라이언스' },
    { name: 'Settings', icon: Code, description: '설정' },
    { name: 'Trivy DB', icon: Code, description: 'Trivy 데이터베이스' },
];

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function ApiExplorerPage() {
    const { accessToken } = useAuthStore();
    const [selectedCategory, setSelectedCategory] = useState<string>('Auth');
    const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Auth']));

    // Request state
    const [authType, setAuthType] = useState<'bearer' | 'apikey'>('bearer');
    const [apiKey, setApiKey] = useState('');
    const [pathParams, setPathParams] = useState<Record<string, string>>({});
    const [queryParams, setQueryParams] = useState<Record<string, string>>({});
    const [requestBody, setRequestBody] = useState('{\n  \n}');
    const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});

    // Response state
    const [response, setResponse] = useState<{
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: unknown;
        duration: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);

    // New feature states
    const [rightPanelTab, setRightPanelTab] = useState<'response' | 'code' | 'history'>('response');
    const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('api-explorer-favorites');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    // Clipboard state
    const [copiedToken, setCopiedToken] = useState(false);

    // Save favorites to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('api-explorer-favorites', JSON.stringify([...favorites]));
        }
    }, [favorites]);

    // Generate endpoint key for favorites
    const getEndpointKey = (endpoint: ApiEndpoint) => `${endpoint.method}:${endpoint.path}`;

    // Toggle favorite
    const toggleFavorite = (endpoint: ApiEndpoint) => {
        const key = getEndpointKey(endpoint);
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // Build URL function - must be before code generation functions
    const buildUrl = useCallback((endpoint: ApiEndpoint) => {
        let url = endpoint.path;

        // Replace path parameters
        Object.entries(pathParams).forEach(([key, value]) => {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        });

        // Add query parameters
        const queryEntries = Object.entries(queryParams).filter(([, v]) => v);
        if (queryEntries.length > 0) {
            const params = new URLSearchParams();
            queryEntries.forEach(([k, v]) => params.append(k, v));
            url += '?' + params.toString();
        }

        return url;
    }, [pathParams, queryParams]);

    // Code generation functions
    const generateCurl = useCallback(() => {
        if (!selectedEndpoint) return '';
        const url = buildUrl(selectedEndpoint);
        const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`;
        
        let curl = `curl -X ${selectedEndpoint.method} "${fullUrl}"`;
        
        // Add headers
        curl += ` \\\n  -H "Content-Type: application/json"`;
        if (authType === 'bearer' && accessToken) {
            curl += ` \\\n  -H "Authorization: Bearer ${accessToken}"`;
        } else if (authType === 'apikey' && apiKey) {
            curl += ` \\\n  -H "X-API-Key: ${apiKey}"`;
        }
        
        // Add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && requestBody.trim() !== '{\n  \n}') {
            try {
                const parsed = JSON.parse(requestBody);
                curl += ` \\\n  -d '${JSON.stringify(parsed)}'`;
            } catch {
                curl += ` \\\n  -d '${requestBody.replace(/'/g, "\\'")}'`;
            }
        }
        
        return curl;
    }, [selectedEndpoint, buildUrl, authType, accessToken, apiKey, requestBody]);

    const generateJavaScript = useCallback(() => {
        if (!selectedEndpoint) return '';
        const url = buildUrl(selectedEndpoint);
        
        let code = `const response = await fetch("${url}", {\n`;
        code += `  method: "${selectedEndpoint.method}",\n`;
        code += `  headers: {\n`;
        code += `    "Content-Type": "application/json",\n`;
        
        if (authType === 'bearer') {
            code += `    "Authorization": "Bearer <YOUR_TOKEN>",\n`;
        } else if (authType === 'apikey') {
            code += `    "X-API-Key": "<YOUR_API_KEY>",\n`;
        }
        code += `  },\n`;
        
        if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
            code += `  body: JSON.stringify(${requestBody}),\n`;
        }
        code += `});\n\nconst data = await response.json();\nconsole.log(data);`;
        
        return code;
    }, [selectedEndpoint, buildUrl, authType, requestBody]);

    const generatePython = useCallback(() => {
        if (!selectedEndpoint) return '';
        const url = buildUrl(selectedEndpoint);
        
        let code = `import requests\n\n`;
        code += `url = "${url}"\n`;
        code += `headers = {\n`;
        code += `    "Content-Type": "application/json",\n`;
        
        if (authType === 'bearer') {
            code += `    "Authorization": "Bearer <YOUR_TOKEN>",\n`;
        } else if (authType === 'apikey') {
            code += `    "X-API-Key": "<YOUR_API_KEY>",\n`;
        }
        code += `}\n\n`;
        
        if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
            code += `data = ${requestBody}\n\n`;
            code += `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers, json=data)\n`;
        } else {
            code += `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers)\n`;
        }
        code += `print(response.json())`;
        
        return code;
    }, [selectedEndpoint, buildUrl, authType, requestBody]);

    const currentCode = useMemo(() => {
        switch (codeLanguage) {
            case 'curl': return generateCurl();
            case 'javascript': return generateJavaScript();
            case 'python': return generatePython();
            default: return '';
        }
    }, [codeLanguage, generateCurl, generateJavaScript, generatePython]);

    const copyCode = async () => {
        await navigator.clipboard.writeText(currentCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // URL Preview
    const urlPreview = useMemo(() => {
        if (!selectedEndpoint) return '';
        return buildUrl(selectedEndpoint);
    }, [selectedEndpoint, buildUrl]);

    const filteredEndpoints = API_ENDPOINTS.filter(endpoint => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return endpoint.path.toLowerCase().includes(query) ||
                endpoint.summary.toLowerCase().includes(query) ||
                endpoint.tags.some(tag => tag.toLowerCase().includes(query));
        }
        return endpoint.tags.includes(selectedCategory);
    });

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
        setSelectedCategory(category);
    };

    const handleCopyToken = useCallback(async () => {
        if (accessToken) {
            await navigator.clipboard.writeText(accessToken);
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        }
    }, [accessToken]);

    const handleSendRequest = async () => {
        if (!selectedEndpoint) return;

        setIsLoading(true);
        const startTime = Date.now();

        try {
            const url = buildUrl(selectedEndpoint);
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...customHeaders,
            };

            if (authType === 'bearer' && accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            } else if (authType === 'apikey' && apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            const options: RequestInit = {
                method: selectedEndpoint.method,
                headers,
            };

            if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && requestBody.trim()) {
                try {
                    options.body = JSON.stringify(JSON.parse(requestBody));
                } catch {
                    options.body = requestBody;
                }
            }

            const res = await fetch(url, options);
            const duration = Date.now() - startTime;

            const responseHeaders: Record<string, string> = {};
            res.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            let body: unknown;
            const contentType = res.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                body = await res.json();
            } else {
                body = await res.text();
            }

            setResponse({
                status: res.status,
                statusText: res.statusText,
                headers: responseHeaders,
                body,
                duration,
            });

            // Add to history
            setRequestHistory(prev => [{
                id: Date.now().toString(),
                timestamp: new Date(),
                method: selectedEndpoint.method,
                path: url,
                status: res.status,
                duration,
            }, ...prev.slice(0, 19)]);

        } catch (error) {
            const duration = Date.now() - startTime;
            setResponse({
                status: 0,
                statusText: 'Network Error',
                headers: {},
                body: { error: (error as Error).message },
                duration,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const selectEndpoint = (endpoint: ApiEndpoint) => {
        setSelectedEndpoint(endpoint);
        setResponse(null);

        // Reset params
        const newPathParams: Record<string, string> = {};
        const newQueryParams: Record<string, string> = {};

        endpoint.parameters.forEach(param => {
            if (param.in === 'path') {
                newPathParams[param.name] = '';
            } else if (param.in === 'query') {
                newQueryParams[param.name] = '';
            }
        });

        setPathParams(newPathParams);
        setQueryParams(newQueryParams);
        setRequestBody('{\n  \n}');
    };

    useEffect(() => {
        // Select first endpoint of category
        const categoryEndpoints = API_ENDPOINTS.filter(e => e.tags.includes(selectedCategory));
        if (categoryEndpoints.length > 0 && !selectedEndpoint) {
            selectEndpoint(categoryEndpoints[0]);
        }
    }, [selectedCategory]);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                            <Code className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">API Explorer</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                JASCA API 엔드포인트 조회 및 테스트
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/api/docs"
                            target="_blank"
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Swagger UI
                        </Link>
                        <Link
                            href="/admin/api-tokens"
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Key className="h-4 w-4" />
                            API 토큰 관리
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar - Categories & Endpoints */}
                <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="API 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex-1 overflow-y-auto">
                        {searchQuery ? (
                            // Show search results
                            <div className="p-2">
                                <p className="text-xs text-slate-500 px-2 mb-2">
                                    {filteredEndpoints.length}개 결과
                                </p>
                                {filteredEndpoints.map((endpoint, idx) => (
                                    <button
                                        key={`${endpoint.method}-${endpoint.path}-${idx}`}
                                        onClick={() => selectEndpoint(endpoint)}
                                        className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method
                                            ? 'bg-blue-100 dark:bg-blue-900/30'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${METHOD_COLORS[endpoint.method]}`}>
                                                {endpoint.method}
                                            </span>
                                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                                                {endpoint.path}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 truncate">{endpoint.summary}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            // Show categories
                            API_CATEGORIES.map(category => {
                                const categoryEndpoints = API_ENDPOINTS.filter(e => e.tags.includes(category.name));
                                const isExpanded = expandedCategories.has(category.name);

                                return (
                                    <div key={category.name} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                        <button
                                            onClick={() => toggleCategory(category.name)}
                                            className={`w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${selectedCategory === category.name ? 'bg-slate-100 dark:bg-slate-800' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <category.icon className="h-4 w-4 text-slate-500" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {category.name}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    ({categoryEndpoints.length})
                                                </span>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="pb-2 px-2">
                                                {categoryEndpoints.map((endpoint, idx) => (
                                                    <button
                                                        key={`${endpoint.method}-${endpoint.path}-${idx}`}
                                                        onClick={() => selectEndpoint(endpoint)}
                                                        className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500'
                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${METHOD_COLORS[endpoint.method]}`}>
                                                                {endpoint.method}
                                                            </span>
                                                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                                                                {endpoint.path.replace('/api', '')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 truncate pl-8">
                                                            {endpoint.summary}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>총 {API_ENDPOINTS.length}개 API</span>
                            <span>{API_CATEGORIES.length}개 카테고리</span>
                        </div>
                    </div>
                </div>

                {/* Center - Request Builder */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
                    {selectedEndpoint ? (
                        <>
                            {/* Endpoint Info */}
                            <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 text-xs font-mono font-bold rounded border ${METHOD_COLORS[selectedEndpoint.method]}`}>
                                            {selectedEndpoint.method}
                                        </span>
                                        <code className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                            {selectedEndpoint.path}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => toggleFavorite(selectedEndpoint)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        title={favorites.has(getEndpointKey(selectedEndpoint)) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                    >
                                        <Star className={`h-4 w-4 ${favorites.has(getEndpointKey(selectedEndpoint)) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {selectedEndpoint.summary}
                                </p>
                                {selectedEndpoint.security && selectedEndpoint.security.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Lock className="h-3 w-3 text-amber-500" />
                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                            인증 필요: {selectedEndpoint.security.map(s => Object.keys(s).join(', ')).join(' or ')}
                                        </span>
                                    </div>
                                )}
                                {/* URL Preview */}
                                <div className="mt-3 p-2 bg-slate-900 rounded-lg">
                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                        <span>URL Preview</span>
                                        <button
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(urlPreview);
                                            }}
                                            className="hover:text-white"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-emerald-400 break-all">
                                        {urlPreview}
                                    </code>
                                </div>
                            </div>

                            {/* Request Builder */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Auth Section */}
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Key className="h-4 w-4" />
                                        인증
                                    </h3>
                                    <div className="flex items-center gap-4 mb-3">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="authType"
                                                checked={authType === 'bearer'}
                                                onChange={() => setAuthType('bearer')}
                                                className="text-blue-600"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">Bearer Token</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="authType"
                                                checked={authType === 'apikey'}
                                                onChange={() => setAuthType('apikey')}
                                                className="text-blue-600"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">API Key</span>
                                        </label>
                                    </div>

                                    {authType === 'bearer' ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={accessToken ? `${accessToken.substring(0, 30)}...` : '토큰 없음'}
                                                readOnly
                                                className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500"
                                            />
                                            <button
                                                onClick={handleCopyToken}
                                                disabled={!accessToken}
                                                className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {copiedToken ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="API Key (jasca_...)"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}
                                </div>

                                {/* Path Parameters */}
                                {Object.keys(pathParams).length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                            Path Parameters
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.keys(pathParams).map(key => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <label className="w-32 text-sm text-slate-600 dark:text-slate-400 font-mono">
                                                        {`{${key}}`}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={pathParams[key]}
                                                        onChange={(e) => setPathParams(prev => ({ ...prev, [key]: e.target.value }))}
                                                        placeholder={`Enter ${key}`}
                                                        className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Query Parameters */}
                                {Object.keys(queryParams).length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                            Query Parameters
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.keys(queryParams).map(key => {
                                                const param = selectedEndpoint.parameters.find(p => p.name === key);
                                                return (
                                                    <div key={key} className="flex items-center gap-2">
                                                        <label className="w-32 text-sm text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1">
                                                            {key}
                                                            {param?.required && <span className="text-red-500">*</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={queryParams[key]}
                                                            onChange={(e) => setQueryParams(prev => ({ ...prev, [key]: e.target.value }))}
                                                            placeholder={param?.type || 'string'}
                                                            className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Request Body */}
                                {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                            Request Body (JSON)
                                        </h3>
                                        <textarea
                                            value={requestBody}
                                            onChange={(e) => setRequestBody(e.target.value)}
                                            rows={8}
                                            className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                            placeholder='{"key": "value"}'
                                        />
                                    </div>
                                )}

                                {/* Send Button */}
                                <button
                                    onClick={handleSendRequest}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Play className="h-5 w-5" />
                                    )}
                                    {isLoading ? '요청 중...' : '요청 보내기'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-slate-500">
                                <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>좌측에서 API 엔드포인트를 선택하세요</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right - Response, Code & History */}
                <div className="w-96 flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col">
                    {/* Tabs */}
                    <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setRightPanelTab('response')}
                            className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${rightPanelTab === 'response' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Response
                        </button>
                        <button 
                            onClick={() => setRightPanelTab('code')}
                            className={`flex-1 px-3 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${rightPanelTab === 'code' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileCode className="h-3.5 w-3.5" />
                            Code
                        </button>
                        <button
                            onClick={() => setRightPanelTab('history')}
                            className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${rightPanelTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            History ({requestHistory.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {rightPanelTab === 'response' && (
                            <>
                                {response ? (
                                    <div className="space-y-4">
                                        {/* Status */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {response.status >= 200 && response.status < 300 ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                                )}
                                                <span className={`text-lg font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {response.status} {response.statusText}
                                                </span>
                                            </div>
                                            <span className="text-sm text-slate-500">{response.duration}ms</span>
                                        </div>
                                        {/* Headers */}
                                        <div>
                                            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Response Headers</h4>
                                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-32">
                                                {Object.entries(response.headers).map(([key, value]) => (
                                                    <div key={key} className="flex gap-2">
                                                        <span className="text-blue-500">{key}:</span>
                                                        <span className="text-slate-600 dark:text-slate-400 break-all">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Body */}
                                        <div>
                                            <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Response Body</h4>
                                            <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-auto max-h-80">
                                                {typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : String(response.body)}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center text-slate-500">
                                            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">요청을 보내면 응답이 여기에 표시됩니다</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {rightPanelTab === 'code' && (
                            <div className="space-y-4">
                                {/* Language selector */}
                                <div className="flex gap-2">
                                    {(['curl', 'javascript', 'python'] as const).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setCodeLanguage(lang)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${codeLanguage === lang ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                                        >
                                            {lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                                        </button>
                                    ))}
                                </div>
                                {/* Code display */}
                                <div className="relative">
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick={copyCode}
                                            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                                            title="코드 복사"
                                        >
                                            {copiedCode ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 pt-10 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                                        {currentCode || '// 엔드포인트를 선택하세요'}
                                    </pre>
                                </div>
                                <p className="text-xs text-slate-500">
                                    💡 코드를 복사하여 터미널이나 개발 환경에서 실행할 수 있습니다.
                                </p>
                            </div>
                        )}

                        {rightPanelTab === 'history' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">요청 기록</h4>
                                    {requestHistory.length > 0 && (
                                        <button onClick={() => setRequestHistory([])} className="text-xs text-red-500 hover:text-red-600">
                                            전체 삭제
                                        </button>
                                    )}
                                </div>
                                {requestHistory.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">요청 기록이 없습니다</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {requestHistory.map((item) => (
                                            <div key={item.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${METHOD_COLORS[item.method]}`}>
                                                        {item.method}
                                                    </span>
                                                    <span className={`text-sm font-bold ${item.status >= 200 && item.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {item.status}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{item.duration}ms</span>
                                                </div>
                                                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">{item.path}</p>
                                                <p className="text-xs text-slate-400 mt-1">{item.timestamp.toLocaleTimeString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
