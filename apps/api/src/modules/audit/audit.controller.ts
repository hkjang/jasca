import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @ApiOperation({ summary: 'Get audit logs with filters' })
    @ApiQuery({ name: 'action', required: false })
    @ApiQuery({ name: 'resource', required: false })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async findAll(
        @Query('action') action?: string,
        @Query('resource') resource?: string,
        @Query('userId') userId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.auditService.findAll({
            action,
            resource,
            userId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : 100,
            offset: offset ? parseInt(offset, 10) : 0,
        });
    }

    @Get('actions')
    @ApiOperation({ summary: 'Get distinct action types' })
    async getActions() {
        // Return common audit action types
        return [
            { id: 'CREATE', label: '생성' },
            { id: 'UPDATE', label: '수정' },
            { id: 'DELETE', label: '삭제' },
            { id: 'LOGIN', label: '로그인' },
            { id: 'LOGOUT', label: '로그아웃' },
            { id: 'LOGIN_FAILED', label: '로그인 실패' },
            { id: 'VIEW', label: '조회' },
            { id: 'EXPORT', label: '내보내기' },
            { id: 'UPLOAD', label: '업로드' },
            { id: 'STATUS_CHANGE', label: '상태 변경' },
            { id: 'APPROVE', label: '승인' },
            { id: 'REJECT', label: '거절' },
        ];
    }

    @Get('resources')
    @ApiOperation({ summary: 'Get distinct resource types' })
    async getResources() {
        // Return common resource types
        return [
            { id: 'user', label: '사용자' },
            { id: 'project', label: '프로젝트' },
            { id: 'organization', label: '조직' },
            { id: 'scan', label: '스캔' },
            { id: 'vulnerability', label: '취약점' },
            { id: 'policy', label: '정책' },
            { id: 'exception', label: '예외' },
            { id: 'report', label: '리포트' },
            { id: 'api_token', label: 'API 토큰' },
            { id: 'notification_channel', label: '알림 채널' },
            { id: 'settings', label: '설정' },
        ];
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get audit log statistics' })
    async getStats(
        @Query('days') days?: string,
    ) {
        const daysNum = days ? parseInt(days, 10) : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        // Get stats for the period
        const { results, total } = await this.auditService.findAll({
            startDate,
            limit: 1000,
        });

        // Calculate stats
        const byAction: Record<string, number> = {};
        const byResource: Record<string, number> = {};
        const byDay: Record<string, number> = {};

        for (const log of results) {
            // By action
            byAction[log.action] = (byAction[log.action] || 0) + 1;
            
            // By resource
            byResource[log.resource] = (byResource[log.resource] || 0) + 1;
            
            // By day
            const day = new Date(log.createdAt).toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + 1;
        }

        return {
            total,
            byAction,
            byResource,
            trend: Object.entries(byDay)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date)),
        };
    }
}
