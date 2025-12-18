import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(organizationId?: string) {
        return this.prisma.user.findMany({
            where: organizationId ? { organizationId } : undefined,
            include: { roles: true },
            orderBy: { createdAt: 'desc' },
        });
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

    async updateUser(id: string, data: { name?: string; role?: string; status?: string }) {
        // First update the user basic info
        const updateData: { name?: string; isActive?: boolean } = {};
        if (data.name) updateData.name = data.name;
        if (data.status) updateData.isActive = data.status === 'ACTIVE';

        const user = await this.prisma.user.update({
            where: { id },
            data: updateData,
            include: { roles: true, organization: true },
        });

        // If role is being updated, update the user's primary role
        if (data.role) {
            // Delete existing roles and create new one
            await this.prisma.userRole.deleteMany({ where: { userId: id } });
            await this.prisma.userRole.create({
                data: {
                    userId: id,
                    role: data.role as any,
                    scope: 'GLOBAL',
                },
            });
        }

        return this.findById(id);
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
}
