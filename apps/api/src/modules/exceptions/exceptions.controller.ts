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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExceptionsService } from './exceptions.service';
import { ExceptionType } from '@prisma/client';

@ApiTags('Exceptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exceptions')
export class ExceptionsController {
    constructor(private readonly exceptionsService: ExceptionsService) {}

    @Get()
    @ApiOperation({ summary: 'Get all exception requests' })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'all'] })
    async findAll(
        @Query('status') status?: string,
        @CurrentUser() user?: any,
    ) {
        return this.exceptionsService.findAll(status, user?.organizationId);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get my exception requests' })
    async getMyExceptions(@CurrentUser() user: any) {
        return this.exceptionsService.getMyExceptions(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get exception by ID' })
    async findById(@Param('id') id: string) {
        return this.exceptionsService.findById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new exception request' })
    async create(
        @Body() body: {
            policyId?: string;
            scanVulnerabilityId?: string;
            cveId?: string;
            reason: string;
            expiresAt?: string;
            exceptionType?: string;
        },
        @CurrentUser() user: any,
    ) {
        return this.exceptionsService.create(
            {
                policyId: body.policyId,
                scanVulnerabilityId: body.scanVulnerabilityId,
                cveId: body.cveId,
                reason: body.reason,
                expiresAt: body.expiresAt,
                exceptionType: (body.exceptionType?.toUpperCase() as ExceptionType) || 'CVE',
                targetValue: body.cveId || body.scanVulnerabilityId || 'unknown',
            },
            user.id,
        );
    }

    @Put(':id/approve')
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN', 'SECURITY_ADMIN')
    @ApiOperation({ summary: 'Approve an exception request' })
    async approve(@Param('id') id: string, @CurrentUser() user: any) {
        return this.exceptionsService.approve(id, user.id);
    }

    @Put(':id/reject')
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN', 'SECURITY_ADMIN')
    @ApiOperation({ summary: 'Reject an exception request' })
    async reject(
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @CurrentUser() user: any,
    ) {
        return this.exceptionsService.reject(id, user.id, body.reason);
    }
}
