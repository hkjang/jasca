import { Injectable, BadRequestException } from '@nestjs/common';
import { Severity, SourceType } from '@prisma/client';

export interface ParsedVulnerability {
    cveId: string;
    title?: string;
    description?: string;
    severity: Severity;
    cvssScore?: number;
    cvssVector?: string;
    references: string[];
    cweIds: string[];
    publishedAt?: Date;
    lastModifiedAt?: Date;
    pkgName: string;
    pkgVersion: string;
    fixedVersion?: string;
    pkgPath?: string;
    layer?: any;
}

export interface ParsedScanResult {
    trivyVersion?: string;
    schemaVersion?: string;
    artifactName?: string;
    artifactType?: string;
    vulnerabilities: ParsedVulnerability[];
}

@Injectable()
export class TrivyParserService {
    parse(rawResult: any, sourceType: SourceType): ParsedScanResult {
        switch (sourceType) {
            case 'TRIVY_JSON':
                return this.parseJsonFormat(rawResult);
            case 'TRIVY_SARIF':
                return this.parseSarifFormat(rawResult);
            default:
                return this.parseJsonFormat(rawResult);
        }
    }

    private parseJsonFormat(rawResult: any): ParsedScanResult {
        if (!rawResult) {
            throw new BadRequestException('Empty scan result');
        }

        const result: ParsedScanResult = {
            trivyVersion: rawResult.Metadata?.ReportVersion
                ? String(rawResult.Metadata.ReportVersion)
                : rawResult.SchemaVersion
                    ? String(rawResult.SchemaVersion)
                    : undefined,
            schemaVersion: String(rawResult.SchemaVersion || '2'),
            artifactName: rawResult.ArtifactName,
            artifactType: rawResult.ArtifactType,
            vulnerabilities: [],
        };

        // Trivy can have Results array with multiple targets
        const results = rawResult.Results || [];

        for (const target of results) {
            const vulns = target.Vulnerabilities || [];

            for (const vuln of vulns) {
                result.vulnerabilities.push({
                    cveId: vuln.VulnerabilityID,
                    title: vuln.Title,
                    description: vuln.Description,
                    severity: this.mapSeverity(vuln.Severity),
                    cvssScore: this.extractCvssV3Score(vuln),
                    cvssVector: this.extractCvssV3Vector(vuln),
                    references: vuln.References || [],
                    cweIds: vuln.CweIDs || [],
                    publishedAt: vuln.PublishedDate ? new Date(vuln.PublishedDate) : undefined,
                    lastModifiedAt: vuln.LastModifiedDate
                        ? new Date(vuln.LastModifiedDate)
                        : undefined,
                    pkgName: vuln.PkgName,
                    pkgVersion: vuln.InstalledVersion,
                    fixedVersion: vuln.FixedVersion,
                    pkgPath: vuln.PkgPath || target.Target,
                    layer: vuln.Layer,
                });
            }
        }

        return result;
    }

    private parseSarifFormat(rawResult: any): ParsedScanResult {
        if (!rawResult || !rawResult.runs || !rawResult.runs[0]) {
            throw new BadRequestException('Invalid SARIF format');
        }

        const run = rawResult.runs[0];
        const tool = run.tool?.driver || {};

        const result: ParsedScanResult = {
            trivyVersion: tool.version,
            schemaVersion: rawResult.version,
            artifactName: run.originalUriBaseIds?.ROOTPATH?.uri,
            artifactType: 'sarif',
            vulnerabilities: [],
        };

        const rules = tool.rules || [];
        const rulesMap = new Map(rules.map((r: any) => [r.id, r]));

        const results = run.results || [];

        for (const finding of results) {
            const rule: any = rulesMap.get(finding.ruleId) || {};
            const properties: any = rule.properties || {};

            // Extract package info from message or properties
            const pkgInfo = this.extractPackageFromSarif(finding, properties);

            result.vulnerabilities.push({
                cveId: finding.ruleId,
                title: rule.shortDescription?.text || rule.name,
                description: rule.fullDescription?.text,
                severity: this.mapSeverity(properties.security_severity || 'UNKNOWN'),
                cvssScore: properties.cvssV3_score,
                cvssVector: properties.cvssV3_vector,
                references: (rule.helpUri ? [rule.helpUri] : []).concat(
                    properties.references || [],
                ),
                cweIds: properties.cwe_ids || [],
                publishedAt: properties.publishedDate
                    ? new Date(properties.publishedDate)
                    : undefined,
                lastModifiedAt: undefined,
                pkgName: pkgInfo.name,
                pkgVersion: pkgInfo.version,
                fixedVersion: properties.fixedVersion,
                pkgPath: finding.locations?.[0]?.physicalLocation?.artifactLocation?.uri,
                layer: undefined,
            });
        }

        return result;
    }

    private extractPackageFromSarif(
        finding: any,
        properties: any,
    ): { name: string; version: string } {
        // Try to extract from properties first
        if (properties.pkgName && properties.pkgVersion) {
            return { name: properties.pkgName, version: properties.pkgVersion };
        }

        // Try to extract from message
        const message = finding.message?.text || '';
        const match = message.match(/Package:\s*(\S+)\s+Version:\s*(\S+)/i);

        if (match) {
            return { name: match[1], version: match[2] };
        }

        return { name: 'unknown', version: 'unknown' };
    }

    private mapSeverity(severity: string): Severity {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
                return 'CRITICAL';
            case 'HIGH':
                return 'HIGH';
            case 'MEDIUM':
                return 'MEDIUM';
            case 'LOW':
                return 'LOW';
            default:
                return 'UNKNOWN';
        }
    }

    private extractCvssV3Score(vuln: any): number | undefined {
        // Try CVSS V3 first, then V2
        if (vuln.CVSS?.nvd?.V3Score) return vuln.CVSS.nvd.V3Score;
        if (vuln.CVSS?.redhat?.V3Score) return vuln.CVSS.redhat.V3Score;
        if (vuln.CVSS?.nvd?.V2Score) return vuln.CVSS.nvd.V2Score;
        return undefined;
    }

    private extractCvssV3Vector(vuln: any): string | undefined {
        if (vuln.CVSS?.nvd?.V3Vector) return vuln.CVSS.nvd.V3Vector;
        if (vuln.CVSS?.redhat?.V3Vector) return vuln.CVSS.redhat.V3Vector;
        return undefined;
    }
}
