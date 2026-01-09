import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LicensesService, LicenseStats, LicenseSummary, TrackedLicenseInfo } from './licenses.service';
import { LicenseClassification } from '@prisma/client';

@ApiTags('Licenses')
@Controller('licenses')
export class LicensesController {
    constructor(private readonly licensesService: LicensesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all known licenses' })
    @ApiQuery({ name: 'classification', required: false, enum: LicenseClassification })
    @ApiQuery({ name: 'search', required: false })
    async findAll(
        @Query('classification') classification?: LicenseClassification,
        @Query('search') search?: string,
    ) {
        return this.licensesService.findAll({ classification, search });
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get license statistics' })
    @ApiQuery({ name: 'projectId', required: false })
    async getStats(@Query('projectId') projectId?: string): Promise<LicenseStats> {
        return this.licensesService.getStats(projectId);
    }

    @Get('tracked')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all licenses with project/scan tracking info' })
    @ApiQuery({ name: 'projectId', required: false })
    @ApiQuery({ name: 'classification', required: false, enum: LicenseClassification })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async getTrackedLicenses(
        @Query('projectId') projectId?: string,
        @Query('classification') classification?: LicenseClassification,
        @Query('search') search?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ): Promise<{ data: TrackedLicenseInfo[]; total: number }> {
        return this.licensesService.getTrackedLicenses({
            projectId,
            classification,
            search,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    @Get('by-project-summary')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get licenses summary grouped by project' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of projects to return (default: 20)' })
    @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
    @ApiQuery({ name: 'search', required: false, description: 'Search projects by name' })
    async getLicensesByProjectSummary(
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('search') search?: string,
    ) {
        return this.licensesService.getLicensesByProjectSummary({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            search,
        });
    }

    @Get('by-project/:projectId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get licenses for a project (latest scan)' })
    async findByProject(@Param('projectId') projectId: string): Promise<LicenseSummary[]> {
        return this.licensesService.findByProject(projectId);
    }

    @Get('by-scan/:scanId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get licenses for a specific scan' })
    async findByScan(@Param('scanId') scanId: string): Promise<LicenseSummary[]> {
        return this.licensesService.findByScan(scanId);
    }

    @Get('by-scan/:scanId/packages')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get packages with a specific license in a scan' })
    @ApiQuery({ name: 'licenseName', required: true })
    async getPackagesByLicense(
        @Param('scanId') scanId: string,
        @Query('licenseName') licenseName: string,
    ) {
        return this.licensesService.getPackagesByLicense(scanId, licenseName);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get license by ID' })
    async findById(@Param('id') id: string) {
        return this.licensesService.findById(id);
    }

    @Post('seed')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Seed default licenses (admin only)' })
    async seedDefaults() {
        return this.licensesService.seedDefaultLicenses();
    }
}

