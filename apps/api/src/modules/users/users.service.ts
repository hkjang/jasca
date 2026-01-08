import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(organizationId?: string, options?: {
        limit?: number;
        offset?: number;
        search?: string;
        role?: string;
        status?: string;
    }) {
        const where: any = {};
        if (organizationId) {
            where.organizationId = organizationId;
        }
        // Search filter for name and email
        if (options?.search) {
            where.OR = [
                { name: { contains: options.search, mode: 'insensitive' } },
                { email: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        // Status filter
        if (options?.status) {
            where.isActive = options.status === 'ACTIVE';
        }

        const users = await this.prisma.user.findMany({
            where,
            include: { 
                roles: true, 
                organization: { select: { id: true, name: true } },
                mfa: true,
            },
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 25,
            skip: options?.offset || 0,
        });

        // Get total count for pagination
        const total = await this.prisma.user.count({ where });
        
        // Transform data for frontend
        let data = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.roles?.[0]?.role || 'VIEWER',
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            mfaEnabled: !!user.mfa?.isEnabled,
            organizationId: user.organizationId,
            organization: user.organization,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        }));

        // Filter by role (post-filter since role comes from relation)
        if (options?.role) {
            data = data.filter(u => u.role === options.role);
        }

        return { data, total };
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { roles: true, organization: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { roles: true },
        });
    }

    async update(id: string, data: { name?: string; isActive?: boolean }) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async updateUser(id: string, data: { name?: string; role?: string; status?: string; organizationId?: string }) {
        // Valid roles from Prisma schema
        const validRoles = ['SYSTEM_ADMIN', 'ORG_ADMIN', 'SECURITY_ADMIN', 'PROJECT_ADMIN', 'DEVELOPER', 'VIEWER'];
        
        // Validate role if provided
        if (data.role && !validRoles.includes(data.role)) {
            throw new Error(`Invalid role: ${data.role}. Valid roles are: ${validRoles.join(', ')}`);
        }
        
        // First update the user basic info
        const updateData: { name?: string; isActive?: boolean; organizationId?: string | null } = {};
        if (data.name) updateData.name = data.name;
        if (data.status) updateData.isActive = data.status === 'ACTIVE';
        if (data.organizationId !== undefined) {
            updateData.organizationId = data.organizationId || null;
        }

        // Only update user if there's data to update
        if (Object.keys(updateData).length > 0) {
            await this.prisma.user.update({
                where: { id },
                data: updateData,
            });
        }

        // If role is being updated, update the user's primary role
        if (data.role) {
            // Delete existing roles and create new one
            await this.prisma.userRole.deleteMany({ where: { userId: id } });
            await this.prisma.userRole.create({
                data: {
                    userId: id,
                    role: data.role as 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'SECURITY_ADMIN' | 'PROJECT_ADMIN' | 'DEVELOPER' | 'VIEWER',
                    scope: 'GLOBAL',
                },
            });
        }

        // Fetch and return updated user with transformed data
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { 
                roles: true, 
                organization: { select: { id: true, name: true } },
                mfa: true,
            },
        });
        
        if (!user) throw new NotFoundException('User not found');
        
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.roles?.[0]?.role || 'VIEWER',
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            mfaEnabled: !!user.mfa?.isEnabled,
            organizationId: user.organizationId,
            organization: user.organization,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        };
    }

    async deleteUser(id: string) {
        // First delete related records
        await this.prisma.userRole.deleteMany({ where: { userId: id } });
        return this.prisma.user.delete({
            where: { id },
        });
    }

    async assignRole(userId: string, role: string, scope: string, scopeId?: string) {
        return this.prisma.userRole.create({
            data: {
                userId,
                role: role as any,
                scope: scope as any,
                scopeId,
            },
        });
    }

    async removeRole(userId: string, roleId: string) {
        return this.prisma.userRole.delete({
            where: { id: roleId },
        });
    }

    // In-memory storage for notification settings (in production, add to User model)
    private notificationSettings: Map<string, { emailAlerts: boolean; criticalOnly: boolean; weeklyDigest: boolean }> = new Map();

    async getNotificationSettings(userId: string): Promise<{ emailAlerts: boolean; criticalOnly: boolean; weeklyDigest: boolean }> {
        const settings = this.notificationSettings.get(userId);
        if (!settings) {
            // Return default settings
            return {
                emailAlerts: true,
                criticalOnly: false,
                weeklyDigest: true,
            };
        }
        return settings;
    }

    async updateNotificationSettings(
        userId: string,
        dto: { emailAlerts?: boolean; criticalOnly?: boolean; weeklyDigest?: boolean },
    ): Promise<{ emailAlerts: boolean; criticalOnly: boolean; weeklyDigest: boolean }> {
        const currentSettings = await this.getNotificationSettings(userId);
        const updatedSettings = {
            emailAlerts: dto.emailAlerts ?? currentSettings.emailAlerts,
            criticalOnly: dto.criticalOnly ?? currentSettings.criticalOnly,
            weeklyDigest: dto.weeklyDigest ?? currentSettings.weeklyDigest,
        };
        this.notificationSettings.set(userId, updatedSettings);
        return updatedSettings;
    }
}

