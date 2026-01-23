import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    Req,
    Res,
    Headers,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MfaService } from './services/mfa.service';
import { SessionService } from './services/session.service';
import { LoginHistoryService } from './services/login-history.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { EmailVerificationService } from './services/email-verification.service';
import { InvitationService } from './services/invitation.service';
import { KeycloakService, KeycloakConfig } from './services/keycloak.service';
import { SettingsService } from '../settings/settings.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly mfaService: MfaService,
        private readonly sessionService: SessionService,
        private readonly loginHistoryService: LoginHistoryService,
        private readonly passwordPolicyService: PasswordPolicyService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly invitationService: InvitationService,
        private readonly keycloakService: KeycloakService,
        private readonly settingsService: SettingsService,
    ) { }

    // ==================== Basic Auth ====================

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Headers('user-agent') userAgent?: string,
    ) {
        const ipAddress = req.ip || req.socket.remoteAddress;
        return this.authService.login(dto, { ipAddress, userAgent });
    }

    @Post('mfa/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify MFA code and complete login' })
    async verifyMfa(
        @Body() body: { mfaToken: string; code: string },
        @Req() req: Request,
        @Headers('user-agent') userAgent?: string,
    ) {
        const ipAddress = req.ip || req.socket.remoteAddress;
        return this.authService.verifyMfaAndLogin(body.mfaToken, body.code, { ipAddress, userAgent });
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    async refresh(@Body() body: { refreshToken: string }) {
        return this.authService.refreshTokens(body.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout current session' })
    async logout(@Body() body: { refreshToken: string }) {
        await this.authService.logout(body.refreshToken);
        return { message: 'Logged out successfully' };
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from all devices' })
    async logoutAll(@CurrentUser() user: any) {
        const count = await this.authService.logoutAllDevices(user.id);
        return { message: `Logged out from ${count} sessions` };
    }

    // ==================== MFA ====================

    @Post('mfa/setup')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Setup MFA for current user' })
    async setupMfa(@CurrentUser() user: any) {
        return this.mfaService.setupMfa(user.id, user.email);
    }

    @Post('mfa/enable')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Enable MFA after verifying setup code' })
    async enableMfa(@CurrentUser() user: any, @Body() body: { code: string }) {
        const isValid = await this.mfaService.verifyAndEnable(user.id, body.code);
        if (!isValid) {
            return { success: false, message: 'Invalid code' };
        }
        return { success: true, message: 'MFA enabled successfully' };
    }

    @Post('mfa/disable')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Disable MFA for current user' })
    async disableMfa(@CurrentUser() user: any, @Body() body: { code: string }) {
        const isValid = await this.mfaService.verifyToken(user.id, body.code);
        if (!isValid) {
            return { success: false, message: 'Invalid code' };
        }
        await this.mfaService.disableMfa(user.id);
        return { success: true, message: 'MFA disabled successfully' };
    }

    @Post('mfa/backup-codes')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Regenerate backup codes' })
    async regenerateBackupCodes(@CurrentUser() user: any, @Body() body: { code: string }) {
        const isValid = await this.mfaService.verifyToken(user.id, body.code);
        if (!isValid) {
            return { success: false, message: 'Invalid code' };
        }
        const backupCodes = await this.mfaService.regenerateBackupCodes(user.id);
        return { success: true, backupCodes };
    }

    @Get('mfa/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get MFA status for current user' })
    async getMfaStatus(@CurrentUser() user: any) {
        const isEnabled = await this.mfaService.isMfaEnabled(user.id);
        return { enabled: isEnabled };
    }

    // ==================== Sessions ====================

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all active sessions for current user' })
    async getSessions(@CurrentUser() user: any) {
        return this.sessionService.getUserSessions(user.id);
    }

    @Delete('sessions/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke a specific session' })
    async revokeSession(@CurrentUser() user: any, @Param('id') sessionId: string) {
        await this.sessionService.invalidateSession(sessionId);
        return { message: 'Session revoked' };
    }

    // ==================== Password ====================

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change password for current user' })
    async changePassword(
        @CurrentUser() user: any,
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        await this.passwordPolicyService.changePassword(user.id, body.currentPassword, body.newPassword);
        return { message: 'Password changed successfully' };
    }

    // ==================== Email Verification ====================

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify email with token' })
    async verifyEmail(@Query('token') token: string) {
        const result = await this.emailVerificationService.verifyEmail(token);
        if (!result.success) {
            return { success: false, message: 'Invalid or expired token' };
        }
        return { success: true, message: 'Email verified successfully' };
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Resend email verification' })
    async resendVerification(@CurrentUser() user: any) {
        await this.emailVerificationService.resendVerification(user.id);
        return { message: 'Verification email sent' };
    }

    // ==================== Invitations ====================

    @Post('invite')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Invite a user to organization' })
    async inviteUser(
        @CurrentUser() user: any,
        @Body() body: { email: string; role?: string },
    ) {
        const result = await this.invitationService.createInvitation(
            body.email,
            user.organizationId,
            user.id,
            (body.role as any) || 'DEVELOPER',
        );
        return { message: 'Invitation sent', expiresAt: result.expiresAt };
    }

    @Get('invitation/:token')
    @ApiOperation({ summary: 'Get invitation details' })
    async getInvitation(@Param('token') token: string) {
        return this.invitationService.getInvitationByToken(token);
    }

    @Post('accept-invitation')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Accept invitation and create account' })
    async acceptInvitation(
        @Body() body: { token: string; name: string; password: string },
    ) {
        const passwordHash = await this.passwordPolicyService.hashPassword(body.password);
        const result = await this.invitationService.acceptInvitation(body.token, body.name, passwordHash);
        return { message: 'Account created successfully', ...result };
    }

    // ==================== Login History ====================

    @Get('login-history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get login history for current user' })
    async getLoginHistory(
        @CurrentUser() user: any,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.loginHistoryService.getLoginHistory(
            user.id,
            limit ? parseInt(limit, 10) : 20,
            offset ? parseInt(offset, 10) : 0,
        );
    }

    // ==================== SSO ====================

    @Get('sso/:provider')
    @ApiOperation({ summary: 'Initiate SSO authentication' })
    async initiateSso(
        @Param('provider') provider: string,
        @Query('redirect') redirect: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const startTime = Date.now();
        const requestId = `sso-init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        
        this.logger.log(`[${requestId}] SSO initiation started - provider: ${provider}, redirect: ${redirect || '/dashboard'}`);

        try {
            // 지원하는 SSO 제공자 확인
            const supportedProviders = ['keycloak'];
            if (!supportedProviders.includes(provider)) {
                this.logger.warn(`[${requestId}] Unsupported SSO provider requested: ${provider}`);
                throw new BadRequestException(`SSO provider '${provider}' is not supported. Supported providers: ${supportedProviders.join(', ')}`);
            }

            // SSO 설정 확인
            this.logger.debug(`[${requestId}] Fetching SSO settings...`);
            const ssoSettings = await this.settingsService.get('sso') as any;
            
            if (!ssoSettings) {
                this.logger.warn(`[${requestId}] SSO settings not found in database`);
                throw new BadRequestException('SSO is not configured. Please configure SSO settings in admin panel.');
            }

            if (!ssoSettings.enabled) {
                this.logger.warn(`[${requestId}] SSO is disabled globally`);
                throw new BadRequestException('SSO is currently disabled');
            }

            if (!ssoSettings.providers?.keycloak?.enabled) {
                this.logger.warn(`[${requestId}] Keycloak provider is disabled in SSO settings`);
                throw new BadRequestException('Keycloak SSO is not enabled');
            }

            // Keycloak 설정 조회
            this.logger.debug(`[${requestId}] Fetching Keycloak settings...`);
            const keycloakSettings = await this.settingsService.get('keycloak') as KeycloakConfig & { enabled: boolean };
            
            if (!keycloakSettings) {
                this.logger.error(`[${requestId}] Keycloak settings not found in database`);
                throw new BadRequestException('Keycloak is not configured. Please configure Keycloak settings in admin panel.');
            }

            if (!keycloakSettings.enabled) {
                this.logger.warn(`[${requestId}] Keycloak is disabled`);
                throw new BadRequestException('Keycloak is disabled');
            }

            // Keycloak 필수 설정 검증
            const missingConfig: string[] = [];
            if (!keycloakSettings.serverUrl) missingConfig.push('serverUrl');
            if (!keycloakSettings.realm) missingConfig.push('realm');
            if (!keycloakSettings.clientId) missingConfig.push('clientId');
            if (!keycloakSettings.clientSecret) missingConfig.push('clientSecret');

            if (missingConfig.length > 0) {
                this.logger.error(`[${requestId}] Keycloak configuration incomplete. Missing: ${missingConfig.join(', ')}`);
                throw new BadRequestException(`Keycloak configuration is incomplete. Missing: ${missingConfig.join(', ')}`);
            }

            // Callback URL 구성
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const host = req.headers['x-forwarded-host'] || req.get('host');
            
            if (!host) {
                this.logger.error(`[${requestId}] Cannot determine host for callback URL`);
                throw new BadRequestException('Cannot determine callback URL. Host header is missing.');
            }

            const callbackUrl = `${protocol}://${host}/api/auth/sso/${provider}/callback`;
            this.logger.debug(`[${requestId}] Callback URL: ${callbackUrl}`);

            // State 생성 (redirect URL 및 CSRF 방지용 랜덤 값 포함)
            const stateData = {
                redirect: redirect || '/dashboard',
                nonce: Math.random().toString(36).slice(2),
                timestamp: Date.now(),
            };
            const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

            // Keycloak authorization URL 생성
            const authUrl = this.keycloakService.getAuthorizationUrl(keycloakSettings, callbackUrl, state);
            
            this.logger.log(`[${requestId}] Redirecting to Keycloak - serverUrl: ${keycloakSettings.serverUrl}, realm: ${keycloakSettings.realm}, duration: ${Date.now() - startTime}ms`);

            return res.redirect(authUrl);
        } catch (err: any) {
            const duration = Date.now() - startTime;
            if (err instanceof BadRequestException) {
                this.logger.warn(`[${requestId}] SSO initiation failed (${duration}ms): ${err.message}`);
                throw err;
            }
            this.logger.error(`[${requestId}] Unexpected error during SSO initiation (${duration}ms): ${err.message}`, err.stack);
            throw new BadRequestException('SSO initialization failed. Please try again or contact administrator.');
        }
    }

    @Get('sso/:provider/callback')
    @ApiOperation({ summary: 'SSO callback handler' })
    async handleSsoCallback(
        @Param('provider') provider: string,
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Query('error_description') errorDescription: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const startTime = Date.now();
        const requestId = `sso-callback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        
        this.logger.log(`[${requestId}] SSO callback received - provider: ${provider}, hasCode: ${!!code}, hasError: ${!!error}`);

        // State에서 redirect URL 추출
        let redirectUrl = '/dashboard';
        let stateData: any = null;
        
        try {
            if (state) {
                stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
                redirectUrl = stateData.redirect || '/dashboard';
                this.logger.debug(`[${requestId}] State decoded - redirect: ${redirectUrl}, nonce: ${stateData.nonce}`);
                
                // State 만료 확인 (10분)
                if (stateData.timestamp && Date.now() - stateData.timestamp > 10 * 60 * 1000) {
                    this.logger.warn(`[${requestId}] State expired - timestamp: ${stateData.timestamp}`);
                    return res.redirect('/login?error=' + encodeURIComponent('SSO session expired. Please try again.'));
                }
            } else {
                this.logger.warn(`[${requestId}] No state parameter received`);
            }
        } catch (parseError: any) {
            this.logger.warn(`[${requestId}] Failed to parse state: ${parseError.message}`);
        }

        // IDP 에러 처리
        if (error) {
            this.logger.error(`[${requestId}] SSO error from IDP - error: ${error}, description: ${errorDescription}`);
            const errorMessage = errorDescription || error || 'Authentication failed';
            return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
        }

        // Authorization code 확인
        if (!code) {
            this.logger.error(`[${requestId}] No authorization code received`);
            return res.redirect('/login?error=' + encodeURIComponent('No authorization code received from identity provider'));
        }

        try {
            // Keycloak 설정 조회
            this.logger.debug(`[${requestId}] Fetching Keycloak settings...`);
            const keycloakSettings = await this.settingsService.get('keycloak') as KeycloakConfig & { enabled: boolean };
            
            if (!keycloakSettings?.enabled) {
                this.logger.error(`[${requestId}] Keycloak is not enabled`);
                throw new Error('Keycloak is not enabled');
            }

            // Callback URL 재구성 (토큰 교환 시 동일한 redirect_uri 사용 필요)
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const host = req.headers['x-forwarded-host'] || req.get('host');
            const callbackUrl = `${protocol}://${host}/api/auth/sso/${provider}/callback`;

            // Authorization code를 토큰으로 교환
            this.logger.debug(`[${requestId}] Exchanging authorization code for tokens...`);
            const tokens = await this.keycloakService.exchangeCodeForToken(keycloakSettings, code, callbackUrl);
            this.logger.debug(`[${requestId}] Token exchange successful`);

            // 사용자 정보 조회/생성
            this.logger.debug(`[${requestId}] Finding or creating user from token...`);
            const userInfo = await this.keycloakService.findOrCreateUserFromToken(keycloakSettings, tokens.accessToken);
            this.logger.log(`[${requestId}] User processed - email: ${userInfo.email}, isNew: ${userInfo.isNew}`);

            // 로컬 JWT 토큰 생성
            this.logger.debug(`[${requestId}] Generating local JWT tokens...`);
            const localTokens = await this.authService.generateTokensForUser(userInfo.userId, {
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            });

            // 토큰을 쿼리 파라미터로 전달하여 리다이렉트
            const redirectWithTokens = `${redirectUrl}?accessToken=${encodeURIComponent(localTokens.accessToken)}&refreshToken=${encodeURIComponent(localTokens.refreshToken)}`;

            const duration = Date.now() - startTime;
            this.logger.log(`[${requestId}] SSO login successful - email: ${userInfo.email}, isNew: ${userInfo.isNew}, duration: ${duration}ms`);
            
            return res.redirect(redirectWithTokens);
        } catch (err: any) {
            const duration = Date.now() - startTime;
            this.logger.error(`[${requestId}] SSO callback error (${duration}ms): ${err.message}`, err.stack);
            
            // 사용자에게 보여줄 에러 메시지 (보안상 상세 정보 제외)
            let userMessage = 'SSO authentication failed';
            if (err.message.includes('User does not exist')) {
                userMessage = 'User account not found. Please contact administrator.';
            } else if (err.message.includes('auto-creation is disabled')) {
                userMessage = 'Automatic user registration is disabled. Please contact administrator.';
            } else if (err.message.includes('Email not provided')) {
                userMessage = 'Email not provided by identity provider. Please check your IDP configuration.';
            }
            
            return res.redirect(`/login?error=${encodeURIComponent(userMessage)}`);
        }
    }
}
