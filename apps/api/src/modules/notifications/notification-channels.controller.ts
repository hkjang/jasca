import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';

@ApiTags('Notification Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-channels')
export class NotificationChannelsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @ApiOperation({ summary: 'Get all notification channels' })
    async findAll() {
        return this.prisma.notificationChannel.findMany({
            include: {
                rules: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get notification channel by ID' })
    async findOne(@Param('id') id: string) {
        return this.prisma.notificationChannel.findUnique({
            where: { id },
            include: { rules: true },
        });
    }

    @Post()
    @ApiOperation({ summary: 'Create notification channel' })
    async create(
        @Body()
        data: {
            name: string;
            type: 'SLACK' | 'MATTERMOST' | 'EMAIL' | 'WEBHOOK';
            config: Prisma.InputJsonValue;
            isActive?: boolean;
        },
    ) {
        return this.prisma.notificationChannel.create({
            data: {
                name: data.name,
                type: data.type,
                config: data.config,
                isActive: data.isActive ?? true,
            },
        });
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update notification channel' })
    async update(
        @Param('id') id: string,
        @Body()
        data: {
            name?: string;
            config?: Prisma.InputJsonValue;
            isActive?: boolean;
        },
    ) {
        return this.prisma.notificationChannel.update({
            where: { id },
            data,
        });
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete notification channel' })
    async remove(@Param('id') id: string) {
        return this.prisma.notificationChannel.delete({
            where: { id },
        });
    }

    @Post(':id/rules')
    @ApiOperation({ summary: 'Add notification rule to channel' })
    async addRule(
        @Param('id') channelId: string,
        @Body()
        data: {
            eventType: string;
            conditions?: Prisma.InputJsonValue;
            isActive?: boolean;
        },
    ) {
        return this.prisma.notificationRule.create({
            data: {
                channel: { connect: { id: channelId } },
                eventType: data.eventType as any,
                conditions: data.conditions,
                isActive: data.isActive ?? true,
            },
        });
    }

    @Delete(':channelId/rules/:ruleId')
    @ApiOperation({ summary: 'Remove notification rule' })
    async removeRule(@Param('ruleId') ruleId: string) {
        return this.prisma.notificationRule.delete({
            where: { id: ruleId },
        });
    }
}
