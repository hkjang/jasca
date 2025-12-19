import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(organizationId?: string) {
        return this.prisma.project.findMany({
            where: organizationId ? { organizationId } : undefined,
            include: {
                organization: true,
                _count: {
                    select: { scanResults: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                organization: true,
                registries: true,
                scanResults: {
                    include: { summary: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                _count: {
                    select: { scanResults: true },
                },
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        // Calculate stats from the latest scan result
        const latestScan = project.scanResults[0];
        const summary = latestScan?.summary;
        const stats = {
            totalScans: project._count.scanResults,
            lastScanAt: latestScan?.createdAt?.toISOString(),
            vulnerabilities: {
                critical: summary?.critical || 0,
                high: summary?.high || 0,
                medium: summary?.medium || 0,
                low: summary?.low || 0,
                total: summary?.totalVulns || 0,
            },
        };

        // Calculate risk level based on vulnerabilities
        let riskLevel = 'NONE';
        if (stats.vulnerabilities.critical > 0) riskLevel = 'CRITICAL';
        else if (stats.vulnerabilities.high > 0) riskLevel = 'HIGH';
        else if (stats.vulnerabilities.medium > 0) riskLevel = 'MEDIUM';
        else if (stats.vulnerabilities.low > 0) riskLevel = 'LOW';

        return {
            ...project,
            scanResults: undefined, // Don't include full scan results
            stats,
            riskLevel,
        };
    }

    async create(organizationId: string, dto: CreateProjectDto) {
        const existing = await this.prisma.project.findFirst({
            where: {
                organizationId,
                slug: dto.slug,
            },
        });

        if (existing) {
            throw new ConflictException('Project slug already exists in this organization');
        }

        return this.prisma.project.create({
            data: {
                name: dto.name,
                slug: dto.slug,
                description: dto.description,
                organizationId,
            },
        });
    }

    async update(id: string, data: Partial<CreateProjectDto>) {
        await this.findById(id);

        return this.prisma.project.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findById(id);

        return this.prisma.project.delete({
            where: { id },
        });
    }

    async getVulnerabilityTrend(projectId: string, days: number) {
        // Get scan results with summaries for the last N days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const scanResults = await this.prisma.scanResult.findMany({
            where: {
                projectId,
                createdAt: { gte: startDate },
            },
            include: { summary: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by date and aggregate
        const trendMap = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();

        for (const scan of scanResults) {
            const dateKey = scan.createdAt.toISOString().split('T')[0];
            const existing = trendMap.get(dateKey) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

            if (scan.summary) {
                existing.critical += scan.summary.critical || 0;
                existing.high += scan.summary.high || 0;
                existing.medium += scan.summary.medium || 0;
                existing.low += scan.summary.low || 0;
                existing.total += scan.summary.totalVulns || 0;
            }

            trendMap.set(dateKey, existing);
        }

        // Convert to array and fill missing dates
        const trend = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateKey = date.toISOString().split('T')[0];
            trend.push({
                date: dateKey,
                ...(trendMap.get(dateKey) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 }),
            });
        }
        // Return just the trend array (frontend expects array directly)
        return trend;
    }
}

