import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';

type VulnStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'FIX_SUBMITTED' | 'VERIFYING' | 'FIXED' | 'CLOSED' | 'IGNORED' | 'FALSE_POSITIVE';

interface WorkflowTransition {
    from: VulnStatus;
    to: VulnStatus;
    comment?: string;
    evidence?: Record<string, any>;
}

interface TransitionResult {
    success: boolean;
    scanVulnerabilityId: string;
    fromStatus: VulnStatus;
    toStatus: VulnStatus;
    timestamp: Date;
}

interface WorkflowState {
    id: string;
    name: string;
    color: string;
    description: string;
}

interface WorkflowTransitionRule {
    from: string;
    to: string;
    requiredRole: string;
}

interface WorkflowSettings {
    states: WorkflowState[];
    transitions: WorkflowTransitionRule[];
}

// Fallback transitions if no settings configured
const DEFAULT_TRANSITIONS: Record<string, string[]> = {
    OPEN: ['ASSIGNED', 'IN_PROGRESS', 'IGNORED', 'FALSE_POSITIVE'],
    ASSIGNED: ['IN_PROGRESS', 'OPEN', 'IGNORED'],
    IN_PROGRESS: ['FIX_SUBMITTED', 'ASSIGNED', 'IGNORED'],
    FIX_SUBMITTED: ['VERIFYING', 'IN_PROGRESS'],
    VERIFYING: ['FIXED', 'IN_PROGRESS'],
    FIXED: ['CLOSED', 'OPEN'],
    CLOSED: ['OPEN'],
    IGNORED: ['OPEN'],
    FALSE_POSITIVE: ['OPEN'],
};

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly settingsService: SettingsService,
    ) { }

    /**
     * Get workflow settings from the settings service
     */
    private async getWorkflowSettings(): Promise<WorkflowSettings | null> {
        try {
            const settings = await this.settingsService.get('workflows') as WorkflowSettings;
            if (settings && settings.states && settings.transitions) {
                return settings;
            }
            return null;
        } catch (error) {
            this.logger.warn('Failed to load workflow settings, using defaults');
            return null;
        }
    }

    /**
     * Get available transitions for a given status and user role
     */
    async getAvailableTransitions(
        currentStatus: VulnStatus,
        userRole?: string,
    ): Promise<{ status: string; name: string; requiresRole?: string }[]> {
        const settings = await this.getWorkflowSettings();

        if (settings && settings.transitions.length > 0) {
            // Use dynamic settings
            const transitions = settings.transitions
                .filter(t => t.from === currentStatus)
                .map(t => {
                    const state = settings.states.find(s => s.id === t.to);
                    return {
                        status: t.to,
                        name: state?.name || t.to,
                        requiresRole: t.requiredRole,
                    };
                });

            // If user role is provided, filter by role
            if (userRole) {
                return transitions.filter(t => this.checkRolePermission(userRole, t.requiresRole));
            }

            return transitions;
        }

        // Fallback to default transitions
        const defaultTargets = DEFAULT_TRANSITIONS[currentStatus] || [];
        return defaultTargets.map(status => ({
            status,
            name: status.replace(/_/g, ' '),
        }));
    }

    /**
     * Check if user role has permission for transition
     */
    private checkRolePermission(userRole: string, requiredRole?: string): boolean {
        if (!requiredRole) return true;

        // Role hierarchy: ORG_ADMIN > PROJECT_ADMIN > SECURITY_ENGINEER > DEVELOPER
        const roleHierarchy: Record<string, number> = {
            DEVELOPER: 1,
            SECURITY_ENGINEER: 2,
            PROJECT_ADMIN: 3,
            ORG_ADMIN: 4,
            SUPER_ADMIN: 5,
        };

        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    }

    /**
     * Validate if a transition is allowed
     */
    async isValidTransition(
        from: VulnStatus,
        to: VulnStatus,
        userRole?: string,
    ): Promise<{ valid: boolean; reason?: string; requiredRole?: string }> {
        const settings = await this.getWorkflowSettings();

        if (settings && settings.transitions.length > 0) {
            const transition = settings.transitions.find(t => t.from === from && t.to === to);
            
            if (!transition) {
                return { valid: false, reason: `Transition from ${from} to ${to} is not allowed` };
            }

            if (userRole && !this.checkRolePermission(userRole, transition.requiredRole)) {
                return {
                    valid: false,
                    reason: `Role ${transition.requiredRole} is required for this transition`,
                    requiredRole: transition.requiredRole,
                };
            }

            return { valid: true };
        }

        // Fallback to default transitions (no role check)
        const validTargets = DEFAULT_TRANSITIONS[from] || [];
        if (!validTargets.includes(to)) {
            return { valid: false, reason: `Transition from ${from} to ${to} is not allowed` };
        }

        return { valid: true };
    }

    /**
     * Transition a vulnerability to a new status
     */
    async transitionStatus(
        scanVulnerabilityId: string,
        userId: string,
        transition: WorkflowTransition,
        userRole?: string,
    ): Promise<TransitionResult> {
        // Get current vulnerability status
        const scanVuln = await this.prisma.scanVulnerability.findUnique({
            where: { id: scanVulnerabilityId },
        });

        if (!scanVuln) {
            throw new BadRequestException('Vulnerability not found');
        }

        const currentStatus = scanVuln.status as VulnStatus;

        // Validate transition
        const validation = await this.isValidTransition(currentStatus, transition.to, userRole);
        if (!validation.valid) {
            if (validation.requiredRole) {
                throw new ForbiddenException(validation.reason);
            }
            throw new BadRequestException(validation.reason);
        }

        // Perform transition in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Update vulnerability status
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await tx.scanVulnerability.update({
                where: { id: scanVulnerabilityId },
                data: { status: transition.to as any },
            });

            // Create workflow history record
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (tx as any).vulnerabilityWorkflow?.create({
                data: {
                    scanVulnerabilityId,
                    fromStatus: currentStatus,
                    toStatus: transition.to,
                    changedById: userId,
                    comment: transition.comment,
                    evidence: transition.evidence,
                },
            });

            return {
                success: true,
                scanVulnerabilityId,
                fromStatus: currentStatus,
                toStatus: transition.to,
                timestamp: new Date(),
            };
        });

        this.logger.log(
            `Transitioned ${scanVulnerabilityId} from ${currentStatus} to ${transition.to}`,
        );

        return result;
    }

    /**
     * Get workflow history for a vulnerability
     */
    async getWorkflowHistory(scanVulnerabilityId: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaAny = this.prisma as any;

        return prismaAny.vulnerabilityWorkflow?.findMany({
            where: { scanVulnerabilityId },
            include: {
                changedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        }) || [];
    }

    /**
     * Bulk transition vulnerabilities
     */
    async bulkTransition(
        scanVulnerabilityIds: string[],
        userId: string,
        toStatus: VulnStatus,
        comment?: string,
        userRole?: string,
    ): Promise<{
        successful: string[];
        failed: { id: string; reason: string }[];
    }> {
        const successful: string[] = [];
        const failed: { id: string; reason: string }[] = [];

        for (const id of scanVulnerabilityIds) {
            try {
                const scanVuln = await this.prisma.scanVulnerability.findUnique({
                    where: { id },
                });

                if (!scanVuln) {
                    failed.push({ id, reason: 'Not found' });
                    continue;
                }

                const currentStatus = scanVuln.status as VulnStatus;
                const validation = await this.isValidTransition(currentStatus, toStatus, userRole);

                if (!validation.valid) {
                    failed.push({ id, reason: validation.reason || 'Invalid transition' });
                    continue;
                }

                await this.transitionStatus(id, userId, {
                    from: currentStatus,
                    to: toStatus,
                    comment,
                }, userRole);

                successful.push(id);
            } catch (error: any) {
                failed.push({ id, reason: error.message || 'Unknown error' });
            }
        }

        return { successful, failed };
    }

    /**
     * Auto-assign vulnerability to user
     */
    async autoAssign(
        scanVulnerabilityId: string,
        assigneeId: string,
        assignedById: string,
    ): Promise<void> {
        const scanVuln = await this.prisma.scanVulnerability.findUnique({
            where: { id: scanVulnerabilityId },
        });

        if (!scanVuln) {
            throw new BadRequestException('Vulnerability not found');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.prisma.scanVulnerability.update({
            where: { id: scanVulnerabilityId },
            data: {
                assigneeId,
                status: 'ASSIGNED' as any,
            },
        });

        // Record the workflow transition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((scanVuln.status as any) !== 'ASSIGNED') {
            await (this.prisma as any).vulnerabilityWorkflow?.create({
                data: {
                    scanVulnerabilityId,
                    fromStatus: scanVuln.status,
                    toStatus: 'ASSIGNED',
                    changedById: assignedById,
                    comment: `Auto-assigned to user`,
                },
            });
        }
    }

    /**
     * Get workflow statistics for a project
     */
    async getWorkflowStats(projectId: string) {
        const scans = await this.prisma.scanResult.findMany({
            where: { projectId },
            select: { id: true },
        });

        const scanIds = scans.map((s) => s.id);

        const stats = await this.prisma.scanVulnerability.groupBy({
            by: ['status'],
            where: { scanResultId: { in: scanIds } },
            _count: true,
        });

        return stats.reduce(
            (acc, s) => {
                acc[s.status] = s._count;
                return acc;
            },
            {} as Record<string, number>,
        );
    }

    /**
     * Get all workflow states from settings
     */
    async getWorkflowStates(): Promise<WorkflowState[]> {
        const settings = await this.getWorkflowSettings();
        if (settings && settings.states) {
            return settings.states;
        }

        // Return default states
        return [
            { id: 'OPEN', name: '미해결', color: 'bg-red-500', description: '새로 발견된 취약점' },
            { id: 'ASSIGNED', name: '할당됨', color: 'bg-orange-500', description: '담당자 할당됨' },
            { id: 'IN_PROGRESS', name: '진행 중', color: 'bg-yellow-500', description: '조치 진행 중' },
            { id: 'FIX_SUBMITTED', name: '수정 제출', color: 'bg-blue-500', description: '수정 코드 제출됨' },
            { id: 'VERIFYING', name: '검증 중', color: 'bg-cyan-500', description: '수정 검증 중' },
            { id: 'FIXED', name: '해결됨', color: 'bg-green-500', description: '취약점 해결됨' },
            { id: 'CLOSED', name: '종료', color: 'bg-slate-500', description: '이슈 종료' },
            { id: 'IGNORED', name: '무시', color: 'bg-slate-400', description: '무시됨' },
            { id: 'FALSE_POSITIVE', name: '오탐', color: 'bg-purple-500', description: '취약점이 아님' },
        ];
    }
}
