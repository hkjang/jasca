import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiConsumes,
    ApiQuery,
    ApiSecurity,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScansService } from './scans.service';
import { UploadScanDto } from './dto/upload-scan.dto';

@ApiTags('Scans')
@Controller('scans')
export class ScansController {
    constructor(private readonly scansService: ScansService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all scan results' })
    @ApiQuery({ name: 'projectId', required: false, description: 'Project ID - if not provided, projectName and organizationId in body will be used to find/create project' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async findAll(
        @Query('projectId') projectId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.scansService.findAll(projectId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get scan result by ID' })
    async findById(@Param('id') id: string) {
        return this.scansService.findById(id);
    }

    @Post('upload')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiSecurity('api-key')
    @ApiOperation({ summary: 'Upload a Trivy scan result (projectId optional - can auto-create project)' })
    @ApiQuery({ name: 'projectId', required: false, description: 'Project ID - if not provided, use projectName & organizationId in body' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @Query('projectId') projectId: string | undefined,
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Build DTO from form fields (multipart form sends fields individually)
        const dto: UploadScanDto = {
            sourceType: body.sourceType || 'TRIVY_JSON',
            projectName: body.projectName,
            organizationId: body.organizationId,
            imageRef: body.imageRef,
            imageDigest: body.imageDigest,
            tag: body.tag,
            commitHash: body.commitHash,
            branch: body.branch,
            ciPipeline: body.ciPipeline,
            ciJobUrl: body.ciJobUrl,
        };

        // Capture upload source info
        const uploaderIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const uploadedById = (req as any).user?.id;

        const rawResult = JSON.parse(file.buffer.toString('utf-8'));
        return this.scansService.uploadScan(projectId, dto, rawResult, {
            uploaderIp,
            userAgent,
            uploadedById,
        });
    }

    @Post('upload/json')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiSecurity('api-key')
    @ApiOperation({ summary: 'Upload a Trivy scan result as JSON body (projectId optional)' })
    @ApiQuery({ name: 'projectId', required: false, description: 'Project ID - if not provided, use projectName & organizationId in body' })
    async uploadJson(
        @Query('projectId') projectId: string | undefined,
        @Body() body: { metadata: UploadScanDto; result: any },
        @Req() req: Request,
    ) {
        // Capture upload source info
        const uploaderIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const uploadedById = (req as any).user?.id;

        return this.scansService.uploadScan(projectId, body.metadata, body.result, {
            uploaderIp,
            userAgent,
            uploadedById,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PROJECT_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a scan result' })
    async delete(@Param('id') id: string) {
        return this.scansService.delete(id);
    }
}
