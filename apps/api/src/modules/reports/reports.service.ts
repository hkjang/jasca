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

        return {
            id: report.id,
            name: report.name,
            type: report.template.type.toLowerCase(),
            status: report.status.toLowerCase(),
            format: report.fileType || 'pdf',
            createdAt: report.createdAt.toISOString(),
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

