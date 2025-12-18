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
    return useQuery<{ data: Scan[]; total: number }>({
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
    scope: 'ORGANIZATION' | 'PROJECT';
    enabled: boolean;
    organizationId?: string;
    projectId?: string;
    rules: PolicyRule[];
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
        mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
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

