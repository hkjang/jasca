import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { LicenseParserService } from './services/license-parser.service';
import { LicensePolicyService } from './services/license-policy.service';

@Module({
    imports: [PrismaModule],
    controllers: [LicensesController],
    providers: [LicensesService, LicenseParserService, LicensePolicyService],
    exports: [LicensesService, LicenseParserService, LicensePolicyService],
})
export class LicensesModule {}
