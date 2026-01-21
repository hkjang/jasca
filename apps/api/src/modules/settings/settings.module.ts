import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SsoSettingsController } from './sso-settings.controller';
import { SettingsService } from './settings.service';
import { KeycloakService } from '../auth/services/keycloak.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SettingsController, SsoSettingsController],
    providers: [SettingsService, KeycloakService],
    exports: [SettingsService],
})
export class SettingsModule { }



