/**
 * License API client for JASCA
 */

import { fetchWithAuth } from './fetch-utils';

const API_BASE = '/api/licenses';

export interface License {
    id: string;
    spdxId: string;
    name: string;
    classification: LicenseClassification;
    description?: string;
    osiApproved: boolean;
    fsfLibre: boolean;
    url?: string;
    createdAt: string;
    updatedAt: string;
}

export type LicenseClassification =
    | 'FORBIDDEN'
    | 'RESTRICTED'
    | 'RECIPROCAL'
    | 'NOTICE'
    | 'PERMISSIVE'
    | 'UNENCUMBERED'
    | 'UNKNOWN';

export interface LicenseStats {
    total: number;
    byClassification: Record<LicenseClassification, number>;
    uniqueLicenses: number;
    uniquePackages: number;
}

export interface LicenseSummary {
    id: string;
    spdxId: string;
    name: string;
    classification: LicenseClassification;
    packageCount: number;
}

export interface PackageLicense {
    id: string;
    licenseName: string;
    pkgName: string;
    pkgVersion: string;
    pkgPath?: string;
    confidence: number;
    createdAt: string;
}

export const licensesApi = {
    /**
     * Get all known licenses
     */
    async getAll(params?: { classification?: LicenseClassification; search?: string }): Promise<License[]> {
        const searchParams = new URLSearchParams();
        if (params?.classification) searchParams.set('classification', params.classification);
        if (params?.search) searchParams.set('search', params.search);

        const queryString = searchParams.toString();
        const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Failed to fetch licenses');
        return res.json();
    },

    /**
     * Get license statistics
     */
    async getStats(projectId?: string): Promise<LicenseStats> {
        const url = projectId
            ? `${API_BASE}/stats?projectId=${projectId}`
            : `${API_BASE}/stats`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Failed to fetch license stats');
        return res.json();
    },

    /**
     * Get licenses for a project (latest scan)
     */
    async getByProject(projectId: string): Promise<LicenseSummary[]> {
        const res = await fetchWithAuth(`${API_BASE}/by-project/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project licenses');
        return res.json();
    },

    /**
     * Get licenses for a specific scan
     */
    async getByScan(scanId: string): Promise<LicenseSummary[]> {
        const res = await fetchWithAuth(`${API_BASE}/by-scan/${scanId}`);
        if (!res.ok) throw new Error('Failed to fetch scan licenses');
        return res.json();
    },

    /**
     * Get packages with a specific license in a scan
     */
    async getPackagesByLicense(scanId: string, licenseName: string): Promise<PackageLicense[]> {
        const res = await fetchWithAuth(
            `${API_BASE}/by-scan/${scanId}/packages?licenseName=${encodeURIComponent(licenseName)}`
        );
        if (!res.ok) throw new Error('Failed to fetch packages by license');
        return res.json();
    },

    /**
     * Get license by ID
     */
    async getById(id: string): Promise<License> {
        const res = await fetchWithAuth(`${API_BASE}/${id}`);
        if (!res.ok) throw new Error('Failed to fetch license');
        return res.json();
    },

    /**
     * Seed default licenses (admin only)
     */
    async seedDefaults(): Promise<{ seeded: number }> {
        const res = await fetchWithAuth(`${API_BASE}/seed`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to seed licenses');
        return res.json();
    },
};

/**
 * Get classification color for UI
 */
export function getClassificationColor(classification: LicenseClassification): string {
    switch (classification) {
        case 'FORBIDDEN':
            return 'bg-red-500';
        case 'RESTRICTED':
            return 'bg-orange-500';
        case 'RECIPROCAL':
            return 'bg-yellow-500';
        case 'NOTICE':
            return 'bg-blue-500';
        case 'PERMISSIVE':
            return 'bg-green-500';
        case 'UNENCUMBERED':
            return 'bg-emerald-500';
        case 'UNKNOWN':
        default:
            return 'bg-gray-500';
    }
}

/**
 * Get classification label for UI
 */
export function getClassificationLabel(classification: LicenseClassification): string {
    switch (classification) {
        case 'FORBIDDEN':
            return '금지';
        case 'RESTRICTED':
            return '제한적';
        case 'RECIPROCAL':
            return '상호적';
        case 'NOTICE':
            return '고지';
        case 'PERMISSIVE':
            return '허용';
        case 'UNENCUMBERED':
            return '무제한';
        case 'UNKNOWN':
        default:
            return '미확인';
    }
}

/**
 * Get classification severity level (for sorting/filtering)
 */
export function getClassificationSeverity(classification: LicenseClassification): number {
    switch (classification) {
        case 'FORBIDDEN':
            return 6;
        case 'RESTRICTED':
            return 5;
        case 'RECIPROCAL':
            return 4;
        case 'UNKNOWN':
            return 3;
        case 'NOTICE':
            return 2;
        case 'PERMISSIVE':
            return 1;
        case 'UNENCUMBERED':
            return 0;
        default:
            return 3;
    }
}
