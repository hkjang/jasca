import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SeverityCounts {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
}

@Injectable()
export class StatsService {
    constructor(private readonly prisma: PrismaService) { }

    async getOverview(organizationId?: string) {
        const projectFilter = organizationId
            ? { project: { organizationId } }
            : {};

        const [totalScans, totalVulns, statusCounts] = await Promise.all([
            this.prisma.scanResult.count({
                where: projectFilter,
            }),
            this.prisma.scanVulnerability.count({
                where: { scanResult: projectFilter },
            }),
            this.prisma.scanVulnerability.groupBy({
                by: ['status'],
                where: { scanResult: projectFilter },
                _count: true,
            }),
        ]);

        // Get severity counts
        const vulnsWithSeverity = await this.prisma.scanVulnerability.findMany({
            where: { scanResult: projectFilter },
            include: { vulnerability: { select: { severity: true } } },
        });

        const severityCounts: SeverityCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            unknown: 0,
        };

        for (const v of vulnsWithSeverity) {
            const severity = v.vulnerability?.severity?.toLowerCase() || 'unknown';
            if (severity === 'critical') severityCounts.critical++;
            else if (severity === 'high') severityCounts.high++;
            else if (severity === 'medium') severityCounts.medium++;
            else if (severity === 'low') severityCounts.low++;
            else severityCounts.unknown++;
        }

        const byStatus: Record<string, number> = {};
        for (const item of statusCounts) {
            byStatus[item.status.toLowerCase()] = item._count;
        }

        return {
            totalScans,
            totalVulnerabilities: totalVulns,
            bySeverity: severityCounts,
            byStatus,
        };
    }

    async getByProject(organizationId?: string) {
        const where = organizationId ? { organizationId } : {};

        const projects = await this.prisma.project.findMany({
            where,
            include: {
                organization: true,
                scanResults: {
                    include: { summary: true },
                    orderBy: { createdAt: 'desc' as const },
                    take: 1,
                },
                _count: { select: { scanResults: true } },
            },
        });

        return projects.map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
            organization: project.organization?.name,
            totalScans: project._count.scanResults,
            lastScan: project.scanResults[0]
                ? {
                    id: project.scanResults[0].id,
                    scannedAt: project.scanResults[0].scannedAt,
                    summary: project.scanResults[0].summary,
                }
                : null,
        }));
    }

    async getTrend(organizationId?: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const projectFilter = organizationId
            ? { project: { organizationId } }
            : {};

        const scans = await this.prisma.scanResult.findMany({
            where: {
                ...projectFilter,
                createdAt: { gte: startDate },
            },
            include: {
                vulnerabilities: {
                    include: { vulnerability: { select: { severity: true } } },
                },
            },
            orderBy: { createdAt: 'asc' as const },
        });

        const byDate = new Map<string, SeverityCounts>();

        for (const scan of scans) {
            const dateKey = scan.createdAt.toISOString().split('T')[0];
            if (!byDate.has(dateKey)) {
                byDate.set(dateKey, { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 });
            }

            const entry = byDate.get(dateKey)!;
            for (const sv of scan.vulnerabilities) {
                const severity = sv.vulnerability?.severity?.toLowerCase() || 'unknown';
                if (severity === 'critical') entry.critical++;
                else if (severity === 'high') entry.high++;
                else if (severity === 'medium') entry.medium++;
                else if (severity === 'low') entry.low++;
            }
        }

        return Array.from(byDate.entries()).map(([date, counts]) => ({
            date,
            ...counts,
        }));
    }
}
