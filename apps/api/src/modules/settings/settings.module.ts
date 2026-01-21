import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SsoSettingsController } from './sso-settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, forwardRef(() => AuthModule)],
    controllers: [SettingsController, SsoSettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule { }



