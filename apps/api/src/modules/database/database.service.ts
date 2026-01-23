import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface MigrationInfo {
    id: string;
    name: string;
    appliedAt: Date | null;
    status: 'applied' | 'pending';
}

export interface DbStatus {
    connected: boolean;
    version: string | null;
    lastMigration: string | null;
    pendingCount: number;
    tablesCount: number;
}

export interface MigrationResult {
    success: boolean;
    message: string;
    output?: string;
    error?: string;
}

@Injectable()
export class DatabaseService {
    private readonly logger = new Logger(DatabaseService.name);
    private readonly prismaDir: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) {
        // Prisma 디렉토리 경로 (apps/api/prisma)
        this.prismaDir = path.join(process.cwd(), 'prisma');
    }

    /**
     * 데이터베이스 연결 상태 및 버전 정보 조회
     */
    async getDbStatus(): Promise<DbStatus> {
        try {
            // PostgreSQL 버전 조회
            const versionResult = await this.prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
            const version = versionResult[0]?.version || null;

            // 테이블 수 조회
            const tablesResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `;
            const tablesCount = Number(tablesResult[0]?.count || 0);

            // 마이그레이션 정보 조회
            const migrations = await this.getAppliedMigrations();
            const lastMigration = migrations.length > 0 ? migrations[migrations.length - 1].name : null;

            // Pending 마이그레이션 수
            const pendingMigrations = await this.getPendingMigrations();

            return {
                connected: true,
                version,
                lastMigration,
                pendingCount: pendingMigrations.length,
                tablesCount,
            };
        } catch (error) {
            this.logger.error('Failed to get database status', error);
            return {
                connected: false,
                version: null,
                lastMigration: null,
                pendingCount: 0,
                tablesCount: 0,
            };
        }
    }

    /**
     * 헬스 체크 - 간단한 쿼리로 DB 연결 확인
     */
    async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
        const start = Date.now();
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                healthy: true,
                latencyMs: Date.now() - start,
            };
        } catch (error) {
            return {
                healthy: false,
                latencyMs: Date.now() - start,
            };
        }
    }

    /**
     * 적용된 마이그레이션 목록 조회
     */
    async getAppliedMigrations(): Promise<MigrationInfo[]> {
        try {
            // _prisma_migrations 테이블에서 적용된 마이그레이션 조회
            const appliedMigrations = await this.prisma.$queryRaw<Array<{
                id: string;
                migration_name: string;
                finished_at: Date;
            }>>`
                SELECT id, migration_name, finished_at 
                FROM "_prisma_migrations" 
                WHERE finished_at IS NOT NULL
                ORDER BY finished_at ASC
            `;

            return appliedMigrations.map((m) => ({
                id: m.id,
                name: m.migration_name,
                appliedAt: m.finished_at,
                status: 'applied' as const,
            }));
        } catch (error) {
            // 테이블이 없는 경우 (최초 실행)
            this.logger.warn('Could not query migrations table:', error);
            return [];
        }
    }

    /**
     * Pending 마이그레이션 목록 조회 (파일 시스템 기반)
     */
    async getPendingMigrations(): Promise<MigrationInfo[]> {
        try {
            const migrationsDir = path.join(this.prismaDir, 'migrations');
            
            // migrations 폴더 존재 확인
            if (!fs.existsSync(migrationsDir)) {
                return [];
            }

            // 모든 마이그레이션 폴더 조회
            const allMigrationFolders = fs.readdirSync(migrationsDir)
                .filter(name => {
                    const fullPath = path.join(migrationsDir, name);
                    return fs.statSync(fullPath).isDirectory() && 
                           fs.existsSync(path.join(fullPath, 'migration.sql'));
                })
                .sort();

            // 적용된 마이그레이션 목록
            const appliedMigrations = await this.getAppliedMigrations();
            const appliedNames = new Set(appliedMigrations.map(m => m.name));

            // Pending 마이그레이션 찾기
            const pendingMigrations = allMigrationFolders
                .filter(name => !appliedNames.has(name))
                .map(name => ({
                    id: '',
                    name,
                    appliedAt: null,
                    status: 'pending' as const,
                }));

            return pendingMigrations;
        } catch (error) {
            this.logger.error('Failed to get pending migrations', error);
            return [];
        }
    }

    /**
     * 모든 마이그레이션 정보 조회 (적용됨 + Pending)
     */
    async getAllMigrations(): Promise<{
        applied: MigrationInfo[];
        pending: MigrationInfo[];
    }> {
        const [applied, pending] = await Promise.all([
            this.getAppliedMigrations(),
            this.getPendingMigrations(),
        ]);

        return { applied, pending };
    }

    /**
     * 마이그레이션 실행 (prisma migrate deploy)
     */
    async runMigrations(userId: string, ipAddress?: string): Promise<MigrationResult> {
        this.logger.log('Starting database migration...');
        
        // 감사 로그 기록 - 시작
        await this.auditService.log({
            userId,
            action: 'DATABASE_MIGRATION_START',
            resource: 'Database',
            resourceId: 'system',
            details: { timestamp: new Date().toISOString() },
            ipAddress,
        });

        try {
            // npx prisma migrate deploy 실행
            const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
                cwd: path.dirname(this.prismaDir.replace('/prisma', '')),
                env: { ...process.env },
                timeout: 300000, // 5분 타임아웃
            });

            const output = stdout + (stderr ? `\nWarnings:\n${stderr}` : '');
            
            this.logger.log('Migration completed successfully');
            
            // 감사 로그 기록 - 성공
            await this.auditService.log({
                userId,
                action: 'DATABASE_MIGRATION_SUCCESS',
                resource: 'Database',
                resourceId: 'system',
                details: { output },
                ipAddress,
            });

            return {
                success: true,
                message: '마이그레이션이 성공적으로 완료되었습니다.',
                output,
            };
        } catch (error: any) {
            this.logger.error('Migration failed', error);

            // 감사 로그 기록 - 실패
            await this.auditService.log({
                userId,
                action: 'DATABASE_MIGRATION_FAILED',
                resource: 'Database',
                resourceId: 'system',
                details: { error: error.message, stderr: error.stderr },
                ipAddress,
            });

            return {
                success: false,
                message: '마이그레이션 실행 중 오류가 발생했습니다.',
                error: error.stderr || error.message,
            };
        }
    }

    /**
     * 시드 데이터 실행
     */
    async runSeed(userId: string, ipAddress?: string): Promise<MigrationResult> {
        this.logger.log('Starting database seed...');

        // 감사 로그 기록 - 시작
        await this.auditService.log({
            userId,
            action: 'DATABASE_SEED_START',
            resource: 'Database',
            resourceId: 'system',
            details: { timestamp: new Date().toISOString() },
            ipAddress,
        });

        try {
            // npx prisma db seed 실행
            const { stdout, stderr } = await execAsync('npx prisma db seed', {
                cwd: path.dirname(this.prismaDir.replace('/prisma', '')),
                env: { ...process.env },
                timeout: 120000, // 2분 타임아웃
            });

            const output = stdout + (stderr ? `\nWarnings:\n${stderr}` : '');
            
            this.logger.log('Seed completed successfully');

            // 감사 로그 기록 - 성공
            await this.auditService.log({
                userId,
                action: 'DATABASE_SEED_SUCCESS',
                resource: 'Database',
                resourceId: 'system',
                details: { output },
                ipAddress,
            });

            return {
                success: true,
                message: '시드 데이터가 성공적으로 삽입되었습니다.',
                output,
            };
        } catch (error: any) {
            this.logger.error('Seed failed', error);

            // 감사 로그 기록 - 실패
            await this.auditService.log({
                userId,
                action: 'DATABASE_SEED_FAILED',
                resource: 'Database',
                resourceId: 'system',
                details: { error: error.message, stderr: error.stderr },
                ipAddress,
            });

            return {
                success: false,
                message: '시드 데이터 실행 중 오류가 발생했습니다.',
                error: error.stderr || error.message,
            };
        }
    }

    /**
     * Prisma 클라이언트 재생성
     */
    async regenerateClient(userId: string, ipAddress?: string): Promise<MigrationResult> {
        this.logger.log('Regenerating Prisma client...');

        try {
            const { stdout, stderr } = await execAsync('npx prisma generate', {
                cwd: path.dirname(this.prismaDir.replace('/prisma', '')),
                env: { ...process.env },
                timeout: 60000, // 1분 타임아웃
            });

            const output = stdout + (stderr ? `\nWarnings:\n${stderr}` : '');

            // 감사 로그 기록
            await this.auditService.log({
                userId,
                action: 'PRISMA_CLIENT_REGENERATE',
                resource: 'Database',
                resourceId: 'system',
                details: { output },
                ipAddress,
            });

            return {
                success: true,
                message: 'Prisma 클라이언트가 재생성되었습니다.',
                output,
            };
        } catch (error: any) {
            this.logger.error('Client regeneration failed', error);
            return {
                success: false,
                message: 'Prisma 클라이언트 재생성 중 오류가 발생했습니다.',
                error: error.stderr || error.message,
            };
        }
    }
}
