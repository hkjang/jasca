import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { Severity, VulnStatus } from '@prisma/client';

@ApiTags('Vulnerabilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vulnerabilities')
export class VulnerabilitiesController {
    constructor(private readonly vulnService: VulnerabilitiesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all vulnerabilities with filters' })
    @ApiQuery({ name: 'projectId', required: false })
    @ApiQuery({ name: 'severity', required: false, isArray: true })
    @ApiQuery({ name: 'status', required: false, isArray: true })
    @ApiQuery({ name: 'cveId', required: false })
    @ApiQuery({ name: 'pkgName', required: false })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async findAll(
        @Query('projectId') projectId?: string,
        @Query('severity') severity?: Severity | Severity[],
        @Query('status') status?: VulnStatus | VulnStatus[],
        @Query('cveId') cveId?: string,
        @Query('pkgName') pkgName?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const severityArr = severity
            ? Array.isArray(severity)
                ? severity
                : [severity]
            : undefined;
        const statusArr = status
            ? Array.isArray(status)
                ? status
                : [status]
            : undefined;

        return this.vulnService.findAll(
            { projectId, severity: severityArr, status: statusArr, cveId, pkgName },
            {
                limit: limit ? parseInt(limit, 10) : undefined,
                offset: offset ? parseInt(offset, 10) : undefined,
            },
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get vulnerability by ID' })
    async findById(@Param('id') id: string) {
        return this.vulnService.findById(id);
    }

    @Get('cve/:cveId')
    @ApiOperation({ summary: 'Get CVE details' })
    async findByCveId(@Param('cveId') cveId: string) {
        return this.vulnService.findByCveId(cveId);
    }

    @Get('cve/:cveId/affected')
    @ApiOperation({ summary: 'Get all services affected by a CVE' })
    async findAffected(@Param('cveId') cveId: string) {
        return this.vulnService.findAffectedByVuln(cveId);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Update vulnerability status' })
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: VulnStatus; comment?: string },
        @CurrentUser() user: any,
    ) {
        return this.vulnService.updateStatus(id, body.status, user.id, user.role);
    }

    @Get(':id/available-transitions')
    @ApiOperation({ summary: 'Get available status transitions for a vulnerability' })
    async getAvailableTransitions(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.vulnService.getAvailableTransitions(id, user.role);
    }

    @Put(':id/assign')
    @ApiOperation({ summary: 'Assign vulnerability to a user' })
    async assign(
        @Param('id') id: string,
        @Body() body: { assigneeId: string | null },
    ) {
        return this.vulnService.assignUser(id, body.assigneeId);
    }

    @Post(':id/comments')
    @ApiOperation({ summary: 'Add comment to vulnerability' })
    async addComment(
        @Param('id') id: string,
        @Body() body: { content: string },
        @CurrentUser() user: any,
    ) {
        return this.vulnService.addComment(id, user.id, body.content);
    }

    @Get(':id/history')
    @ApiOperation({ summary: 'Get vulnerability history (status changes (& comments)' })
    async getHistory(@Param('id') id: string) {
        return this.vulnService.getHistory(id);
    }
}

