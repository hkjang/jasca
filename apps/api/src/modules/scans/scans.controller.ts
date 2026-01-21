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
    ApiBody,
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

    /**
     * Simple upload: Just send Trivy JSON directly
     * curl -X POST /api/scans/upload -H "Authorization: Bearer jasca_xxx" -H "Content-Type: application/json" -d @trivy.json
     */
    @Post('upload')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiSecurity('api-key')
    @ApiOperation({ summary: 'Upload a Trivy scan result directly as JSON body' })
    @ApiQuery({ name: 'projectId', required: false, description: 'Project ID' })
    @ApiQuery({ name: 'projectName', required: false, description: 'Project name (auto-create if not exists)' })
    @ApiQuery({ name: 'organizationId', required: false, description: 'Organization ID for auto-create (auto-filled from API token)' })
    @ApiQuery({ name: 'imageRef', required: false, description: 'Image reference' })
    @ApiQuery({ name: 'tag', required: false, description: 'Image tag' })
    @ApiBody({ description: 'Trivy JSON scan result' })
    async uploadDirect(
        @Query('projectId') projectId: string | undefined,
        @Query('projectName') projectName: string | undefined,
        @Query('organizationId') organizationIdParam: string | undefined,
        @Query('imageRef') imageRef: string | undefined,
        @Query('tag') tag: string | undefined,
        @Body() body: any,
        @Req() req: Request,
    ) {
        const user = (req as any).user;
        
        // Use organizationId from query params, or fall back to API token's organizationId
        const organizationId = organizationIdParam || (user?.isApiToken ? user.organizationId : undefined);

        // Build DTO from query params
        const dto: UploadScanDto = {
            sourceType: 'TRIVY_JSON',
            projectName: projectName,
            organizationId: organizationId,
            imageRef: imageRef,
            tag: tag,
        };

        // Capture source info - handle various IP formats
        const forwarded = req.headers['x-forwarded-for'];
        const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        let uploaderIp = forwardedIp || req.ip || req.socket?.remoteAddress;
        // Normalize localhost representations
        if (uploaderIp === '::1' || uploaderIp === '::ffff:127.0.0.1') {
            uploaderIp = '127.0.0.1';
        }
        uploaderIp = uploaderIp || 'unknown';
        const userAgent = req.headers['user-agent'] || 'API Client';
        const uploadedById = user?.id;

        // The body IS the Trivy result
        return this.scansService.uploadScan(projectId, dto, body, {
            uploaderIp,
            userAgent,
            uploadedById,
        });
    }

    /**
     * File upload via multipart form
     */
    @Post('upload/file')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiSecurity('api-key')
    @ApiOperation({ summary: 'Upload a Trivy scan result as multipart file' })
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

        // Capture upload source info - handle various IP formats
        const forwarded = req.headers['x-forwarded-for'];
        const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        let uploaderIp = forwardedIp || req.ip || req.socket?.remoteAddress;
        // Normalize localhost representations
        if (uploaderIp === '::1' || uploaderIp === '::ffff:127.0.0.1') {
            uploaderIp = '127.0.0.1';
        }
        uploaderIp = uploaderIp || 'unknown';
        const userAgent = req.headers['user-agent'] || 'Browser Upload';
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
    @ApiOperation({ summary: 'Upload a Trivy scan result with metadata wrapper' })
    @ApiQuery({ name: 'projectId', required: false, description: 'Project ID - if not provided, use projectName & organizationId in body' })
    async uploadJson(
        @Query('projectId') projectId: string | undefined,
        @Body() body: { metadata: UploadScanDto; result: any },
        @Req() req: Request,
    ) {
        // Capture upload source info - handle various IP formats
        const forwarded = req.headers['x-forwarded-for'];
        const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        let uploaderIp = forwardedIp || req.ip || req.socket?.remoteAddress;
        // Normalize localhost representations
        if (uploaderIp === '::1' || uploaderIp === '::ffff:127.0.0.1') {
            uploaderIp = '127.0.0.1';
        }
        uploaderIp = uploaderIp || 'unknown';
        const userAgent = req.headers['user-agent'] || 'API Client';
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

    @Get(':id/compare/:compareId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Compare two scans and get diff' })
    async compareScan(
        @Param('id') baseScanId: string,
        @Param('compareId') compareScanId: string,
    ) {
        return this.scansService.compareScan(baseScanId, compareScanId);
    }
}

