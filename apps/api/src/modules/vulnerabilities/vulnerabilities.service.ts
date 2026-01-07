import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Severity, VulnStatus } from '@prisma/client';
import { WorkflowService } from './services/workflow.service';

export interface VulnFilter {
    severity?: Severity[];
    status?: VulnStatus[];
    projectId?: string;
    cveId?: string;
    pkgName?: string;
    assigneeId?: string;
}

@Injectable()
export class VulnerabilitiesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly workflowService: WorkflowService,
    ) { }

    async findAll(filter: VulnFilter = {}, options?: { 
        limit?: number; 
        offset?: number;
        sortBy?: 'severity' | 'cveId' | 'pkgName' | 'status' | 'createdAt';
        sortOrder?: 'asc' | 'desc';
    }) {
        const where: any = {};

        if (filter.severity?.length) {
            where.vulnerability = { severity: { in: filter.severity } };
        }

        if (filter.status?.length) {
            where.status = { in: filter.status };
        }

        if (filter.projectId) {
            where.scanResult = { projectId: filter.projectId };
        }

        if (filter.cveId) {
            where.vulnerability = { ...where.vulnerability, cveId: { contains: filter.cveId, mode: 'insensitive' } };
        }

        if (filter.pkgName) {
            where.pkgName = { contains: filter.pkgName, mode: 'insensitive' };
        }

        if (filter.assigneeId) {
            where.assigneeId = filter.assigneeId;
        }

        // Build dynamic orderBy based on sortBy parameter
        const sortOrder = options?.sortOrder || 'asc';
        let orderBy: any[];
        switch (options?.sortBy) {
            case 'cveId':
                orderBy = [{ vulnerability: { cveId: sortOrder } }];
                break;
            case 'pkgName':
                orderBy = [{ pkgName: sortOrder }];
                break;
            case 'status':
                orderBy = [{ status: sortOrder }];
                break;
            case 'createdAt':
                orderBy = [{ createdAt: sortOrder }];
                break;
            case 'severity':
            default:
                orderBy = [
                    { vulnerability: { severity: sortOrder } },
                    { createdAt: 'desc' },
                ];
                break;
        }

        const [results, total] = await Promise.all([
            this.prisma.scanVulnerability.findMany({
                where,
                include: {
                    vulnerability: true,
                    scanResult: {
                        include: {
                            project: { include: { organization: true } },
                        },
                    },
                    assignee: { select: { id: true, name: true, email: true } },
                },
                orderBy,
                take: options?.limit || 50,
                skip: options?.offset || 0,
            }),
            this.prisma.scanVulnerability.count({ where }),
        ]);

        return { results, total };
    }

    async findById(id: string) {
        const vuln = await this.prisma.scanVulnerability.findUnique({
            where: { id },
            include: {
                vulnerability: true,
                scanResult: {
                    include: {
                        project: { include: { organization: true } },
                    },
                },
                assignee: true,
                comments: {
                    include: { author: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!vuln) {
            throw new NotFoundException('Vulnerability not found');
        }

        return vuln;
    }

    async findByCveId(cveId: string) {
        const vuln = await this.prisma.vulnerability.findUnique({
            where: { cveId },
            include: {
                scanResults: {
                    include: {
                        scanResult: {
                            include: { project: true },
                        },
                    },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!vuln) {
            throw new NotFoundException('CVE not found');
        }

        return vuln;
    }

    async updateStatus(id: string, status: VulnStatus, userId: string, userRole?: string) {
        const vuln = await this.findById(id);
        const currentStatus = vuln.status as string;

        // Use WorkflowService for validation and history tracking
        await this.workflowService.transitionStatus(id, userId, {
            from: currentStatus as any,
            to: status as any,
        }, userRole);

        return this.findById(id);
    }

    async getAvailableTransitions(id: string, userRole?: string) {
        const vuln = await this.findById(id);
        return this.workflowService.getAvailableTransitions(vuln.status as any, userRole);
    }

    async assignUser(id: string, assigneeId: string | null) {
        await this.findById(id);

        return this.prisma.scanVulnerability.update({
            where: { id },
            data: { assigneeId },
        });
    }

    async addComment(id: string, authorId: string, content: string) {
        await this.findById(id);

        return this.prisma.vulnerabilityComment.create({
            data: {
                scanVulnerabilityId: id,
                authorId,
                content,
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
        });
    }

    // Find all affected services for a specific CVE
    async findAffectedByVuln(cveId: string) {
        return this.prisma.scanVulnerability.findMany({
            where: {
                vulnerability: { cveId },
                status: { notIn: ['FIXED', 'FALSE_POSITIVE'] },
            },
            include: {
                scanResult: {
                    include: {
                        project: { include: { organization: true } },
                    },
                },
            },
            distinct: ['scanResultId'],
        });
    }

    // Get vulnerability history (workflow changes)
    async getHistory(id: string) {
        const vuln = await this.findById(id);

        // Get workflow history
        const workflowHistory = await this.prisma.vulnerabilityWorkflow.findMany({
            where: { scanVulnerabilityId: id },
            include: {
                changedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get comments as part of history
        const comments = await this.prisma.vulnerabilityComment.findMany({
            where: { scanVulnerabilityId: id },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Combine and sort by date
        const history = [
            ...workflowHistory.map(w => ({
                id: w.id,
                type: 'status_change' as const,
                action: `상태 변경`,
                from: w.fromStatus,
                to: w.toStatus,
                user: w.changedBy.name,
                userId: w.changedBy.id,
                comment: w.comment,
                date: w.createdAt,
            })),
            ...comments.map(c => ({
                id: c.id,
                type: 'comment' as const,
                action: '코멘트 추가',
                content: c.content,
                user: c.author.name,
                userId: c.author.id,
                date: c.createdAt,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Add initial discovery entry
        history.push({
            id: 'discovery',
            type: 'discovery' as const,
            action: '취약점 발견',
            user: '시스템',
            userId: '',
            date: vuln.createdAt,
        } as any);

        return history;
    }
}
