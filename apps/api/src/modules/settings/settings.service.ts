import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Default settings for each category
const defaultSettings: Record<string, unknown> = {
    workflows: {
        states: [
            { id: 'OPEN', name: '미해결', color: 'bg-red-500', description: '새로 발견된 취약점' },
            { id: 'IN_PROGRESS', name: '진행 중', color: 'bg-yellow-500', description: '조치 진행 중' },
            { id: 'RESOLVED', name: '해결됨', color: 'bg-green-500', description: '수정 완료' },
            { id: 'FALSE_POSITIVE', name: '오탐', color: 'bg-slate-500', description: '취약점이 아님' },
            { id: 'ACCEPTED', name: '예외 승인', color: 'bg-purple-500', description: '위험 수용' },
        ],
        transitions: [
            { from: 'OPEN', to: 'IN_PROGRESS', requiredRole: 'DEVELOPER' },
            { from: 'OPEN', to: 'FALSE_POSITIVE', requiredRole: 'SECURITY_ENGINEER' },
            { from: 'OPEN', to: 'ACCEPTED', requiredRole: 'ORG_ADMIN' },
            { from: 'IN_PROGRESS', to: 'RESOLVED', requiredRole: 'DEVELOPER' },
            { from: 'IN_PROGRESS', to: 'OPEN', requiredRole: 'DEVELOPER' },
            { from: 'RESOLVED', to: 'OPEN', requiredRole: 'SECURITY_ENGINEER' },
        ],
    },
    trivy: {
        outputFormat: 'json',
        schemaVersion: 2,
        severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        ignoreUnfixed: false,
        timeout: '10m',
        cacheDir: '/tmp/trivy-cache',
        scanners: ['vuln', 'secret', 'config'],
    },
    ai: {
        summaryModel: 'gpt-4',
        remediationModel: 'gpt-4-turbo',
        maxTokens: 1024,
        temperature: 0.7,
        enableAutoSummary: true,
        enableRemediationGuide: true,
    },
};

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) { }

    async get(key: string) {
        const setting = await this.prisma.systemSettings.findUnique({
            where: { key },
        });

        if (setting) {
            return setting.value;
        }

        // Return default if not found
        return defaultSettings[key] || null;
    }

    async set(key: string, value: unknown) {
        return this.prisma.systemSettings.upsert({
            where: { key },
            update: { value: value as any },
            create: {
                key,
                value: value as any,
            },
        });
    }

    async getAll() {
        const settings = await this.prisma.systemSettings.findMany();
        const result: Record<string, unknown> = { ...defaultSettings };

        for (const setting of settings) {
            result[setting.key] = setting.value;
        }

        return result;
    }
}
