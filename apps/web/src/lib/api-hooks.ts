'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE = '/api';

// Utility function for authenticated fetch
async function authFetch(url: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().accessToken;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }
    return response.json();
}

// ============ Scans API ============

export interface Scan {
    id: string;
    projectId: string;
    scanType: string;
    targetName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    summary?: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    project?: {
        name: string;
    };
}

export function useScans(projectId?: string) {
    return useQuery<{ results: Scan[]; total: number }>({
        queryKey: ['scans', projectId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (projectId) params.set('projectId', projectId);
            params.set('limit', '50');
            return authFetch(`${API_BASE}/scans?${params.toString()}`);
        },
    });
}

export function useScan(id: string) {
    return useQuery<Scan>({
        queryKey: ['scan', id],
        queryFn: () => authFetch(`${API_BASE}/scans/${id}`),
        enabled: !!id,
    });
}

// Upload scan DTO interface
export interface UploadScanDto {
    sourceType: 'TRIVY_JSON' | 'TRIVY_SARIF' | 'CI_BAMBOO' | 'CI_GITLAB' | 'CI_JENKINS' | 'CI_GITHUB_ACTIONS' | 'MANUAL';
    projectName?: string;
    organizationId?: string;
    imageRef?: string;
    imageDigest?: string;
    tag?: string;
    commitHash?: string;
    branch?: string;
    ciPipeline?: string;
    ciJobUrl?: string;
}

export function useUploadScan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            projectId,
            file,
            metadata,
        }: {
            projectId?: string; // Now optional - can use projectName + organizationId in metadata instead
            file: File;
            metadata: UploadScanDto;
        }) => {
            const token = useAuthStore.getState().accessToken;
            const formData = new FormData();
            formData.append('file', file);
            // Append metadata fields
            Object.entries(metadata).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                }
            });

            // Build URL - projectId is now optional
            const url = projectId
                ? `${API_BASE}/scans/upload?projectId=${projectId}`
                : `${API_BASE}/scans/upload`;

            console.log('[Upload Debug] URL:', url);
            console.log('[Upload Debug] FormData entries:');
            for (const [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            console.log('[Upload Debug] Response status:', response.status);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Upload failed' }));
                throw new Error(error.message || 'Upload failed');
            }

            return response.json();
        },
        onSuccess: () => {
            // Use exact:false to invalidate all queries starting with 'scans' regardless of projectId
            queryClient.invalidateQueries({ queryKey: ['scans'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['project-scans'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
        },
    });
}

// ============ Vulnerabilities API ============

export interface Vulnerability {
    id: string;
    cveId: string;
    pkgName: string;
    installedVersion: string;
    fixedVersion?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX' | 'FALSE_POSITIVE';
    title: string;
    description?: string;
    assigneeId?: string;
    assignee?: {
        name: string;
        email: string;
    };
    scanResult?: {
        project?: {
            name: string;
        };
    };
}

export function useVulnerabilities(filters?: {
    projectId?: string;
    severity?: string[];
    status?: string[];
}) {
    return useQuery<{ data: Vulnerability[]; total: number }>({
        queryKey: ['vulnerabilities', filters],
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.projectId) params.set('projectId', filters.projectId);
            if (filters?.severity?.length) {
                filters.severity.forEach(s => params.append('severity', s));
            }
            if (filters?.status?.length) {
                filters.status.forEach(s => params.append('status', s));
            }
            params.set('limit', '50');
            return authFetch(`${API_BASE}/vulnerabilities?${params.toString()}`);
        },
    });
}

export function useVulnerability(id: string) {
    return useQuery<Vulnerability>({
        queryKey: ['vulnerability', id],
        queryFn: () => authFetch(`${API_BASE}/vulnerabilities/${id}`),
        enabled: !!id,
    });
}

export function useUpdateVulnerabilityStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            authFetch(`${API_BASE}/vulnerabilities/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
        },
    });
}

// ============ Policies API ============

export interface Policy {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    organizationId?: string;
    projectId?: string;
    rules: PolicyRule[];
    organization?: { id: string; name: string };
    project?: { id: string; name: string };
    createdAt: string;
    updatedAt: string;
}


export interface PolicyRule {
    id: string;
    ruleType: string;
    condition: string;
    value: string;
    action: string;
}

export function usePolicies(organizationId?: string, projectId?: string) {
    return useQuery<Policy[]>({
        queryKey: ['policies', organizationId, projectId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);
            if (projectId) params.set('projectId', projectId);
            return authFetch(`${API_BASE}/policies?${params.toString()}`);
        },
    });
}

export function usePolicy(id: string) {
    return useQuery<Policy>({
        queryKey: ['policy', id],
        queryFn: () => authFetch(`${API_BASE}/policies/${id}`),
        enabled: !!id,
    });
}

export function useCreatePolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Policy>) =>
            authFetch(`${API_BASE}/policies`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
}

export function useUpdatePolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<Policy>) =>
            authFetch(`${API_BASE}/policies/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
}

export function useDeletePolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/policies/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
}

// ============ Projects API ============

export interface Project {
    id: string;
    name: string;
    slug: string;
    description?: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    // Extended fields
    stats?: {
        totalScans: number;
        lastScanAt?: string;
        vulnerabilities: {
            critical: number;
            high: number;
            medium: number;
            low: number;
            total: number;
        };
    };
    riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    policyViolations?: number;
    organization?: {
        name: string;
    };
}

export function useProjects(organizationId?: string) {
    return useQuery<{ data: Project[]; total: number }>({
        queryKey: ['projects', organizationId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);
            params.set('limit', '50');
            return authFetch(`${API_BASE}/projects?${params.toString()}`);
        },
    });
}

export function useProject(id: string) {
    return useQuery<Project>({
        queryKey: ['project', id],
        queryFn: () => authFetch(`${API_BASE}/projects/${id}`),
        enabled: !!id,
    });
}

export function useProjectScans(projectId: string) {
    return useQuery<{ data: Scan[]; total: number }>({
        queryKey: ['project-scans', projectId],
        queryFn: () => authFetch(`${API_BASE}/scans?projectId=${projectId}&limit=20`),
        enabled: !!projectId,
    });
}

export function useProjectVulnerabilityTrend(projectId: string, days = 30) {
    return useQuery<{ date: string; critical: number; high: number; medium: number; low: number }[]>({
        queryKey: ['project-vuln-trend', projectId, days],
        queryFn: () => authFetch(`${API_BASE}/projects/${projectId}/vulnerability-trend?days=${days}`),
        enabled: !!projectId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ organizationId, ...data }: { organizationId: string; name: string; slug?: string; description?: string }) =>
            authFetch(`${API_BASE}/projects?organizationId=${organizationId}`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; organizationId?: string }) =>
            authFetch(`${API_BASE}/projects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

// ============ Organizations API ============

export interface Organization {
    id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        users: number;
        projects: number;
    };
}

export function useOrganizations() {
    return useQuery<Organization[]>({
        queryKey: ['organizations'],
        queryFn: () => authFetch(`${API_BASE}/organizations`),
    });
}

export function useOrganization(id: string) {
    return useQuery<Organization>({
        queryKey: ['organization', id],
        queryFn: () => authFetch(`${API_BASE}/organizations/${id}`),
        enabled: !!id,
    });
}

export function useCreateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; slug?: string; description?: string }) =>
            authFetch(`${API_BASE}/organizations`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

export function useUpdateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
            authFetch(`${API_BASE}/organizations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

export function useDeleteOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/organizations/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

// ============ Users API ============

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'SECURITY_ENGINEER' | 'DEVELOPER' | 'VIEWER';
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
    mfaEnabled: boolean;
    organizationId?: string;
    organization?: { name: string };
    createdAt: string;
    lastLoginAt?: string;
}

export function useUsers(organizationId?: string) {
    return useQuery<User[]>({
        queryKey: ['users', organizationId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);
            return authFetch(`${API_BASE}/users?${params.toString()}`);
        },
    });
}

export function useUser(id: string) {
    return useQuery<User>({
        queryKey: ['user', id],
        queryFn: () => authFetch(`${API_BASE}/users/${id}`),
        enabled: !!id,
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { email: string; name: string; password: string; role: string; organizationId?: string }) =>
            authFetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; role?: string; status?: string }) =>
            authFetch(`${API_BASE}/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/users/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// ============ Exceptions API ============

export interface Exception {
    id: string;
    vulnerabilityId: string;
    vulnerability?: {
        cveId: string;
        severity: string;
    };
    projectId: string;
    project?: { name: string };
    requestedBy: string;
    requestedAt: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    expiresAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectReason?: string;
}

export function useExceptions(status?: string) {
    return useQuery<Exception[]>({
        queryKey: ['exceptions', status],
        queryFn: () => {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.set('status', status.toUpperCase());
            return authFetch(`${API_BASE}/policies/exceptions?${params.toString()}`);
        },
    });
}

export function useApproveException() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/policies/exceptions/${id}/approve`, { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exceptions'] });
        },
    });
}

export function useRejectException() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            authFetch(`${API_BASE}/policies/exceptions/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exceptions'] });
        },
    });
}

// ============ API Tokens API ============

export interface ApiToken {
    id: string;
    name: string;
    tokenPrefix: string;
    permissions: string[];
    expiresAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
}

export interface CreateApiTokenDto {
    name: string;
    permissions: string[];
    expiresIn?: number; // days
}

export function useApiTokens() {
    return useQuery<ApiToken[]>({
        queryKey: ['api-tokens'],
        queryFn: () => authFetch(`${API_BASE}/api-tokens`),
    });
}

export function useApiToken(id: string) {
    return useQuery<ApiToken>({
        queryKey: ['api-token', id],
        queryFn: () => authFetch(`${API_BASE}/api-tokens/${id}`),
        enabled: !!id,
    });
}

export function useCreateApiToken() {
    const queryClient = useQueryClient();
    return useMutation<{ token: string; tokenInfo: ApiToken }, Error, CreateApiTokenDto>({
        mutationFn: (data: CreateApiTokenDto) =>
            authFetch(`${API_BASE}/api-tokens`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
        },
    });
}

export function useDeleteApiToken() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/api-tokens/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
        },
    });
}

// ============ Stats API ============

export interface StatsOverview {
    total: number;
    bySeverity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        unknown: number;
    };
    byStatus: {
        open: number;
        inProgress: number;
        fixed: number;
        ignored: number;
    };
    recentCritical: Array<{
        id: string;
        cveId: string;
        title: string;
        pkgName: string;
        project: string;
        createdAt: string;
    }>;
}

export interface ProjectStats {
    id: string;
    name: string;
    slug: string;
    organization?: string;
    totalScans: number;
    lastScan?: {
        id: string;
        scannedAt: string;
        summary?: {
            critical: number;
            high: number;
            medium: number;
            low: number;
            totalVulns: number;
        };
    };
}

export interface TrendData {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

export function useStatsOverview(organizationId?: string) {
    return useQuery<StatsOverview>({
        queryKey: ['stats-overview', organizationId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);
            return authFetch(`${API_BASE}/stats/overview?${params.toString()}`);
        },
    });
}

export function useStatsByProject(organizationId?: string) {
    return useQuery<ProjectStats[]>({
        queryKey: ['stats-by-project', organizationId],
        queryFn: () => {
            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);
            return authFetch(`${API_BASE}/stats/by-project?${params.toString()}`);
        },
    });
}

export function useStatsTrend(organizationId?: string, days = 7) {
    return useQuery<TrendData[]>({
        queryKey: ['stats-trend', organizationId, days],
        queryFn: () => {
            const params = new URLSearchParams();
            if (organizationId) params.set('organizationId', organizationId);
            params.set('days', days.toString());
            return authFetch(`${API_BASE}/stats/trend?${params.toString()}`);
        },
    });
}

// ============ Notifications API ============

export interface Notification {
    id: string;
    type: 'critical_vuln' | 'policy_violation' | 'exception' | 'scan_complete' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    link?: string;
}

export function useNotifications() {
    return useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: () => authFetch(`${API_BASE}/notifications`),
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () =>
            authFetch(`${API_BASE}/notifications/read-all`, { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

// ============ Reports API ============

export interface Report {
    id: string;
    name: string;
    type: 'vulnerability_summary' | 'trend_analysis' | 'compliance_audit' | 'project_status';
    status: 'pending' | 'generating' | 'completed' | 'failed';
    format: 'pdf' | 'csv' | 'json';
    createdAt: string;
    completedAt?: string;
    downloadUrl?: string;
}

export function useReports() {
    return useQuery<Report[]>({
        queryKey: ['reports'],
        queryFn: () => authFetch(`${API_BASE}/reports`),
        // Auto-refresh every 3 seconds to catch status updates
        refetchInterval: 3000,
    });
}

export function useCreateReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; type: string; format: string; parameters?: Record<string, unknown> }) =>
            authFetch(`${API_BASE}/reports`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
    });
}

export function useDeleteReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/reports/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
    });
}

export function useUpdateReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; format?: string }) =>
            authFetch(`${API_BASE}/reports/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
    });
}

// ============ Notification Channels API ============

export interface NotificationChannel {
    id: string;
    name: string;
    type: 'SLACK' | 'MATTERMOST' | 'EMAIL' | 'WEBHOOK';
    config: Record<string, unknown>;
    isActive: boolean;
    createdAt: string;
    rules?: NotificationRule[];
}

export interface NotificationRule {
    id: string;
    channelId: string;
    eventType: string;
    conditions?: Record<string, unknown>;
    isActive: boolean;
}

export function useNotificationChannels() {
    return useQuery<NotificationChannel[]>({
        queryKey: ['notification-channels'],
        queryFn: () => authFetch(`${API_BASE}/notification-channels`),
    });
}

export function useCreateNotificationChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            type: 'SLACK' | 'MATTERMOST' | 'EMAIL' | 'WEBHOOK';
            config: Record<string, unknown>;
            isActive?: boolean;
        }) =>
            authFetch(`${API_BASE}/notification-channels`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
        },
    });
}

export function useUpdateNotificationChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; config?: Record<string, unknown>; isActive?: boolean }) =>
            authFetch(`${API_BASE}/notification-channels/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
        },
    });
}

export function useDeleteNotificationChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            authFetch(`${API_BASE}/notification-channels/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
        },
    });
}

export function useAddNotificationRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ channelId, ...data }: { channelId: string; eventType: string; conditions?: Record<string, unknown>; isActive?: boolean }) =>
            authFetch(`${API_BASE}/notification-channels/${channelId}/rules`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
        },
    });
}

// ============ Compliance API ============

export interface ComplianceReport {
    id: string;
    organizationId: string;
    reportType: 'PCI-DSS' | 'SOC2' | 'HIPAA' | 'ISO27001' | 'GENERAL';
    generatedAt: string;
    summary: {
        totalVulnerabilities: number;
        criticalUnresolved: number;
        highUnresolved: number;
        meanTimeToResolve: number;
        complianceScore: number;
    };
    sections: {
        title: string;
        status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_APPLICABLE';
        findings: string[];
        recommendations: string[];
    }[];
}

export interface ViolationHistory {
    total: number;
    byPolicy: { policyName: string; count: number }[];
    bySeverity: Record<string, number>;
    trend: { date: string; count: number }[];
}

export function useComplianceReport(reportType?: string) {
    return useQuery<ComplianceReport>({
        queryKey: ['compliance-report', reportType],
        queryFn: () => {
            const params = new URLSearchParams();
            if (reportType) params.set('reportType', reportType);
            return authFetch(`${API_BASE}/compliance/report?${params.toString()}`);
        },
    });
}

export function useViolationHistory(days = 30) {
    return useQuery<ViolationHistory>({
        queryKey: ['violation-history', days],
        queryFn: () => authFetch(`${API_BASE}/compliance/violations?days=${days}`),
    });
}

// ============ Settings API ============

export function useSettings<T = unknown>(key: string) {
    return useQuery<T>({
        queryKey: ['settings', key],
        queryFn: () => authFetch(`${API_BASE}/settings/${key}`),
    });
}

export function useAllSettings() {
    return useQuery<Record<string, unknown>>({
        queryKey: ['settings'],
        queryFn: () => authFetch(`${API_BASE}/settings`),
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: unknown }) =>
            authFetch(`${API_BASE}/settings/${key}`, {
                method: 'PUT',
                body: JSON.stringify({ value }),
            }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['settings', variables.key] });
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}

// Typed hooks for specific settings
export interface WorkflowSettings {
    states: Array<{
        id: string;
        name: string;
        color: string;
        description: string;
    }>;
    transitions: Array<{
        from: string;
        to: string;
        requiredRole: string;
    }>;
}

export interface TrivySettings {
    outputFormat: 'json' | 'table' | 'sarif';
    schemaVersion: number;
    severities: string[];
    ignoreUnfixed: boolean;
    timeout: string;
    cacheDir: string;
    scanners: string[];
}

export interface AiSettings {
    provider: 'openai' | 'anthropic' | 'vllm' | 'ollama' | 'custom';
    apiUrl?: string;
    apiKey?: string;
    summaryModel: string;
    remediationModel: string;
    maxTokens: number;
    temperature: number;
    enableAutoSummary: boolean;
    enableRemediationGuide: boolean;
}


export function useWorkflowSettings() {
    return useSettings<WorkflowSettings>('workflows');
}

export function useTrivySettings() {
    return useSettings<TrivySettings>('trivy');
}

export function useAiSettings() {
    return useSettings<AiSettings>('ai');
}
