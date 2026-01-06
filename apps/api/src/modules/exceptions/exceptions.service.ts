import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExceptionStatus, ExceptionType } from '@prisma/client';

export interface CreateExceptionDto {
    policyId?: string;
    scanVulnerabilityId?: string;
    cveId?: string;
    reason: string;
    expiresAt?: string;
    exceptionType: ExceptionType;
    targetValue: string;
}

@Injectable()
export class ExceptionsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(status?: string, organizationId?: string) {
        const where: any = {};

        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }

        if (organizationId) {
            where.policy = {
                organizationId,
            };
        }

        const exceptions = await this.prisma.policyException.findMany({
            where,
            include: {
                policy: {
                    include: {
                        organization: true,
                        project: true,
                    },
                },
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
                approvedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        });

        // Transform to match frontend expectations
        return exceptions.map((e) => ({
            id: e.id,
            policyId: e.policyId,
            vulnerabilityId: e.targetValue,
            vulnerability: e.exceptionType === 'CVE' ? { cveId: e.targetValue, severity: 'UNKNOWN' } : null,
            projectId: e.policy?.projectId,
            project: e.policy?.project,
            reason: e.reason,
            status: e.status,
            requestedBy: e.requestedBy?.name || 'Unknown',
            requestedById: e.requestedById,
            requestedAt: e.createdAt.toISOString(),
            expiresAt: e.expiresAt?.toISOString() || '',
            approvedBy: e.approvedBy?.name,
            approvedById: e.approvedById,
            approvedAt: e.updatedAt?.toISOString(),
            rejectedBy: e.status === 'REJECTED' ? e.approvedBy?.name : null,
            rejectedAt: e.status === 'REJECTED' ? e.updatedAt?.toISOString() : null,
            rejectReason: null,
        }));
    }

    async findById(id: string) {
        const exception = await this.prisma.policyException.findUnique({
            where: { id },
            include: {
                policy: {
                    include: {
                        organization: true,
                        project: true,
                    },
                },
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
                approvedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!exception) {
            throw new NotFoundException('Exception not found');
        }

        return exception;
    }

    async create(dto: CreateExceptionDto, userId: string) {
        // Get or create a default policy if not provided
        let policyId = dto.policyId;

        if (!policyId) {
            // Find a default policy or create one
            const defaultPolicy = await this.prisma.policy.findFirst({
                where: { name: 'Default Exception Policy' },
            });

            if (defaultPolicy) {
                policyId = defaultPolicy.id;
            } else {
                // Get user's organization
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { organizationId: true },
                });

                const newPolicy = await this.prisma.policy.create({
                    data: {
                        name: 'Default Exception Policy',
                        description: 'Default policy for exception requests',
                        isActive: true,
                        organizationId: user?.organizationId || undefined,
                    },
                });
                policyId = newPolicy.id;
            }
        }

        return this.prisma.policyException.create({
            data: {
                policyId,
                exceptionType: dto.exceptionType,
                targetValue: dto.targetValue,
                reason: dto.reason,
                status: 'PENDING',
                requestedById: userId,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
            include: {
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    async approve(id: string, userId: string) {
        const exception = await this.findById(id);

        if (exception.status !== 'PENDING') {
            throw new ForbiddenException('Only pending exceptions can be approved');
        }

        return this.prisma.policyException.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: userId,
            },
        });
    }

    async reject(id: string, userId: string, reason?: string) {
        const exception = await this.findById(id);

        if (exception.status !== 'PENDING') {
            throw new ForbiddenException('Only pending exceptions can be rejected');
        }

        return this.prisma.policyException.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: userId, // Using approved_by as the reviewer
            },
        });
    }

    async getMyExceptions(userId: string) {
        return this.prisma.policyException.findMany({
            where: { requestedById: userId },
            include: {
                policy: {
                    include: { project: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
