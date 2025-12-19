import { Controller, Get, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // Self-profile endpoints (no admin role required)
    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser() user: { id: string }) {
        return this.usersService.findById(user.id);
    }

    @Put('me')
    @ApiOperation({ summary: 'Update current user profile' })
    async updateProfile(
        @CurrentUser() user: { id: string },
        @Body() dto: { name?: string },
    ) {
        return this.usersService.update(user.id, dto);
    }

    @Get('me/notification-settings')
    @ApiOperation({ summary: 'Get current user notification settings' })
    async getNotificationSettings(@CurrentUser() user: { id: string }) {
        return this.usersService.getNotificationSettings(user.id);
    }

    @Put('me/notification-settings')
    @ApiOperation({ summary: 'Update current user notification settings' })
    async updateNotificationSettings(
        @CurrentUser() user: { id: string },
        @Body() dto: { emailAlerts?: boolean; criticalOnly?: boolean; weeklyDigest?: boolean },
    ) {
        return this.usersService.updateNotificationSettings(user.id, dto);
    }

    // Admin endpoints
    @Get()
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get all users' })
    async findAll(@Query('organizationId') organizationId?: string) {
        return this.usersService.findAll(organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    async findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiOperation({ summary: 'Update user' })
    async update(
        @Param('id') id: string,
        @Body() dto: { name?: string; role?: string; status?: string },
    ) {
        return this.usersService.updateUser(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiOperation({ summary: 'Delete user' })
    async delete(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }
}
