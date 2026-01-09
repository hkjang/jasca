import { Module } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { TrivyParserService } from './services/trivy-parser.service';
import { LicensesModule } from '../licenses/licenses.module';

@Module({
    imports: [LicensesModule],
    controllers: [ScansController],
    providers: [ScansService, TrivyParserService],
    exports: [ScansService],
})
export class ScansModule { }

