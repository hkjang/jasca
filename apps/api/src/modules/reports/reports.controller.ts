import { Controller, Get, Post, Delete, Query, Param, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

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

    @Get(':id')
    @ApiOperation({ summary: 'Get report by ID' })
    async findOne(@Param('id') id: string) {
        return this.reportsService.findOne(id);
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

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a report' })
    async remove(@Param('id') id: string) {
        return this.reportsService.remove(id);
    }

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
}
