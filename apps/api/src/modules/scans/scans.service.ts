import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrivyParserService, ParsedScanResult } from './services/trivy-parser.service';
import { VulnSyncService } from './services/vuln-sync.service';
import { LicenseParserService } from '../licenses/services/license-parser.service';
import { UploadScanDto } from './dto/upload-scan.dto';
import * as crypto from 'crypto';

@Injectable()
export class ScansService {
    private readonly logger = new Logger(ScansService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly trivyParser: TrivyParserService,
        private readonly licenseParser: LicenseParserService,
        private readonly vulnSyncService: VulnSyncService,
    ) { }

    async findAll(projectId?: string, options?: { limit?: number; offset?: number }) {
        const where = projectId ? { projectId } : undefined;

        const [results, total] = await Promise.all([
            this.prisma.scanResult.findMany({
                where,
                include: {
                    project: { include: { organization: true } },
                    summary: true,
                },
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 20,
                skip: options?.offset || 0,
            }),
            this.prisma.scanResult.count({ where }),
        ]);

        // Transform to match frontend Scan interface
        const transformedResults = results.map(scan => ({
            id: scan.id,
            projectId: scan.projectId,
            targetName: scan.artifactName || scan.imageRef || 'Unknown',
            scanType: scan.sourceType || 'UNKNOWN',
            status: scan.summary ? 'COMPLETED' : 'PENDING',
            startedAt: scan.scannedAt?.toISOString() || scan.createdAt.toISOString(),
            completedAt: scan.summary ? scan.createdAt.toISOString() : undefined,
            createdAt: scan.createdAt.toISOString(),
            imageRef: scan.imageRef,
            imageDigest: scan.imageDigest,
            tag: scan.tag,
            summary: scan.summary ? {
                critical: scan.summary.critical,
                high: scan.summary.high,
                medium: scan.summary.medium,
                low: scan.summary.low,
            } : undefined,
            project: scan.project ? {
                id: scan.project.id,
                name: scan.project.name,
                organization: scan.project.organization ? {
                    id: scan.project.organization.id,
                    name: scan.project.organization.name,
                } : undefined,
            } : undefined,
        }));

        return { results: transformedResults, total };
    }

    async findById(id: string) {
        const scan = await this.prisma.scanResult.findUnique({
            where: { id },
            include: {
                project: { include: { organization: true } },
                summary: true,
                vulnerabilities: {
                    include: {
                        vulnerability: true,
                        assignee: true,
                    },
                    orderBy: [
                        { vulnerability: { severity: 'asc' } },
                        { createdAt: 'desc' },
                    ],
                },
            },
        });

        if (!scan) {
            throw new NotFoundException('Scan result not found');
        }

        // Transform to match frontend interface
        return {
            id: scan.id,
            projectId: scan.projectId,
            targetName: scan.artifactName || scan.imageRef || 'Unknown',
            scanType: scan.sourceType || 'UNKNOWN',
            status: scan.summary ? 'COMPLETED' : 'PENDING',
            startedAt: scan.scannedAt?.toISOString() || scan.createdAt.toISOString(),
            completedAt: scan.summary ? scan.createdAt.toISOString() : undefined,
            createdAt: scan.createdAt.toISOString(),
            imageRef: scan.imageRef,
            imageDigest: scan.imageDigest,
            tag: scan.tag,
            summary: scan.summary ? {
                critical: scan.summary.critical,
                high: scan.summary.high,
                medium: scan.summary.medium,
                low: scan.summary.low,
                unknown: scan.summary.unknown,
                total: scan.summary.totalVulns,
            } : undefined,
            project: scan.project ? {
                id: scan.project.id,
                name: scan.project.name,
                organization: scan.project.organization ? {
                    id: scan.project.organization.id,
                    name: scan.project.organization.name,
                } : undefined,
            } : undefined,
            vulnerabilities: scan.vulnerabilities.map(v => ({
                id: v.id,
                scanResultId: v.scanResultId,
                vulnerabilityId: v.vulnerabilityId,
                pkgName: v.pkgName,
                installedVersion: v.pkgVersion,
                fixedVersion: v.fixedVersion,
                status: v.status,
                assigneeId: v.assigneeId,
                createdAt: v.createdAt?.toISOString(),
                vulnerability: v.vulnerability ? {
                    id: v.vulnerability.id,
                    cveId: v.vulnerability.cveId,
                    severity: v.vulnerability.severity,
                    title: v.vulnerability.title,
                    description: v.vulnerability.description,
                    cvssScore: v.vulnerability.cvssV3Score,
                    cvssVector: v.vulnerability.cvssV3Vector,
                    publishedDate: v.vulnerability.publishedAt?.toISOString(),
                    references: v.vulnerability.references,
                } : undefined,
                assignee: v.assignee ? {
                    id: v.assignee.id,
                    name: v.assignee.name,
                    email: v.assignee.email,
                } : undefined,
            })),
            rawResult: scan.rawResult,
        };
    }

    async uploadScan(
        projectId: string | undefined,
        dto: UploadScanDto,
        rawResult: any,
        sourceInfo?: { uploaderIp?: string; userAgent?: string; uploadedById?: string }
    ) {
        // Parse the scan result first to get artifact info
        const parsed = this.trivyParser.parse(rawResult, dto.sourceType);

        // Resolve project - either use provided projectId or auto-create
        const resolvedProjectId = await this.resolveProject(projectId, dto, parsed.artifactName);

        // Create the scan result
        const scanResult = await this.prisma.scanResult.create({
            data: {
                projectId: resolvedProjectId,
                imageRef: dto.imageRef || parsed.artifactName || 'unknown',
                imageDigest: dto.imageDigest,
                tag: dto.tag,
                commitHash: dto.commitHash,
                branch: dto.branch,
                ciPipeline: dto.ciPipeline,
                ciJobUrl: dto.ciJobUrl,
                sourceType: dto.sourceType,
                trivyVersion: parsed.trivyVersion,
                schemaVersion: parsed.schemaVersion,
                rawResult: rawResult,
                artifactName: parsed.artifactName,
                artifactType: parsed.artifactType,
                // Source tracking
                uploaderIp: sourceInfo?.uploaderIp,
                userAgent: sourceInfo?.userAgent,
                uploadedById: sourceInfo?.uploadedById,
            },
        });

        // Process vulnerabilities and collect hashes for sync
        const newVulnHashes = await this.processVulnerabilities(scanResult.id, parsed.vulnerabilities);

        // Sync resolved vulnerabilities (auto-mark FIXED if not in new scan)
        try {
            const syncResult = await this.vulnSyncService.syncResolvedVulnerabilities(
                resolvedProjectId,
                scanResult.id,
                newVulnHashes,
            );
            if (syncResult.resolvedCount > 0) {
                this.logger.log(`Auto-resolved ${syncResult.resolvedCount} vulnerabilities for project ${resolvedProjectId}`);
            }
        } catch (error) {
            this.logger.warn(`Failed to sync resolved vulnerabilities: ${error.message}`);
            // Don't fail the scan upload if sync fails
        }

        // Process licenses from packages
        try {
            const licenseResult = await this.licenseParser.processLicenses(scanResult.id, rawResult);
            this.logger.log(`Processed ${licenseResult.processed} package licenses for scan ${scanResult.id}`);
        } catch (error) {
            this.logger.warn(`Failed to process licenses for scan ${scanResult.id}: ${error.message}`);
            // Don't fail the scan upload if license processing fails
        }

        // Create summary
        await this.createSummary(scanResult.id);

        return this.findById(scanResult.id);
    }

    /**
     * Resolve project ID - either use provided ID, find by name, or auto-create
     */
    private async resolveProject(
        projectId: string | undefined,
        dto: UploadScanDto,
        artifactName?: string,
    ): Promise<string> {
        // Case 1: projectId is provided - use it directly
        if (projectId) {
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            });
            if (!project) {
                throw new BadRequestException(`Project with ID ${projectId} not found`);
            }
            return projectId;
        }

        // Case 2: projectName is provided - find or create
        if (dto.projectName) {
            // Try to find existing project by name
            const existingProject = await this.prisma.project.findFirst({
                where: {
                    name: dto.projectName,
                    ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
                },
            });

            if (existingProject) {
                return existingProject.id;
            }

            // Create new project - organizationId is required for creation
            if (!dto.organizationId) {
                throw new BadRequestException(
                    'organizationId is required when creating a new project via projectName',
                );
            }

            const slug = dto.projectName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const newProject = await this.prisma.project.create({
                data: {
                    name: dto.projectName,
                    slug: slug || `project-${Date.now()}`,
                    organizationId: dto.organizationId,
                },
            });

            return newProject.id;
        }

        // Case 3: Use artifactName from scan result to create project
        if (artifactName && dto.organizationId) {
            // Extract a project name from artifact (e.g., 'registry.com/my-app:v1' -> 'my-app')
            const projectName = this.extractProjectNameFromArtifact(artifactName);

            // Try to find existing project
            const existingProject = await this.prisma.project.findFirst({
                where: {
                    name: projectName,
                    organizationId: dto.organizationId,
                },
            });

            if (existingProject) {
                return existingProject.id;
            }

            // Create new project
            const slug = projectName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const newProject = await this.prisma.project.create({
                data: {
                    name: projectName,
                    slug: slug || `project-${Date.now()}`,
                    organizationId: dto.organizationId,
                },
            });

            return newProject.id;
        }

        throw new BadRequestException(
            'Either projectId, projectName with organizationId, or organizationId (for auto-create from artifact) is required',
        );
    }

    /**
     * Extract a project name from artifact reference (e.g., 'registry.com/org/my-app:v1' -> 'my-app')
     */
    private extractProjectNameFromArtifact(artifactName: string): string {
        // Remove tag/digest
        const withoutTag = artifactName.split(':')[0].split('@')[0];
        // Get the last part after /
        const parts = withoutTag.split('/');
        return parts[parts.length - 1] || 'unknown-project';
    }


    private async processVulnerabilities(
        scanResultId: string,
        vulnerabilities: ParsedScanResult['vulnerabilities'],
    ): Promise<Set<string>> {
        const vulnHashes = new Set<string>();

        for (const vuln of vulnerabilities) {
            // Upsert vulnerability (CVE)
            await this.prisma.vulnerability.upsert({
                where: { cveId: vuln.cveId },
                create: {
                    cveId: vuln.cveId,
                    title: vuln.title,
                    description: vuln.description,
                    severity: vuln.severity,
                    cvssV3Score: vuln.cvssScore,
                    cvssV3Vector: vuln.cvssVector,
                    references: vuln.references,
                    cweIds: vuln.cweIds,
                    publishedAt: vuln.publishedAt,
                    lastModifiedAt: vuln.lastModifiedAt,
                },
                update: {
                    title: vuln.title,
                    description: vuln.description,
                    severity: vuln.severity,
                    cvssV3Score: vuln.cvssScore,
                    cvssV3Vector: vuln.cvssVector,
                    references: vuln.references,
                    cweIds: vuln.cweIds,
                    lastModifiedAt: vuln.lastModifiedAt,
                },
            });

            // Get the vulnerability ID
            const vulnerability = await this.prisma.vulnerability.findUnique({
                where: { cveId: vuln.cveId },
            });

            if (!vulnerability) continue;

            // Create vulnerability hash for deduplication
            const vulnHash = this.generateVulnHash(vuln.cveId, vuln.pkgName, vuln.pkgVersion);
            vulnHashes.add(vulnHash);

            // Create scan-vulnerability mapping
            await this.prisma.scanVulnerability.upsert({
                where: {
                    scanResultId_vulnHash: {
                        scanResultId,
                        vulnHash,
                    },
                },
                create: {
                    scanResultId,
                    vulnerabilityId: vulnerability.id,
                    pkgName: vuln.pkgName,
                    pkgVersion: vuln.pkgVersion,
                    fixedVersion: vuln.fixedVersion,
                    pkgPath: vuln.pkgPath,
                    layer: vuln.layer,
                    vulnHash,
                },
                update: {
                    fixedVersion: vuln.fixedVersion,
                    pkgPath: vuln.pkgPath,
                    layer: vuln.layer,
                },
            });
        }

        return vulnHashes;
    }


    private generateVulnHash(cveId: string, pkgName: string, pkgVersion: string): string {
        const data = `${cveId}:${pkgName}:${pkgVersion}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    private async createSummary(scanResultId: string) {
        const counts = await this.prisma.scanVulnerability.groupBy({
            by: ['scanResultId'],
            where: { scanResultId },
            _count: true,
        });

        const severityCounts = await this.prisma.$queryRaw<
            Array<{ severity: string; count: bigint }>
        >`
      SELECT v.severity, COUNT(*) as count
      FROM "ScanVulnerability" sv
      JOIN "Vulnerability" v ON sv."vulnerabilityId" = v.id
      WHERE sv."scanResultId" = ${scanResultId}
      GROUP BY v.severity
    `;

        const summary = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            unknown: 0,
            totalVulns: 0,
        };

        for (const row of severityCounts) {
            const count = Number(row.count);
            summary.totalVulns += count;

            switch (row.severity) {
                case 'CRITICAL':
                    summary.critical = count;
                    break;
                case 'HIGH':
                    summary.high = count;
                    break;
                case 'MEDIUM':
                    summary.medium = count;
                    break;
                case 'LOW':
                    summary.low = count;
                    break;
                default:
                    summary.unknown = count;
            }
        }

        await this.prisma.scanSummary.create({
            data: {
                scanResultId,
                ...summary,
            },
        });
    }

    async delete(id: string) {
        await this.findById(id);
        return this.prisma.scanResult.delete({ where: { id } });
    }

    /**
     * Compare two scans and return added/removed vulnerabilities
     */
    async compareScan(baseScanId: string, compareScanId: string) {
        // Get both scans with their vulnerabilities
        const [baseScan, compareScan] = await Promise.all([
            this.prisma.scanResult.findUnique({
                where: { id: baseScanId },
                include: {
                    summary: true,
                    vulnerabilities: {
                        include: {
                            vulnerability: true,
                        },
                    },
                },
            }),
            this.prisma.scanResult.findUnique({
                where: { id: compareScanId },
                include: {
                    summary: true,
                    vulnerabilities: {
                        include: {
                            vulnerability: true,
                        },
                    },
                },
            }),
        ]);

        if (!baseScan) {
            throw new NotFoundException(`Base scan ${baseScanId} not found`);
        }
        if (!compareScan) {
            throw new NotFoundException(`Compare scan ${compareScanId} not found`);
        }

        // Create sets of vulnerability hashes for comparison
        const baseVulnHashes = new Set(baseScan.vulnerabilities.map(v => v.vulnHash));
        const compareVulnHashes = new Set(compareScan.vulnerabilities.map(v => v.vulnHash));

        // Find added vulnerabilities (in compare but not in base)
        const added = compareScan.vulnerabilities
            .filter(v => !baseVulnHashes.has(v.vulnHash))
            .map(v => ({
                cveId: v.vulnerability.cveId,
                pkgName: v.pkgName,
                severity: v.vulnerability.severity,
                title: v.vulnerability.title || '',
                fixedVersion: v.fixedVersion,
            }));

        // Find removed vulnerabilities (in base but not in compare)
        const removed = baseScan.vulnerabilities
            .filter(v => !compareVulnHashes.has(v.vulnHash))
            .map(v => ({
                cveId: v.vulnerability.cveId,
                pkgName: v.pkgName,
                severity: v.vulnerability.severity,
                title: v.vulnerability.title || '',
                fixedVersion: v.fixedVersion,
            }));

        // Count unchanged
        const unchanged = baseScan.vulnerabilities.filter(v => compareVulnHashes.has(v.vulnHash)).length;

        return {
            baseScan: {
                id: baseScan.id,
                targetName: baseScan.imageRef || baseScan.artifactName || 'Unknown',
                date: baseScan.createdAt,
                totalVulnerabilities: baseScan.summary?.totalVulns || baseScan.vulnerabilities.length,
            },
            compareScan: {
                id: compareScan.id,
                targetName: compareScan.imageRef || compareScan.artifactName || 'Unknown',
                date: compareScan.createdAt,
                totalVulnerabilities: compareScan.summary?.totalVulns || compareScan.vulnerabilities.length,
            },
            added,
            removed,
            unchanged,
        };
    }
}

