import { Module } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { TrivyParserService } from './services/trivy-parser.service';
import { VulnSyncService } from './services/vuln-sync.service';
import { LicensesModule } from '../licenses/licenses.module';

@Module({
    imports: [LicensesModule],
    controllers: [ScansController],
    providers: [ScansService, TrivyParserService, VulnSyncService],
    exports: [ScansService],
})
export class ScansModule { }

