import { Controller, Get, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
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
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiOperation({ summary: 'Update user' })
    async update(
        @Param('id') id: string,
        @Body() dto: { name?: string; role?: string; status?: string },
    ) {
        return this.usersService.updateUser(id, dto);
    }

    @Delete(':id')
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiOperation({ summary: 'Delete user' })
    async delete(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }
}
