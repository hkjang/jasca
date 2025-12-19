import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        const reports = await this.prisma.report.findMany({
            include: {
                template: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return reports.map(report => ({
            id: report.id,
            name: report.name,
            type: report.template.type.toLowerCase().replace('_', '_'),
            status: report.status.toLowerCase(),
            format: report.fileType || 'pdf',
            createdAt: report.createdAt.toISOString(),
            completedAt: report.completedAt?.toISOString(),
            downloadUrl: report.filePath ? `/api/reports/${report.id}/download` : undefined,
        }));
    }

    async findOne(id: string) {
        const report = await this.prisma.report.findUnique({
            where: { id },
            include: {
                template: true,
            },
        });

        if (!report) {
            throw new NotFoundException(`Report with ID ${id} not found`);
        }

        return {
            id: report.id,
            name: report.name,
            type: report.template.type.toLowerCase(),
            status: report.status.toLowerCase(),
            format: report.fileType || 'pdf',
            createdAt: report.createdAt.toISOString(),
            completedAt: report.completedAt?.toISOString(),
            downloadUrl: report.filePath ? `/api/reports/${report.id}/download` : undefined,
            parameters: report.parameters,
        };
    }

    async create(data: {
        name: string;
        type: string;
        format: string;
        parameters?: Record<string, unknown>;
    }) {
        // Find or create a template for the report type
        const templateType = data.type.toUpperCase().replace('-', '_') as any;
        let template = await this.prisma.reportTemplate.findFirst({
            where: { type: templateType },
        });

        if (!template) {
            template = await this.prisma.reportTemplate.create({
                data: {
                    name: `${data.type} Template`,
                    type: templateType,
                    config: {},
                    isSystem: true,
                },
            });
        }

        const report = await this.prisma.report.create({
            data: {
                name: data.name,
                templateId: template.id,
                parameters: (data.parameters || {}) as Prisma.InputJsonValue,
                status: 'PENDING',
                fileType: data.format,
            },
            include: {
                template: true,
            },
        });

        // Trigger async report generation
        this.processReport(report.id).catch((err) => {
            console.error(`Failed to process report ${report.id}:`, err);
        });

        return {
            id: report.id,
            name: report.name,
            type: report.template.type.toLowerCase(),
            status: report.status.toLowerCase(),
            format: report.fileType || 'pdf',
            createdAt: report.createdAt.toISOString(),
        };
    }

    /**
     * Process a pending report asynchronously
     * This generates the actual report content and updates the status
     */
    private async processReport(reportId: string): Promise<void> {
        try {
            // Update status to GENERATING
            await this.prisma.report.update({
                where: { id: reportId },
                data: { status: 'GENERATING' },
            });

            const report = await this.prisma.report.findUnique({
                where: { id: reportId },
                include: { template: true },
            });

            if (!report) {
                throw new Error(`Report ${reportId} not found`);
            }

            // Generate report content based on type
            const reportContent = await this.generateReportContent(report);

            // Simulate file creation (in production, this would create actual PDF/CSV files)
            const filePath = `/reports/${reportId}.${report.fileType || 'pdf'}`;

            // Update report with completed status and file path
            await this.prisma.report.update({
                where: { id: reportId },
                data: {
                    status: 'COMPLETED',
                    filePath,
                    completedAt: new Date(),
                    parameters: {
                        ...(report.parameters as Record<string, unknown> || {}),
                        generatedContent: reportContent,
                    } as Prisma.InputJsonValue,
                },
            });

            console.log(`Report ${reportId} processed successfully`);
        } catch (error) {
            console.error(`Error processing report ${reportId}:`, error);

            // Update status to FAILED
            await this.prisma.report.update({
                where: { id: reportId },
                data: { status: 'FAILED' },
            });
        }
    }

    /**
     * Generate report content based on template type
     */
    private async generateReportContent(report: {
        template: { type: string };
        parameters: unknown;
    }): Promise<Record<string, unknown>> {
        const templateType = report.template.type;

        switch (templateType) {
            case 'VULNERABILITY_SUMMARY':
                return this.generateVulnerabilitySummaryContent();
            case 'TREND_ANALYSIS':
                return this.generateTrendAnalysisContent();
            case 'COMPLIANCE_AUDIT':
                return this.generateComplianceAuditContent();
            case 'PROJECT_STATUS':
                return this.generateProjectStatusContent();
            default:
                return this.generateDefaultContent();
        }
    }

    private async generateVulnerabilitySummaryContent(): Promise<Record<string, unknown>> {
        const vulnerabilities = await this.prisma.scanVulnerability.findMany({
            include: {
                vulnerability: true,
                scanResult: { include: { project: true } },
            },
            take: 100,
        });

        const summary = {
            total: vulnerabilities.length,
            critical: vulnerabilities.filter(v => v.vulnerability.severity === 'CRITICAL').length,
            high: vulnerabilities.filter(v => v.vulnerability.severity === 'HIGH').length,
            medium: vulnerabilities.filter(v => v.vulnerability.severity === 'MEDIUM').length,
            low: vulnerabilities.filter(v => v.vulnerability.severity === 'LOW').length,
        };

        return {
            generatedAt: new Date().toISOString(),
            summary,
            topVulnerabilities: vulnerabilities.slice(0, 20).map(v => ({
                cveId: v.vulnerability.cveId,
                severity: v.vulnerability.severity,
                title: v.vulnerability.title,
                package: v.pkgName,
                project: v.scanResult.project?.name,
            })),
        };
    }

    private async generateTrendAnalysisContent(): Promise<Record<string, unknown>> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recentVulnerabilities = await this.prisma.scanVulnerability.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
            include: { vulnerability: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by date
        const dailyData: Record<string, { total: number; critical: number; high: number }> = {};
        recentVulnerabilities.forEach(v => {
            const date = v.createdAt.toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { total: 0, critical: 0, high: 0 };
            }
            dailyData[date].total++;
            if (v.vulnerability.severity === 'CRITICAL') dailyData[date].critical++;
            if (v.vulnerability.severity === 'HIGH') dailyData[date].high++;
        });

        return {
            generatedAt: new Date().toISOString(),
            period: { start: thirtyDaysAgo.toISOString(), end: now.toISOString() },
            dailyTrend: Object.entries(dailyData).map(([date, data]) => ({
                date,
                ...data,
            })),
            summary: {
                totalNew: recentVulnerabilities.length,
                avgPerDay: Math.round(recentVulnerabilities.length / 30 * 100) / 100,
            },
        };
    }

    private async generateComplianceAuditContent(): Promise<Record<string, unknown>> {
        const [totalScans, totalVulnerabilities, resolvedVulnerabilities] = await Promise.all([
            this.prisma.scanResult.count(),
            this.prisma.scanVulnerability.count(),
            this.prisma.scanVulnerability.count({ where: { status: 'FIXED' } }),
        ]);

        return {
            generatedAt: new Date().toISOString(),
            auditSummary: {
                totalScansPerformed: totalScans,
                totalVulnerabilitiesFound: totalVulnerabilities,
                vulnerabilitiesResolved: resolvedVulnerabilities,
                resolutionRate: totalVulnerabilities > 0
                    ? Math.round((resolvedVulnerabilities / totalVulnerabilities) * 100)
                    : 100,
            },
            complianceStatus: 'REVIEWED',
        };
    }

    private async generateProjectStatusContent(): Promise<Record<string, unknown>> {
        const projects = await this.prisma.project.findMany({
            include: {
                _count: { select: { scanResults: true } },
            },
            take: 50,
        });

        return {
            generatedAt: new Date().toISOString(),
            projects: projects.map(p => ({
                id: p.id,
                name: p.name,
                scanCount: p._count.scanResults,
                lastUpdated: p.updatedAt.toISOString(),
            })),
            totalProjects: projects.length,
        };
    }

    private async generateDefaultContent(): Promise<Record<string, unknown>> {
        return {
            generatedAt: new Date().toISOString(),
            message: 'Report generated successfully',
        };
    }

    /**
     * Get the generated content of a completed report
     */
    async getReportContent(id: string): Promise<Record<string, unknown>> {
        const report = await this.prisma.report.findUnique({
            where: { id },
        });

        if (!report) {
            throw new NotFoundException(`Report with ID ${id} not found`);
        }

        const params = report.parameters as Record<string, unknown> || {};
        return (params.generatedContent as Record<string, unknown>) || {
            generatedAt: new Date().toISOString(),
            message: 'Report content not available',
        };
    }

    async update(id: string, data: { name?: string; format?: string }) {
        const report = await this.prisma.report.findUnique({
            where: { id },
            include: { template: true },
        });

        if (!report) {
            throw new NotFoundException(`Report with ID ${id} not found`);
        }

        const updated = await this.prisma.report.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.format && { fileType: data.format }),
            },
            include: { template: true },
        });

        return {
            id: updated.id,
            name: updated.name,
            type: updated.template.type.toLowerCase(),
            status: updated.status.toLowerCase(),
            format: updated.fileType || 'pdf',
            createdAt: updated.createdAt.toISOString(),
            completedAt: updated.completedAt?.toISOString(),
            downloadUrl: updated.filePath ? `/api/reports/${updated.id}/download` : undefined,
        };
    }

    async remove(id: string) {
        const report = await this.prisma.report.findUnique({
            where: { id },
        });

        if (!report) {
            throw new NotFoundException(`Report with ID ${id} not found`);
        }

        await this.prisma.report.delete({
            where: { id },
        });

        return { success: true };
    }

    async generateVulnerabilityReport(projectId: string) {
        const vulnerabilities = await this.prisma.scanVulnerability.findMany({
            where: {
                scanResult: { projectId },
                status: { notIn: ['FIXED', 'FALSE_POSITIVE'] },
            },
            include: {
                vulnerability: true,
                scanResult: true,
                assignee: { select: { name: true, email: true } },
            },
            orderBy: [
                { vulnerability: { severity: 'asc' } },
                { createdAt: 'desc' },
            ],
        });

        return {
            generatedAt: new Date().toISOString(),
            projectId,
            summary: {
                total: vulnerabilities.length,
                critical: vulnerabilities.filter(v => v.vulnerability.severity === 'CRITICAL').length,
                high: vulnerabilities.filter(v => v.vulnerability.severity === 'HIGH').length,
                medium: vulnerabilities.filter(v => v.vulnerability.severity === 'MEDIUM').length,
                low: vulnerabilities.filter(v => v.vulnerability.severity === 'LOW').length,
            },
            vulnerabilities: vulnerabilities.map(v => ({
                cveId: v.vulnerability.cveId,
                severity: v.vulnerability.severity,
                title: v.vulnerability.title,
                package: v.pkgName,
                version: v.pkgVersion,
                fixedVersion: v.fixedVersion,
                status: v.status,
                assignee: v.assignee?.name,
                imageRef: v.scanResult.imageRef,
                scannedAt: v.scanResult.scannedAt,
            })),
        };
    }

    async exportToCsv(projectId: string): Promise<string> {
        const report = await this.generateVulnerabilityReport(projectId);

        const headers = [
            'CVE ID',
            'Severity',
            'Title',
            'Package',
            'Version',
            'Fixed Version',
            'Status',
            'Assignee',
            'Image',
            'Scanned At',
        ];

        const rows = report.vulnerabilities.map(v => [
            v.cveId,
            v.severity,
            `"${(v.title || '').replace(/"/g, '""')}"`,
            v.package,
            v.version,
            v.fixedVersion || '',
            v.status,
            v.assignee || '',
            v.imageRef,
            v.scannedAt,
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
}

