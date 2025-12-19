import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePolicyDto, CreatePolicyRuleDto } from './dto/create-policy.dto';

@Injectable()
export class PoliciesService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(organizationId?: string, projectId?: string) {
        const where: any = {};

        if (organizationId) {
            where.organizationId = organizationId;
        }

        if (projectId) {
            where.projectId = projectId;
        }

        return this.prisma.policy.findMany({
            where,
            include: {
                rules: true,
                organization: true,
                project: true,
                _count: { select: { exceptions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const policy = await this.prisma.policy.findUnique({
            where: { id },
            include: {
                rules: { orderBy: { priority: 'desc' } },
                exceptions: {
                    include: {
                        requestedBy: { select: { id: true, name: true, email: true } },
                        approvedBy: { select: { id: true, name: true, email: true } },
                    },
                },
                organization: true,
                project: true,
            },
        });

        if (!policy) {
            throw new NotFoundException('Policy not found');
        }

        return policy;
    }

    async create(dto: CreatePolicyDto) {
        return this.prisma.policy.create({
            data: {
                name: dto.name,
                description: dto.description,
                isActive: dto.isActive ?? true,
                organizationId: dto.organizationId,
                projectId: dto.projectId,
                rules: dto.rules
                    ? {
                        create: dto.rules.map((rule, index) => ({
                            ruleType: rule.ruleType,
                            conditions: rule.conditions,
                            action: rule.action,
                            message: rule.message,
                            priority: rule.priority ?? index,
                        })),
                    }
                    : undefined,
            },
            include: { rules: true },
        });
    }

    async update(id: string, data: Partial<CreatePolicyDto>) {
        await this.findById(id);

        return this.prisma.policy.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                isActive: data.isActive,
                organizationId: data.organizationId,
                projectId: data.projectId,
            },
        });
    }

    async addRule(policyId: string, rule: CreatePolicyRuleDto) {
        await this.findById(policyId);

        return this.prisma.policyRule.create({
            data: {
                policyId,
                ruleType: rule.ruleType,
                conditions: rule.conditions,
                action: rule.action,
                message: rule.message,
                priority: rule.priority ?? 0,
            },
        });
    }

    async removeRule(ruleId: string) {
        return this.prisma.policyRule.delete({ where: { id: ruleId } });
    }

    async delete(id: string) {
        await this.findById(id);
        return this.prisma.policy.delete({ where: { id } });
    }

    // Exception management
    async findExceptions(status?: string) {
        const where: any = {};
        if (status) {
            where.status = status.toUpperCase();
        }

        return this.prisma.policyException.findMany({
            where,
            include: {
                policy: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async requestException(data: {

        policyId: string;
        exceptionType: string;
        targetValue: string;
        reason: string;
        requestedById: string;
        expiresAt?: Date;
    }) {
        return this.prisma.policyException.create({
            data: {
                policyId: data.policyId,
                exceptionType: data.exceptionType as any,
                targetValue: data.targetValue,
                reason: data.reason,
                requestedById: data.requestedById,
                expiresAt: data.expiresAt,
                status: 'PENDING',
            },
        });
    }

    async approveException(id: string, approvedById: string) {
        return this.prisma.policyException.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById,
            },
        });
    }

    async rejectException(id: string, approvedById: string) {
        return this.prisma.policyException.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById,
            },
        });
    }
}
