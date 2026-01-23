import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { KeycloakService } from '../auth/services/keycloak.service';
import { LdapService, LdapConfig, LdapSyncResult } from '../auth/services/ldap.service';

// DTO Types
interface SsoSettings {
    enabled: boolean;
    providers: {
        google: { enabled: boolean; clientId?: string; clientSecret?: string };
        github: { enabled: boolean; clientId?: string; clientSecret?: string };
        microsoft: { enabled: boolean; clientId?: string; clientSecret?: string; tenantId?: string };
        keycloak: { enabled: boolean };
        ldap: { enabled: boolean };
    };
}

interface KeycloakSettings {
    enabled: boolean;
    serverUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    syncEnabled: boolean;
    syncInterval: number;
    autoCreateUsers: boolean;
    autoUpdateUsers: boolean;
    defaultRole: string;
    groupMapping: Record<string, string>;
    lastSyncAt: string | null;
    lastSyncResult: any;
}

interface LdapSettings {
    enabled: boolean;
    serverUrl: string;
    bindDn: string;
    bindPassword: string;
    baseDn: string;
    userSearchBase: string;
    userSearchFilter: string;
    usernameAttribute: string;
    emailAttribute: string;
    nameAttribute: string;
    groupSearchBase: string;
    groupSearchFilter: string;
    groupMemberAttribute: string;
    useTls: boolean;
    syncEnabled: boolean;
    syncInterval: number;
    autoCreateUsers: boolean;
    autoUpdateUsers: boolean;
    defaultRole: string;
    groupMapping: Record<string, string>;
    lastSyncAt: string | null;
    lastSyncResult: any;
}

interface PublicSsoSettings {
    enabled: boolean;
    providers: {
        google: boolean;
        github: boolean;
        microsoft: boolean;
        keycloak: boolean;
        ldap: boolean;
    };
    keycloakConfig?: {
        serverUrl: string;
        realm: string;
        clientId: string;
    };
}

@ApiTags('SSO Settings')
@Controller('settings')
export class SsoSettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly keycloakService: KeycloakService,
        private readonly ldapService: LdapService,
    ) { }

    /**
     * 공개 SSO 설정 조회 - 로그인 페이지에서 사용
     * 인증 없이 접근 가능
     */
    @Get('sso/public')
    @ApiOperation({ summary: 'Get public SSO settings for login page' })
    async getPublicSsoSettings(): Promise<PublicSsoSettings> {
        const ssoSettings = await this.settingsService.get('sso') as SsoSettings;
        const keycloakSettings = await this.settingsService.get('keycloak') as KeycloakSettings;

        // Keycloak은 설정이 완전히 구성되었을 때만 활성화로 표시
        const isKeycloakConfigured = !!(
            keycloakSettings?.enabled &&
            keycloakSettings?.serverUrl &&
            keycloakSettings?.realm &&
            keycloakSettings?.clientId &&
            keycloakSettings?.clientSecret
        );

        // LDAP 설정 조회 및 구성 확인
        const ldapSettings = await this.settingsService.get('ldap') as any;
        const isLdapConfigured = !!(
            ldapSettings?.enabled &&
            ldapSettings?.serverUrl &&
            ldapSettings?.bindDn
        );

        const result: PublicSsoSettings = {
            enabled: ssoSettings?.enabled || false,
            providers: {
                google: ssoSettings?.providers?.google?.enabled || false,
                github: ssoSettings?.providers?.github?.enabled || false,
                microsoft: ssoSettings?.providers?.microsoft?.enabled || false,
                keycloak: ssoSettings?.providers?.keycloak?.enabled && isKeycloakConfigured,
                // LDAP은 리다이렉트 SSO가 아닌 로그인 폼 방식이므로 providers에서 제외
                // 대신 백엔드 login 엔드포인트에서 LDAP 인증을 시도함
                ldap: false,
            },
        };

        // Keycloak이 활성화된 경우 OIDC 연동에 필요한 공개 정보 제공
        if (result.providers.keycloak) {
            result.keycloakConfig = {
                serverUrl: keycloakSettings.serverUrl,
                realm: keycloakSettings.realm,
                clientId: keycloakSettings.clientId,
            };
        }

        return result;
    }

    /**
     * SSO 전체 설정 조회 (관리자용)
     */
    @Get('sso')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get SSO settings (admin)' })
    async getSsoSettings(): Promise<SsoSettings> {
        const settings = await this.settingsService.get('sso') as SsoSettings;
        return settings || {
            enabled: false,
            providers: {
                google: { enabled: false, clientId: '', clientSecret: '' },
                github: { enabled: false, clientId: '', clientSecret: '' },
                microsoft: { enabled: false, clientId: '', clientSecret: '', tenantId: '' },
                keycloak: { enabled: false },
                ldap: { enabled: false },
            },
        };
    }

    /**
     * SSO 설정 업데이트
     */
    @Put('sso')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update SSO settings' })
    async updateSsoSettings(@Body() body: { value: SsoSettings }) {
        return this.settingsService.set('sso', body.value);
    }

    /**
     * Keycloak 설정 조회 (관리자용)
     */
    @Get('keycloak')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Keycloak settings (admin)' })
    async getKeycloakSettings() {
        const settings = await this.settingsService.get('keycloak') as KeycloakSettings;
        if (!settings) {
            return {
                enabled: false,
                serverUrl: '',
                realm: '',
                clientId: '',
                clientSecret: '',
                syncEnabled: false,
                syncInterval: 3600,
                autoCreateUsers: false,
                autoUpdateUsers: true,
                defaultRole: 'VIEWER',
                groupMapping: {},
                lastSyncAt: null,
                lastSyncResult: null,
            };
        }
        return {
            ...settings,
            clientSecret: settings.clientSecret ? '********' : '',
        };
    }

    /**
     * Keycloak 설정 업데이트
     */
    @Put('keycloak')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update Keycloak settings' })
    async updateKeycloakSettings(@Body() body: { value: Partial<KeycloakSettings> }) {
        const currentSettings = await this.settingsService.get('keycloak') as KeycloakSettings;
        const newSettings = { ...currentSettings, ...body.value };
        if (body.value.clientSecret === '********' && currentSettings?.clientSecret) {
            newSettings.clientSecret = currentSettings.clientSecret;
        }
        return this.settingsService.set('keycloak', newSettings);
    }

    /**
     * Keycloak 연결 테스트
     */
    @Post('keycloak/test')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Test Keycloak connection' })
    async testKeycloakConnection(@Body() config?: Partial<KeycloakSettings>) {
        let testConfig = config;
        if (!testConfig || !testConfig.serverUrl) {
            testConfig = await this.settingsService.get('keycloak') as KeycloakSettings;
        }
        if (!testConfig?.serverUrl || !testConfig?.realm) {
            return { success: false, message: 'Keycloak 서버 URL과 Realm을 입력해주세요.' };
        }
        try {
            const result = await this.keycloakService.testConnection(testConfig as any);
            return { success: result, message: result ? 'Keycloak 연결 성공' : 'Keycloak 연결 실패' };
        } catch (error: any) {
            return { success: false, message: `연결 테스트 실패: ${error.message}` };
        }
    }

    /**
     * Keycloak 계정 동기화
     */
    @Post('keycloak/sync')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Sync users from Keycloak' })
    async syncKeycloakUsers(): Promise<{ success: boolean; message: string; result?: any }> {
        const settings = await this.settingsService.get('keycloak') as KeycloakSettings;
        if (!settings?.enabled) {
            return { success: false, message: 'Keycloak 연동이 비활성화 되어 있습니다.' };
        }
        try {
            const result = await this.keycloakService.syncUsers(settings as any);
            await this.settingsService.set('keycloak', {
                ...settings,
                lastSyncAt: new Date().toISOString(),
                lastSyncResult: result,
            });
            return { success: true, message: '계정 동기화 완료', result };
        } catch (error: any) {
            return { success: false, message: `동기화 실패: ${error.message}` };
        }
    }

    // ============================================
    // LDAP Settings Endpoints
    // ============================================

    /**
     * LDAP 설정 조회 (관리자용)
     */
    @Get('ldap')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN', 'ORG_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get LDAP settings (admin)' })
    async getLdapSettings() {
        const settings = await this.settingsService.get('ldap') as LdapSettings;
        if (!settings) {
            return {
                enabled: false,
                serverUrl: '',
                bindDn: '',
                bindPassword: '',
                baseDn: '',
                userSearchBase: '',
                userSearchFilter: '(objectClass=inetOrgPerson)',
                usernameAttribute: 'uid',
                emailAttribute: 'mail',
                nameAttribute: 'cn',
                groupSearchBase: '',
                groupSearchFilter: '(objectClass=groupOfNames)',
                groupMemberAttribute: 'member',
                useTls: false,
                syncEnabled: false,
                syncInterval: 3600,
                autoCreateUsers: false,
                autoUpdateUsers: true,
                defaultRole: 'VIEWER',
                groupMapping: {},
                lastSyncAt: null,
                lastSyncResult: null,
            };
        }
        return {
            ...settings,
            bindPassword: settings.bindPassword ? '********' : '',
        };
    }

    /**
     * LDAP 설정 업데이트
     */
    @Put('ldap')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update LDAP settings' })
    async updateLdapSettings(@Body() body: { value: Partial<LdapSettings> }) {
        const currentSettings = await this.settingsService.get('ldap') as LdapSettings;
        const newSettings = { ...currentSettings, ...body.value };
        if (body.value.bindPassword === '********' && currentSettings?.bindPassword) {
            newSettings.bindPassword = currentSettings.bindPassword;
        }
        return this.settingsService.set('ldap', newSettings);
    }

    /**
     * LDAP 연결 테스트
     */
    @Post('ldap/test')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Test LDAP connection' })
    async testLdapConnection(@Body() config?: Partial<LdapSettings>) {
        let testConfig = config;
        if (!testConfig || !testConfig.serverUrl) {
            testConfig = await this.settingsService.get('ldap') as LdapSettings;
        }
        if (!testConfig?.serverUrl || !testConfig?.bindDn) {
            return { success: false, message: 'LDAP 서버 URL과 Bind DN을 입력해주세요.' };
        }
        try {
            const result = await this.ldapService.testConnection(testConfig as LdapConfig);
            return { success: result, message: result ? 'LDAP 연결 성공' : 'LDAP 연결 실패' };
        } catch (error: any) {
            return { success: false, message: `연결 테스트 실패: ${error.message}` };
        }
    }

    /**
     * LDAP 계정 동기화
     */
    @Post('ldap/sync')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SYSTEM_ADMIN')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Sync users from LDAP' })
    async syncLdapUsers(): Promise<{ success: boolean; message: string; result?: LdapSyncResult }> {
        const settings = await this.settingsService.get('ldap') as LdapSettings;
        if (!settings?.enabled) {
            return { success: false, message: 'LDAP 연동이 비활성화 되어 있습니다.' };
        }
        try {
            const result = await this.ldapService.syncUsers(settings as LdapConfig);
            await this.settingsService.set('ldap', {
                ...settings,
                lastSyncAt: new Date().toISOString(),
                lastSyncResult: result,
            });
            return { success: true, message: '계정 동기화 완료', result };
        } catch (error: any) {
            return { success: false, message: `동기화 실패: ${error.message}` };
        }
    }
}
