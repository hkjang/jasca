import {
    Controller,
    Get,
    Post,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DatabaseService } from './database.service';

interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        email: string;
    };
}

@ApiTags('Database Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
@Controller('database')
export class DatabaseController {
    constructor(private readonly databaseService: DatabaseService) {}

    @Get('status')
    @ApiOperation({ summary: 'Get database status and version info' })
    @ApiResponse({ status: 200, description: 'Database status retrieved successfully' })
    async getStatus() {
        return this.databaseService.getDbStatus();
    }

    @Get('health')
    @ApiOperation({ summary: 'Database health check' })
    @ApiResponse({ status: 200, description: 'Health check result' })
    async healthCheck() {
        return this.databaseService.healthCheck();
    }

    @Get('migrations')
    @ApiOperation({ summary: 'Get all migrations (applied and pending)' })
    @ApiResponse({ status: 200, description: 'Migration list retrieved successfully' })
    async getMigrations() {
        return this.databaseService.getAllMigrations();
    }

    @Post('migrate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Run pending database migrations' })
    @ApiResponse({ status: 200, description: 'Migration executed' })
    @ApiResponse({ status: 500, description: 'Migration failed' })
    async runMigrations(@Req() req: AuthenticatedRequest) {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.socket?.remoteAddress;
        return this.databaseService.runMigrations(userId, ipAddress);
    }

    @Post('seed')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Run database seed' })
    @ApiResponse({ status: 200, description: 'Seed executed' })
    @ApiResponse({ status: 500, description: 'Seed failed' })
    async runSeed(@Req() req: AuthenticatedRequest) {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.socket?.remoteAddress;
        return this.databaseService.runSeed(userId, ipAddress);
    }

    @Post('regenerate-client')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Regenerate Prisma client' })
    @ApiResponse({ status: 200, description: 'Client regenerated' })
    async regenerateClient(@Req() req: AuthenticatedRequest) {
        const userId = req.user.userId;
        const ipAddress = req.ip || req.socket?.remoteAddress;
        return this.databaseService.regenerateClient(userId, ipAddress);
    }
}
