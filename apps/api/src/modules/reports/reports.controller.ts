import { Controller, Get, Post, Put, Delete, Query, Param, Body, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    @ApiOperation({ summary: 'List all reports' })
    async findAll() {
        return this.reportsService.findAll();
    }

    // Fixed routes must come before parameter routes
    @Get('vulnerability/generate')
    @ApiOperation({ summary: 'Generate vulnerability report' })
    @ApiQuery({ name: 'projectId', required: true })
    async generateReport(@Query('projectId') projectId: string) {
        return this.reportsService.generateVulnerabilityReport(projectId);
    }

    @Get('export/csv')
    @ApiOperation({ summary: 'Export vulnerability report as CSV' })
    @ApiQuery({ name: 'projectId', required: true })
    async exportCsv(
        @Query('projectId') projectId: string,
        @Res() res: Response,
    ) {
        const csv = await this.reportsService.exportToCsv(projectId);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=vulnerability-report-${projectId}.csv`,
        );
        res.send(csv);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get report by ID' })
    async findOne(@Param('id') id: string) {
        return this.reportsService.findOne(id);
    }

    @Get(':id/download')
    @ApiOperation({ summary: 'Download a completed report' })
    async download(@Param('id') id: string, @Res() res: Response) {
        const report = await this.reportsService.findOne(id);

        if (!report || report.status !== 'completed') {
            throw new NotFoundException('Report not found or not yet completed');
        }

        // Get report content from parameters
        const reportData = await this.reportsService.getReportContent(id);

        // Encode filename for RFC 5987 to support non-ASCII characters
        const sanitizedName = report.name.replace(/\s+/g, '_');
        const encodedFilename = encodeURIComponent(sanitizedName);

        if (report.format === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="report.csv"; filename*=UTF-8''${encodedFilename}.csv`,
            );
            res.send(this.convertToCSV(reportData));
        } else {
            // Generate actual PDF using pdfkit
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="report.pdf"; filename*=UTF-8''${encodedFilename}.pdf`,
            );

            const doc = new PDFDocument({ margin: 50 });
            doc.pipe(res);

            // Register Korean font for proper character display
            // Try dist folder first (production), then src folder (development)
            const distFontPath = path.join(process.cwd(), 'dist/assets/fonts/NotoSansKR.otf');
            const srcFontPath = path.join(process.cwd(), 'src/assets/fonts/NotoSansKR.otf');
            const fs = require('fs');
            const fontPath = fs.existsSync(distFontPath) ? distFontPath : srcFontPath;
            doc.registerFont('NotoSansKR', fontPath);
            doc.font('NotoSansKR');

            // Title
            doc.fontSize(24).text(report.name, { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
            doc.moveDown(2);

            // Summary section
            if (reportData.summary && typeof reportData.summary === 'object') {
                doc.fontSize(16).text('Summary', { underline: true });
                doc.moveDown(0.5);
                const summary = reportData.summary as Record<string, unknown>;
                Object.entries(summary).forEach(([key, value]) => {
                    doc.fontSize(12).text(`${key}: ${value}`);
                });
                doc.moveDown();
            }

            // Top Vulnerabilities section
            if (reportData.topVulnerabilities && Array.isArray(reportData.topVulnerabilities)) {
                doc.fontSize(16).text('Vulnerabilities', { underline: true });
                doc.moveDown(0.5);
                (reportData.topVulnerabilities as Record<string, unknown>[]).forEach((v, i) => {
                    doc.fontSize(11).text(`${i + 1}. ${v.cveId || 'N/A'} - ${v.severity || 'Unknown'}`);
                    if (v.title) {
                        doc.fontSize(10).text(`   Title: ${v.title}`);
                    }
                    if (v.package) {
                        doc.fontSize(10).text(`   Package: ${v.package}`);
                    }
                    doc.moveDown(0.3);
                });
            }

            // Projects section
            if (reportData.projects && Array.isArray(reportData.projects)) {
                doc.addPage();
                doc.fontSize(16).text('Projects', { underline: true });
                doc.moveDown(0.5);
                (reportData.projects as Record<string, unknown>[]).forEach((p) => {
                    doc.fontSize(12).text(`${p.name} - Scans: ${p.scanCount}`);
                });
            }

            doc.end();
        }
    }

    @Post()
    @ApiOperation({ summary: 'Create a new report' })
    async create(
        @Body() data: {
            name: string;
            type: string;
            format: string;
            parameters?: Record<string, unknown>;
        },
    ) {
        return this.reportsService.create(data);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a report' })
    async update(
        @Param('id') id: string,
        @Body() data: {
            name?: string;
            format?: string;
        },
    ) {
        return this.reportsService.update(id, data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a report' })
    async remove(@Param('id') id: string) {
        return this.reportsService.remove(id);
    }

    private convertToCSV(data: Record<string, unknown>): string {
        const lines: string[] = [];
        lines.push(`Generated At,${data.generatedAt || new Date().toISOString()}`);
        lines.push('');

        // Handle different report types
        if (data.summary && typeof data.summary === 'object') {
            lines.push('Summary');
            const summary = data.summary as Record<string, unknown>;
            Object.entries(summary).forEach(([key, value]) => {
                lines.push(`${key},${value}`);
            });
            lines.push('');
        }

        if (data.topVulnerabilities && Array.isArray(data.topVulnerabilities)) {
            lines.push('CVE ID,Severity,Title,Package,Project');
            (data.topVulnerabilities as Record<string, unknown>[]).forEach(v => {
                lines.push(`${v.cveId},${v.severity},"${(v.title || '').toString().replace(/"/g, '""')}",${v.package},${v.project || ''}`);
            });
        }

        if (data.projects && Array.isArray(data.projects)) {
            lines.push('ID,Name,Scan Count,Last Updated');
            (data.projects as Record<string, unknown>[]).forEach(p => {
                lines.push(`${p.id},${p.name},${p.scanCount},${p.lastUpdated}`);
            });
        }

        if (data.dailyTrend && Array.isArray(data.dailyTrend)) {
            lines.push('Date,Total,Critical,High');
            (data.dailyTrend as Record<string, unknown>[]).forEach(d => {
                lines.push(`${d.date},${d.total},${d.critical},${d.high}`);
            });
        }

        return lines.join('\n');
    }
}
