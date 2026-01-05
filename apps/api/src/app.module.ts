import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ScansModule } from './modules/scans/scans.module';
import { VulnerabilitiesModule } from './modules/vulnerabilities/vulnerabilities.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { StatsModule } from './modules/stats/stats.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { NormalizationModule } from './modules/normalization/normalization.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { UserExperienceModule } from './modules/user-experience/user-experience.module';
import { MultiOrgModule } from './modules/multi-org/multi-org.module';
import { AutomationModule } from './modules/automation/automation.module';
import { AiModule } from './modules/ai/ai.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { OperationsModule } from './modules/operations/operations.module';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TrivyDbModule } from './modules/trivy-db/trivy-db.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        InfrastructureModule,
        PrismaModule,
        AuthModule,
        UsersModule,
        OrganizationsModule,
        ProjectsModule,
        ScansModule,
        VulnerabilitiesModule,
        PoliciesModule,
        StatsModule,
        ReportsModule,
        NotificationsModule,
        AuditModule,
        NormalizationModule,
        IntegrationsModule,
        AnalysisModule,
        UserExperienceModule,
        MultiOrgModule,
        AutomationModule,
        AiModule,
        ComplianceModule,
        OperationsModule,
        SettingsModule,
        TrivyDbModule,
    ],
})
export class AppModule { }


