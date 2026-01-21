import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Service to synchronize vulnerability statuses when new scans are uploaded.
 * When a new scan is uploaded, vulnerabilities that were present in previous scans
 * but are no longer present in the new scan are automatically marked as FIXED.
 */
@Injectable()
export class VulnSyncService {
    private readonly logger = new Logger(VulnSyncService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Sync resolved vulnerabilities after a new scan is uploaded.
     * Marks vulnerabilities from previous scans as FIXED if they are no longer present in the new scan.
     * 
     * @param projectId - The project ID
     * @param newScanId - The ID of the newly uploaded scan
     * @param newVulnHashes - Set of vulnerability hashes from the new scan
     */
    async syncResolvedVulnerabilities(
        projectId: string,
        newScanId: string,
        newVulnHashes: Set<string>,
    ): Promise<{ resolvedCount: number }> {
        // Find all previous scans for this project (excluding the new one)
        const previousScans = await this.prisma.scanResult.findMany({
            where: {
                projectId,
                id: { not: newScanId },
            },
            select: { id: true },
            orderBy: { createdAt: 'desc' },
        });

        if (previousScans.length === 0) {
            this.logger.log(`No previous scans found for project ${projectId}, skipping sync`);
            return { resolvedCount: 0 };
        }

        const previousScanIds = previousScans.map(s => s.id);

        // Find vulnerabilities from previous scans that:
        // 1. Are not in the new scan (by vulnHash)
        // 2. Have status OPEN, ASSIGNED, or IN_PROGRESS (not already resolved)
        const unresolvedVulns = await this.prisma.scanVulnerability.findMany({
            where: {
                scanResultId: { in: previousScanIds },
                status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
            },
            include: {
                vulnerability: { select: { cveId: true } },
                scanResult: { select: { id: true, createdAt: true } },
            },
        });

        // Filter to only those not present in the new scan
        const vulnsToResolve = unresolvedVulns.filter(v => !newVulnHashes.has(v.vulnHash));

        if (vulnsToResolve.length === 0) {
            this.logger.log(`No vulnerabilities to auto-resolve for project ${projectId}`);
            return { resolvedCount: 0 };
        }

        this.logger.log(
            `Auto-resolving ${vulnsToResolve.length} vulnerabilities for project ${projectId}`,
        );

        // Update each vulnerability to FIXED and create workflow history
        const resolvedIds: string[] = [];
        
        for (const vuln of vulnsToResolve) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    // Update status to FIXED
                    await tx.scanVulnerability.update({
                        where: { id: vuln.id },
                        data: { 
                            status: 'FIXED',
                            updatedAt: new Date(),
                        },
                    });

                    // Create workflow history entry
                    // Note: We need a system user ID for automated changes
                    // Using a special marker to indicate this was automated
                    await tx.vulnerabilityWorkflow.create({
                        data: {
                            scanVulnerabilityId: vuln.id,
                            fromStatus: vuln.status,
                            toStatus: 'FIXED',
                            changedById: await this.getSystemUserId(tx),
                            comment: `새 스캔에서 더 이상 발견되지 않아 자동으로 해결됨 (스캔 ID: ${newScanId})`,
                            evidence: {
                                autoResolved: true,
                                newScanId,
                                resolvedAt: new Date().toISOString(),
                            },
                        },
                    });
                });

                resolvedIds.push(vuln.id);
            } catch (error) {
                this.logger.warn(
                    `Failed to auto-resolve vulnerability ${vuln.id} (${vuln.vulnerability.cveId}): ${error.message}`,
                );
            }
        }

        this.logger.log(
            `Successfully auto-resolved ${resolvedIds.length} vulnerabilities for project ${projectId}`,
        );

        return { resolvedCount: resolvedIds.length };
    }

    /**
     * Get or create a system user for automated workflow changes.
     * Falls back to the first admin user if no system user exists.
     */
    private async getSystemUserId(tx: any): Promise<string> {
        // Try to find a system user
        let systemUser = await tx.user.findFirst({
            where: {
                email: 'system@jasca.local',
            },
            select: { id: true },
        });

        if (systemUser) {
            return systemUser.id;
        }

        // Fallback: find any admin user
        const adminUser = await tx.user.findFirst({
            where: {
                roles: {
                    some: {
                        role: { in: ['SYSTEM_ADMIN', 'ORG_ADMIN'] },
                    },
                },
            },
            select: { id: true },
        });

        if (adminUser) {
            return adminUser.id;
        }

        // Last fallback: find any user
        const anyUser = await tx.user.findFirst({
            select: { id: true },
        });

        if (anyUser) {
            return anyUser.id;
        }

        throw new Error('No user found for workflow history');
    }
}
