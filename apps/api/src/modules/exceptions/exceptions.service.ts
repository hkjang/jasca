import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExceptionStatus, ExceptionType } from '@prisma/client';

export interface CreateExceptionDto {
    policyId?: string;
    scanVulnerabilityId?: string;  // Link to specific vulnerability
    cveId?: string;
    reason: string;
    expiresAt?: string;
    exceptionType: ExceptionType;
    targetValue: string;
}

@Injectable()
export class ExceptionsService {
    private readonly logger = new Logger(ExceptionsService.name);

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

    /**
     * Approve an exception request
     * - Updates exception status to APPROVED
     * - If linked to a CVE, finds and updates related vulnerabilities to ACCEPTED status
     * - Records workflow history for audit trail
     */
    async approve(id: string, userId: string) {
        const exception = await this.findById(id);

        if (exception.status !== 'PENDING') {
            throw new ForbiddenException('Only pending exceptions can be approved');
        }

        // Use transaction to ensure atomicity
        return this.prisma.$transaction(async (tx) => {
            // 1. Update exception status
            const updatedException = await tx.policyException.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedById: userId,
                },
            });

            // 2. If exception is for a CVE, update related vulnerabilities
            if (exception.exceptionType === 'CVE' && exception.targetValue) {
                const cveId = exception.targetValue;
                
                // Find all open vulnerabilities with this CVE
                const vulnerabilities = await tx.scanVulnerability.findMany({
                    where: {
                        vulnerability: { cveId },
                        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
                    },
                    include: {
                        vulnerability: true,
                    },
                });

                this.logger.log(`Found ${vulnerabilities.length} vulnerabilities for CVE ${cveId} to mark as ACCEPTED`);

                // Update each vulnerability to ACCEPTED status
                for (const vuln of vulnerabilities) {
                    // Update status
                    await tx.scanVulnerability.update({
                        where: { id: vuln.id },
                        data: { status: 'FALSE_POSITIVE' as any }, // Use FALSE_POSITIVE as ACCEPTED equivalent
                    });

                    // Record workflow history
                    await (tx as any).vulnerabilityWorkflow?.create({
                        data: {
                            scanVulnerabilityId: vuln.id,
                            fromStatus: vuln.status,
                            toStatus: 'FALSE_POSITIVE',
                            changedById: userId,
                            comment: `예외 승인됨: ${exception.reason}`,
                            evidence: {
                                exceptionId: exception.id,
                                approvedAt: new Date().toISOString(),
                            },
                        },
                    });
                }
            }

            // 3. If exception is for a specific package
            if (exception.exceptionType === 'PACKAGE' && exception.targetValue) {
                const pkgName = exception.targetValue;
                
                const vulnerabilities = await tx.scanVulnerability.findMany({
                    where: {
                        pkgName: { contains: pkgName },
                        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
                    },
                });

                this.logger.log(`Found ${vulnerabilities.length} vulnerabilities for package ${pkgName} to mark as ACCEPTED`);

                for (const vuln of vulnerabilities) {
                    await tx.scanVulnerability.update({
                        where: { id: vuln.id },
                        data: { status: 'FALSE_POSITIVE' as any },
                    });

                    await (tx as any).vulnerabilityWorkflow?.create({
                        data: {
                            scanVulnerabilityId: vuln.id,
                            fromStatus: vuln.status,
                            toStatus: 'FALSE_POSITIVE',
                            changedById: userId,
                            comment: `패키지 예외 승인됨: ${exception.reason}`,
                            evidence: {
                                exceptionId: exception.id,
                                approvedAt: new Date().toISOString(),
                            },
                        },
                    });
                }
            }

            return updatedException;
        });
    }

    /**
     * Reject an exception request
     * - Updates exception status to REJECTED
     * - No changes to vulnerability status
     */
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

    /**
     * Get exception statistics
     */
    async getStats() {
        const [pending, approved, rejected, total] = await Promise.all([
            this.prisma.policyException.count({ where: { status: 'PENDING' } }),
            this.prisma.policyException.count({ where: { status: 'APPROVED' } }),
            this.prisma.policyException.count({ where: { status: 'REJECTED' } }),
            this.prisma.policyException.count(),
        ]);

        return {
            pending,
            approved,
            rejected,
            total,
            approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        };
    }
}
