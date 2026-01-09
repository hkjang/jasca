import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    LicenseClassification,
    LicensePolicy,
    LicensePolicyAction,
    LicenseRuleType,
    Prisma,
} from '@prisma/client';

export interface PolicyViolation {
    licenseName: string;
    classification: LicenseClassification;
    packages: Array<{ name: string; version: string }>;
    action: LicensePolicyAction;
    message?: string;
}

export interface PolicyEvaluationResult {
    passed: boolean;
    violations: PolicyViolation[];
    warnings: PolicyViolation[];
    summary: {
        totalPackages: number;
        blockedPackages: number;
        warnedPackages: number;
    };
}

@Injectable()
export class LicensePolicyService {
    private readonly logger = new Logger(LicensePolicyService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Find all policies
     */
    async findAll(options?: { organizationId?: string; projectId?: string; isActive?: boolean }) {
        const where: Prisma.LicensePolicyWhereInput = {};

        if (options?.organizationId) {
            where.organizationId = options.organizationId;
        }

        if (options?.projectId) {
            where.projectId = options.projectId;
        }

        if (options?.isActive !== undefined) {
            where.isActive = options.isActive;
        }

        return this.prisma.licensePolicy.findMany({
            where,
            include: {
                rules: {
                    include: {
                        license: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find policy by ID
     */
    async findById(id: string) {
        const policy = await this.prisma.licensePolicy.findUnique({
            where: { id },
            include: {
                rules: {
                    include: {
                        license: true,
                    },
                    orderBy: { priority: 'desc' },
                },
            },
        });

        if (!policy) {
            throw new NotFoundException(`License policy with ID ${id} not found`);
        }

        return policy;
    }

    /**
     * Create a new license policy
     */
    async create(data: {
        name: string;
        description?: string;
        organizationId?: string;
        projectId?: string;
        isDefault?: boolean;
        rules?: Array<{
            ruleType: LicenseRuleType;
            licenseId?: string;
            classification?: LicenseClassification;
            action: LicensePolicyAction;
            message?: string;
            priority?: number;
        }>;
    }) {
        const { rules, ...policyData } = data;

        return this.prisma.licensePolicy.create({
            data: {
                ...policyData,
                rules: rules
                    ? {
                          create: rules,
                      }
                    : undefined,
            },
            include: {
                rules: {
                    include: {
                        license: true,
                    },
                },
            },
        });
    }

    /**
     * Update a license policy
     */
    async update(
        id: string,
        data: {
            name?: string;
            description?: string;
            isActive?: boolean;
            isDefault?: boolean;
        },
    ) {
        return this.prisma.licensePolicy.update({
            where: { id },
            data,
            include: {
                rules: {
                    include: {
                        license: true,
                    },
                },
            },
        });
    }

    /**
     * Delete a license policy
     */
    async delete(id: string) {
        return this.prisma.licensePolicy.delete({
            where: { id },
        });
    }

    /**
     * Add a rule to a policy
     */
    async addRule(
        policyId: string,
        rule: {
            ruleType: LicenseRuleType;
            licenseId?: string;
            classification?: LicenseClassification;
            action: LicensePolicyAction;
            message?: string;
            priority?: number;
        },
    ) {
        return this.prisma.licensePolicyRule.create({
            data: {
                policyId,
                ...rule,
            },
            include: {
                license: true,
            },
        });
    }

    /**
     * Remove a rule from a policy
     */
    async removeRule(ruleId: string) {
        return this.prisma.licensePolicyRule.delete({
            where: { id: ruleId },
        });
    }

    /**
     * Evaluate a scan against a license policy
     */
    async evaluatePolicy(scanResultId: string, policyId?: string): Promise<PolicyEvaluationResult> {
        // Get the policy (default or specified)
        let policy: LicensePolicy & { rules: any[] };

        if (policyId) {
            policy = await this.findById(policyId);
        } else {
            // Find default policy
            const defaultPolicy = await this.prisma.licensePolicy.findFirst({
                where: { isDefault: true, isActive: true },
                include: {
                    rules: {
                        include: {
                            license: true,
                        },
                        orderBy: { priority: 'desc' },
                    },
                },
            });

            if (!defaultPolicy) {
                // No policy, everything passes
                return {
                    passed: true,
                    violations: [],
                    warnings: [],
                    summary: {
                        totalPackages: 0,
                        blockedPackages: 0,
                        warnedPackages: 0,
                    },
                };
            }

            policy = defaultPolicy;
        }

        // Get all package licenses for the scan
        const packageLicenses = await this.prisma.packageLicense.findMany({
            where: { scanResultId },
            include: {
                license: true,
            },
        });

        const violations: PolicyViolation[] = [];
        const warnings: PolicyViolation[] = [];

        // Group packages by license
        const licensePackages = new Map<string, Array<{ name: string; version: string; classification: LicenseClassification }>>();

        for (const pl of packageLicenses) {
            const key = pl.licenseName;
            const existing = licensePackages.get(key) || [];
            existing.push({
                name: pl.pkgName,
                version: pl.pkgVersion,
                classification: pl.license?.classification || 'UNKNOWN',
            });
            licensePackages.set(key, existing);
        }

        // Evaluate each license against rules
        for (const [licenseName, packages] of licensePackages) {
            const classification = packages[0].classification;
            const matchingRule = this.findMatchingRule(policy.rules, licenseName, classification);

            if (matchingRule) {
                const violation: PolicyViolation = {
                    licenseName,
                    classification,
                    packages: packages.map(p => ({ name: p.name, version: p.version })),
                    action: matchingRule.action,
                    message: matchingRule.message ?? undefined,
                };

                if (matchingRule.action === 'BLOCK') {
                    violations.push(violation);
                } else if (matchingRule.action === 'WARN') {
                    warnings.push(violation);
                }
            }
        }

        const blockedPackages = violations.reduce((sum, v) => sum + v.packages.length, 0);
        const warnedPackages = warnings.reduce((sum, w) => sum + w.packages.length, 0);

        return {
            passed: violations.length === 0,
            violations,
            warnings,
            summary: {
                totalPackages: packageLicenses.length,
                blockedPackages,
                warnedPackages,
            },
        };
    }

    /**
     * Find matching rule for a license
     */
    private findMatchingRule(
        rules: Array<{
            ruleType: LicenseRuleType;
            license?: { spdxId: string } | null;
            classification?: LicenseClassification | null;
            action: LicensePolicyAction;
            message?: string | null;
        }>,
        licenseName: string,
        classification: LicenseClassification,
    ) {
        // Sort by priority (higher first)
        const sortedRules = [...rules].sort((a, b) => 0); // Already sorted

        for (const rule of sortedRules) {
            // Check specific license rule
            if (rule.ruleType === 'SPECIFIC_LICENSE' && rule.license) {
                if (rule.license.spdxId === licenseName) {
                    return rule;
                }
            }

            // Check classification rule
            if (rule.ruleType === 'CLASSIFICATION' && rule.classification) {
                if (rule.classification === classification) {
                    return rule;
                }
            }

            // Check unknown license rule
            if (rule.ruleType === 'UNKNOWN_LICENSE' && classification === 'UNKNOWN') {
                return rule;
            }
        }

        return null;
    }

    /**
     * Create default license policy with standard rules
     */
    async createDefaultPolicy(organizationId?: string) {
        return this.create({
            name: 'Default License Policy',
            description: 'Standard license policy based on Google License Classification',
            organizationId,
            isDefault: true,
            rules: [
                // Block forbidden licenses
                {
                    ruleType: 'CLASSIFICATION',
                    classification: 'FORBIDDEN',
                    action: 'BLOCK',
                    message: 'Forbidden license detected - commercial use prohibited',
                    priority: 100,
                },
                // Warn on restricted licenses
                {
                    ruleType: 'CLASSIFICATION',
                    classification: 'RESTRICTED',
                    action: 'WARN',
                    message: 'Restricted (copyleft) license detected - review required',
                    priority: 90,
                },
                // Warn on unknown licenses
                {
                    ruleType: 'UNKNOWN_LICENSE',
                    action: 'WARN',
                    message: 'Unknown license detected - manual review required',
                    priority: 80,
                },
            ],
        });
    }
}
