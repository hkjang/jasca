import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log:
                process.env.NODE_ENV === 'development'
                    ? ['query', 'info', 'warn', 'error']
                    : ['error'],
        });
    }

    async onModuleInit() {
        this.logger.log('Connecting to database...');
        try {
            await this.$connect();
            this.logger.log('✅ Database connected successfully');
        } catch (error) {
            this.logger.error(`❌ Database connection failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    async onModuleDestroy() {
        this.logger.log('Disconnecting from database...');
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }

    async cleanDatabase() {
        if (process.env.NODE_ENV !== 'production') {
            this.logger.warn('Cleaning database...');
            // Delete in order due to foreign key constraints
            await this.vulnerabilityComment.deleteMany();
            await this.scanVulnerability.deleteMany();
            await this.scanSummary.deleteMany();
            await this.vulnerability.deleteMany();
            await this.scanResult.deleteMany();
            await this.policyException.deleteMany();
            await this.policyRule.deleteMany();
            await this.policy.deleteMany();
            await this.registry.deleteMany();
            await this.project.deleteMany();
            await this.apiToken.deleteMany();
            await this.userRole.deleteMany();
            await this.user.deleteMany();
            await this.organization.deleteMany();
            await this.auditLog.deleteMany();
            this.logger.warn('Database cleaned');
        }
    }
}
