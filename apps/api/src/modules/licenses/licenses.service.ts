import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LicenseClassification, Prisma } from '@prisma/client';

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

export interface TrackedLicenseInfo {
    id: string;
    licenseName: string;
    pkgName: string;
    pkgVersion: string;
    pkgPath?: string;
    classification: LicenseClassification;
    spdxId?: string;
    // Scan info
    scanId: string;
    scanCreatedAt: Date;
    imageRef?: string;
    artifactName?: string;
    // Project info
    projectId: string;
    projectName: string;
    organizationName?: string;
}

@Injectable()
export class LicensesService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get all known licenses
     */
    async findAll(options?: { classification?: LicenseClassification; search?: string }) {
        const where: Prisma.LicenseWhereInput = {};

        if (options?.classification) {
            where.classification = options.classification;
        }

        if (options?.search) {
            where.OR = [
                { spdxId: { contains: options.search, mode: 'insensitive' } },
                { name: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.license.findMany({
            where,
            orderBy: { spdxId: 'asc' },
        });
    }

    /**
     * Get license by ID
     */
    async findById(id: string) {
        const license = await this.prisma.license.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { packageLicenses: true },
                },
            },
        });

        if (!license) {
            throw new NotFoundException(`License with ID ${id} not found`);
        }

        return license;
    }

    /**
     * Get license by SPDX ID
     */
    async findBySpdxId(spdxId: string) {
        return this.prisma.license.findUnique({
            where: { spdxId },
        });
    }

    /**
     * Get or create license by SPDX ID
     */
    async getOrCreateLicense(
        spdxId: string,
        name?: string,
        classification?: LicenseClassification,
    ) {
        const existing = await this.prisma.license.findUnique({
            where: { spdxId },
        });

        if (existing) {
            return existing;
        }

        // Create with default classification if not provided
        const defaultClassification = this.getDefaultClassification(spdxId);

        return this.prisma.license.create({
            data: {
                spdxId,
                name: name || spdxId,
                classification: classification || defaultClassification,
            },
        });
    }

    /**
     * Get license statistics (optimized for large datasets)
     */
    async getStats(projectId?: string): Promise<LicenseStats> {
        const scanResultFilter = projectId 
            ? { scanResult: { projectId } } 
            : {};

        // Use database-level aggregation instead of loading all records
        const [
            total,
            classificationGroups,
            uniqueLicenseCount,
            uniquePackageCount,
        ] = await Promise.all([
            // Total count
            this.prisma.packageLicense.count({
                where: scanResultFilter,
            }),
            
            // Classification counts using groupBy
            this.prisma.packageLicense.groupBy({
                by: ['licenseId'],
                where: scanResultFilter,
                _count: { id: true },
            }).then(async (groups) => {
                // Get license classifications for the grouped IDs
                const licenseIds = groups
                    .map(g => g.licenseId)
                    .filter((id): id is string => id !== null);
                
                const licenses = await this.prisma.license.findMany({
                    where: { id: { in: licenseIds } },
                    select: { id: true, classification: true },
                });
                
                const classificationMap = new Map(licenses.map(l => [l.id, l.classification]));
                
                const counts: Record<LicenseClassification, number> = {
                    FORBIDDEN: 0,
                    RESTRICTED: 0,
                    RECIPROCAL: 0,
                    NOTICE: 0,
                    PERMISSIVE: 0,
                    UNENCUMBERED: 0,
                    UNKNOWN: 0,
                };
                
                for (const group of groups) {
                    const classification = group.licenseId 
                        ? (classificationMap.get(group.licenseId) || 'UNKNOWN')
                        : 'UNKNOWN';
                    counts[classification] += group._count.id;
                }
                
                return counts;
            }),
            
            // Unique license count (distinct on licenseName)
            this.prisma.packageLicense.groupBy({
                by: ['licenseName'],
                where: scanResultFilter,
            }).then(groups => groups.length),
            
            // Unique package count (distinct on pkgName + pkgVersion)
            this.prisma.packageLicense.groupBy({
                by: ['pkgName', 'pkgVersion'],
                where: scanResultFilter,
            }).then(groups => groups.length),
        ]);

        return {
            total,
            byClassification: classificationGroups,
            uniqueLicenses: uniqueLicenseCount,
            uniquePackages: uniquePackageCount,
        };
    }

    /**
     * Get licenses by project ID
     */
    async findByProject(projectId: string): Promise<LicenseSummary[]> {
        const latestScan = await this.prisma.scanResult.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        if (!latestScan) {
            return [];
        }

        return this.findByScan(latestScan.id);
    }

    /**
     * Get licenses by scan ID
     */
    async findByScan(scanId: string): Promise<LicenseSummary[]> {
        const packageLicenses = await this.prisma.packageLicense.findMany({
            where: { scanResultId: scanId },
            include: {
                license: true,
            },
        });

        // Group by license
        const licenseMap = new Map<string, LicenseSummary>();

        for (const pl of packageLicenses) {
            const key = pl.licenseName;
            const existing = licenseMap.get(key);

            if (existing) {
                existing.packageCount++;
            } else {
                licenseMap.set(key, {
                    id: pl.license?.id || '',
                    spdxId: pl.license?.spdxId || pl.licenseName,
                    name: pl.license?.name || pl.licenseName,
                    classification: pl.license?.classification || 'UNKNOWN',
                    packageCount: 1,
                });
            }
        }

        return Array.from(licenseMap.values()).sort((a, b) => {
            // Sort by classification severity first, then by name
            const classOrder: Record<LicenseClassification, number> = {
                FORBIDDEN: 0,
                RESTRICTED: 1,
                RECIPROCAL: 2,
                UNKNOWN: 3,
                NOTICE: 4,
                PERMISSIVE: 5,
                UNENCUMBERED: 6,
            };
            const orderDiff = classOrder[a.classification] - classOrder[b.classification];
            if (orderDiff !== 0) return orderDiff;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get packages by license for a scan
     */
    async getPackagesByLicense(scanId: string, licenseName: string) {
        return this.prisma.packageLicense.findMany({
            where: {
                scanResultId: scanId,
                licenseName,
            },
            orderBy: { pkgName: 'asc' },
        });
    }

    /**
     * Get default classification for common licenses
     */
    private getDefaultClassification(spdxId: string): LicenseClassification {
        const normalized = spdxId.toUpperCase().replace(/-/g, '');

        // Forbidden licenses
        if (['AGPL3.0', 'AGPL30ONLY', 'AGPL30ORLATER'].some(l => normalized.includes(l))) {
            return 'FORBIDDEN';
        }

        // Restricted licenses (Copyleft)
        if (['GPL', 'LGPL', 'CC BY-NC', 'CC BY-ND', 'SLEEPYCAT', 'OSL'].some(l => normalized.includes(l.replace(/-/g, '').replace(/ /g, '')))) {
            return 'RESTRICTED';
        }

        // Reciprocal licenses
        if (['EPL', 'MPL', 'CDDL', 'CPL', 'APSL'].some(l => normalized.includes(l))) {
            return 'RECIPROCAL';
        }

        // Notice licenses (permissive with attribution)
        if (['MIT', 'APACHE', 'BSD', 'ISC', 'ZLIB', 'WTFPL', 'ARTISTIC', 'AFL', 'BSL'].some(l => normalized.includes(l))) {
            return 'NOTICE';
        }

        // Unencumbered (public domain)
        if (['CC0', 'UNLICENSE', '0BSD', 'PUBLICDOMAIN'].some(l => normalized.includes(l))) {
            return 'UNENCUMBERED';
        }

        return 'UNKNOWN';
    }

    /**
     * Seed default licenses from common SPDX identifiers
     */
    async seedDefaultLicenses() {
        const defaultLicenses = [
            // Notice (Permissive with Attribution)
            { spdxId: 'MIT', name: 'MIT License', classification: 'NOTICE' as const, osiApproved: true },
            { spdxId: 'Apache-2.0', name: 'Apache License 2.0', classification: 'NOTICE' as const, osiApproved: true },
            { spdxId: 'BSD-2-Clause', name: 'BSD 2-Clause "Simplified" License', classification: 'NOTICE' as const, osiApproved: true },
            { spdxId: 'BSD-3-Clause', name: 'BSD 3-Clause "New" or "Revised" License', classification: 'NOTICE' as const, osiApproved: true },
            { spdxId: 'ISC', name: 'ISC License', classification: 'NOTICE' as const, osiApproved: true },

            // Restricted (Copyleft)
            { spdxId: 'GPL-2.0-only', name: 'GNU General Public License v2.0 only', classification: 'RESTRICTED' as const, osiApproved: true, fsfLibre: true },
            { spdxId: 'GPL-3.0-only', name: 'GNU General Public License v3.0 only', classification: 'RESTRICTED' as const, osiApproved: true, fsfLibre: true },
            { spdxId: 'LGPL-2.1-only', name: 'GNU Lesser General Public License v2.1 only', classification: 'RESTRICTED' as const, osiApproved: true, fsfLibre: true },
            { spdxId: 'LGPL-3.0-only', name: 'GNU Lesser General Public License v3.0 only', classification: 'RESTRICTED' as const, osiApproved: true, fsfLibre: true },

            // Reciprocal
            { spdxId: 'MPL-2.0', name: 'Mozilla Public License 2.0', classification: 'RECIPROCAL' as const, osiApproved: true },
            { spdxId: 'EPL-2.0', name: 'Eclipse Public License 2.0', classification: 'RECIPROCAL' as const, osiApproved: true },
            { spdxId: 'CDDL-1.0', name: 'Common Development and Distribution License 1.0', classification: 'RECIPROCAL' as const, osiApproved: true },

            // Forbidden
            { spdxId: 'AGPL-3.0-only', name: 'GNU Affero General Public License v3.0 only', classification: 'FORBIDDEN' as const, osiApproved: true, fsfLibre: true },

            // Unencumbered
            { spdxId: 'CC0-1.0', name: 'Creative Commons Zero v1.0 Universal', classification: 'UNENCUMBERED' as const },
            { spdxId: 'Unlicense', name: 'The Unlicense', classification: 'UNENCUMBERED' as const, osiApproved: true },
            { spdxId: '0BSD', name: 'BSD Zero Clause License', classification: 'UNENCUMBERED' as const, osiApproved: true },
        ];

        for (const license of defaultLicenses) {
            await this.prisma.license.upsert({
                where: { spdxId: license.spdxId },
                update: {},
                create: license,
            });
        }

        return { seeded: defaultLicenses.length };
    }

    /**
     * Get all licenses with project/scan tracking info
     */
    async getTrackedLicenses(options?: {
        projectId?: string;
        classification?: LicenseClassification;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: TrackedLicenseInfo[]; total: number }> {
        const where: Prisma.PackageLicenseWhereInput = {};

        if (options?.projectId) {
            where.scanResult = { projectId: options.projectId };
        }

        if (options?.classification) {
            where.license = { classification: options.classification };
        }

        if (options?.search) {
            where.OR = [
                { licenseName: { contains: options.search, mode: 'insensitive' } },
                { pkgName: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        const [packageLicenses, total] = await Promise.all([
            this.prisma.packageLicense.findMany({
                where,
                include: {
                    license: true,
                    scanResult: {
                        include: {
                            project: {
                                include: {
                                    organization: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 100,
                skip: options?.offset || 0,
            }),
            this.prisma.packageLicense.count({ where }),
        ]);

        const data: TrackedLicenseInfo[] = packageLicenses.map((pl) => ({
            id: pl.id,
            licenseName: pl.licenseName,
            pkgName: pl.pkgName,
            pkgVersion: pl.pkgVersion,
            pkgPath: pl.pkgPath || undefined,
            classification: pl.license?.classification || 'UNKNOWN',
            spdxId: pl.license?.spdxId,
            scanId: pl.scanResultId,
            scanCreatedAt: pl.scanResult.createdAt,
            imageRef: pl.scanResult.imageRef || undefined,
            artifactName: pl.scanResult.artifactName || undefined,
            projectId: pl.scanResult.projectId,
            projectName: pl.scanResult.project.name,
            organizationName: pl.scanResult.project.organization?.name,
        }));

        return { data, total };
    }

    /**
     * Get licenses grouped by project (optimized with pagination)
     */
    async getLicensesByProjectSummary(options?: {
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        data: Array<{
            projectId: string;
            projectName: string;
            organizationName?: string;
            lastScanAt?: Date;
            licenseStats: {
                total: number;
                forbidden: number;
                restricted: number;
                unknown: number;
            };
        }>;
        total: number;
    }> {
        const limit = options?.limit || 20;
        const offset = options?.offset || 0;

        // Build where clause for project search
        const projectWhere: Prisma.ProjectWhereInput = options?.search
            ? {
                OR: [
                    { name: { contains: options.search, mode: 'insensitive' } },
                    { organization: { name: { contains: options.search, mode: 'insensitive' } } },
                ],
            }
            : {};

        // Get total count of projects with scans
        const total = await this.prisma.project.count({
            where: {
                ...projectWhere,
                scanResults: { some: {} },
            },
        });

        // Get projects with only the latest scan ID (not all data)
        const projects = await this.prisma.project.findMany({
            where: {
                ...projectWhere,
                scanResults: { some: {} },
            },
            select: {
                id: true,
                name: true,
                organization: { select: { name: true } },
                scanResults: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, createdAt: true },
                },
            },
            take: limit,
            skip: offset,
            orderBy: { updatedAt: 'desc' },
        });

        // Batch fetch license stats for all latest scans
        const scanIds = projects
            .map(p => p.scanResults[0]?.id)
            .filter((id): id is string => !!id);

        // Get license counts grouped by scan and classification in single query
        const licenseCounts = await this.prisma.packageLicense.groupBy({
            by: ['scanResultId', 'licenseId'],
            where: { scanResultId: { in: scanIds } },
            _count: { id: true },
        });

        // Get classifications for all license IDs
        const licenseIds = [...new Set(
            licenseCounts
                .map(lc => lc.licenseId)
                .filter((id): id is string => !!id)
        )];

        const licenseClassifications = await this.prisma.license.findMany({
            where: { id: { in: licenseIds } },
            select: { id: true, classification: true },
        });

        const classificationMap = new Map(
            licenseClassifications.map(l => [l.id, l.classification])
        );

        // Build stats per scan
        const scanStats = new Map<string, { total: number; forbidden: number; restricted: number; unknown: number }>();
        
        for (const lc of licenseCounts) {
            const scanId = lc.scanResultId;
            const classification = lc.licenseId 
                ? (classificationMap.get(lc.licenseId) || 'UNKNOWN')
                : 'UNKNOWN';
            
            if (!scanStats.has(scanId)) {
                scanStats.set(scanId, { total: 0, forbidden: 0, restricted: 0, unknown: 0 });
            }
            
            const stats = scanStats.get(scanId)!;
            stats.total += lc._count.id;
            
            if (classification === 'FORBIDDEN') stats.forbidden += lc._count.id;
            else if (classification === 'RESTRICTED') stats.restricted += lc._count.id;
            else if (classification === 'UNKNOWN') stats.unknown += lc._count.id;
        }

        const data = projects
            .filter(p => p.scanResults.length > 0)
            .map(project => {
                const latestScan = project.scanResults[0];
                const stats = scanStats.get(latestScan?.id || '') || { total: 0, forbidden: 0, restricted: 0, unknown: 0 };

                return {
                    projectId: project.id,
                    projectName: project.name,
                    organizationName: project.organization?.name,
                    lastScanAt: latestScan?.createdAt,
                    licenseStats: stats,
                };
            })
            .sort((a, b) => {
                // Sort by risk (forbidden + restricted + unknown)
                const riskA = a.licenseStats.forbidden * 3 + a.licenseStats.restricted * 2 + a.licenseStats.unknown;
                const riskB = b.licenseStats.forbidden * 3 + b.licenseStats.restricted * 2 + b.licenseStats.unknown;
                return riskB - riskA;
            });

        return { data, total };
    }
}
