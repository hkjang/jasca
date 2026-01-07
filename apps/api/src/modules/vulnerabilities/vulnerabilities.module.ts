import { Module } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { CveMergeService } from './services/cve-merge.service';
import { ImpactScopeService } from './services/impact-scope.service';
import { WorkflowService } from './services/workflow.service';
import { FixEvidenceService } from './services/fix-evidence.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [PrismaModule, SettingsModule],
    controllers: [VulnerabilitiesController],
    providers: [
        VulnerabilitiesService,
        CveMergeService,
        ImpactScopeService,
        WorkflowService,
        FixEvidenceService,
    ],
    exports: [
        VulnerabilitiesService,
        CveMergeService,
        ImpactScopeService,
        WorkflowService,
        FixEvidenceService,
    ],
})
export class VulnerabilitiesModule { }

