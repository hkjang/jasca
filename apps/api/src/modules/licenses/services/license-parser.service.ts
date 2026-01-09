import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LicenseClassification } from '@prisma/client';

export interface ParsedPackageLicense {
    pkgName: string;
    pkgVersion: string;
    licenses: string[];
    pkgPath?: string;
    purl?: string;
}

/**
 * Service to parse license information from Trivy scan results
 */
@Injectable()
export class LicenseParserService {
    private readonly logger = new Logger(LicenseParserService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Parse packages from Trivy JSON result
     */
    parsePackages(rawResult: any): ParsedPackageLicense[] {
        const packages: ParsedPackageLicense[] = [];

        if (!rawResult || !rawResult.Results) {
            return packages;
        }

        for (const result of rawResult.Results) {
            // Process packages from each target
            const pkgs = result.Packages || [];

            for (const pkg of pkgs) {
                if (pkg.Licenses && pkg.Licenses.length > 0) {
                    packages.push({
                        pkgName: pkg.Name || 'unknown',
                        pkgVersion: pkg.Version || 'unknown',
                        licenses: pkg.Licenses,
                        pkgPath: result.Target,
                        purl: pkg.Identifier?.PURL,
                    });
                }
            }
        }

        return packages;
    }

    /**
     * Process and save package licenses for a scan result
     */
    async processLicenses(scanResultId: string, rawResult: any) {
        const packages = this.parsePackages(rawResult);

        if (packages.length === 0) {
            this.logger.debug(`No packages with licenses found in scan ${scanResultId}`);
            return { processed: 0 };
        }

        this.logger.log(`Processing ${packages.length} packages with licenses for scan ${scanResultId}`);

        let processed = 0;

        for (const pkg of packages) {
            for (const licenseName of pkg.licenses) {
                // Normalize license name
                const normalizedName = this.normalizeLicenseName(licenseName);

                // Try to find or create the license
                const license = await this.getOrCreateLicense(normalizedName);

                // Create package license record
                await this.prisma.packageLicense.create({
                    data: {
                        scanResultId,
                        licenseId: license?.id,
                        licenseName: normalizedName,
                        pkgName: pkg.pkgName,
                        pkgVersion: pkg.pkgVersion,
                        pkgPath: pkg.pkgPath,
                    },
                });

                processed++;
            }
        }

        this.logger.log(`Processed ${processed} package licenses for scan ${scanResultId}`);
        return { processed };
    }

    /**
     * Normalize license name to standard format
     */
    private normalizeLicenseName(name: string): string {
        // Remove extra whitespace
        let normalized = name.trim();

        // Common normalizations
        const mappings: Record<string, string> = {
            'Apache 2.0': 'Apache-2.0',
            'Apache License 2.0': 'Apache-2.0',
            'Apache-2': 'Apache-2.0',
            'Apache 2': 'Apache-2.0',
            'MIT License': 'MIT',
            'BSD 2-Clause': 'BSD-2-Clause',
            'BSD 3-Clause': 'BSD-3-Clause',
            'BSD-2': 'BSD-2-Clause',
            'BSD-3': 'BSD-3-Clause',
            'GPL-2': 'GPL-2.0-only',
            'GPL-3': 'GPL-3.0-only',
            'GPL v2': 'GPL-2.0-only',
            'GPL v3': 'GPL-3.0-only',
            'GPLv2': 'GPL-2.0-only',
            'GPLv3': 'GPL-3.0-only',
            'LGPL-2.1': 'LGPL-2.1-only',
            'LGPL-3.0': 'LGPL-3.0-only',
            'MPL 2.0': 'MPL-2.0',
            'MPL-2': 'MPL-2.0',
            'ISC License': 'ISC',
            'CC0': 'CC0-1.0',
            'Public Domain': 'Unlicense',
        };

        return mappings[normalized] || normalized;
    }

    /**
     * Get or create a license record
     */
    private async getOrCreateLicense(spdxId: string) {
        try {
            const existing = await this.prisma.license.findUnique({
                where: { spdxId },
            });

            if (existing) {
                return existing;
            }

            // Auto-classify based on license name
            const classification = this.classifyLicense(spdxId);

            return await this.prisma.license.create({
                data: {
                    spdxId,
                    name: spdxId,
                    classification,
                },
            });
        } catch (error) {
            // Handle unique constraint violation (race condition)
            if (error.code === 'P2002') {
                return await this.prisma.license.findUnique({
                    where: { spdxId },
                });
            }
            throw error;
        }
    }

    /**
     * Classify license based on SPDX ID
     */
    classifyLicense(spdxId: string): LicenseClassification {
        const normalized = spdxId.toUpperCase().replace(/-/g, '').replace(/ /g, '');

        // Forbidden - AGPL and similar
        if (normalized.includes('AGPL') || normalized.includes('SSPL')) {
            return 'FORBIDDEN';
        }

        // Restricted - GPL family (strong copyleft)
        if (
            (normalized.includes('GPL') && !normalized.includes('LGPL')) ||
            normalized.includes('CCBYNC') ||
            normalized.includes('CCBYND') ||
            normalized.includes('OSL') ||
            normalized.includes('SLEEPYCAT')
        ) {
            return 'RESTRICTED';
        }

        // Reciprocal - Weak copyleft
        if (
            normalized.includes('LGPL') ||
            normalized.includes('MPL') ||
            normalized.includes('EPL') ||
            normalized.includes('CDDL') ||
            normalized.includes('CPL') ||
            normalized.includes('APSL')
        ) {
            return 'RECIPROCAL';
        }

        // Notice - Permissive with attribution
        if (
            normalized.includes('MIT') ||
            normalized.includes('APACHE') ||
            normalized.includes('BSD') ||
            normalized.includes('ISC') ||
            normalized.includes('ZLIB') ||
            normalized.includes('ARTISTIC') ||
            normalized.includes('AFL') ||
            normalized.includes('BSL1')
        ) {
            return 'NOTICE';
        }

        // Unencumbered - Public domain
        if (
            normalized.includes('CC0') ||
            normalized.includes('UNLICENSE') ||
            normalized.includes('0BSD') ||
            normalized.includes('PUBLICDOMAIN') ||
            normalized.includes('WTFPL')
        ) {
            return 'UNENCUMBERED';
        }

        return 'UNKNOWN';
    }
}
