import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaService } from './services/mfa.service';
import { SessionService } from './services/session.service';
import { LoginHistoryService } from './services/login-history.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { IpControlService } from './services/ip-control.service';
import { EmailVerificationService } from './services/email-verification.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { LdapService, LdapConfig } from './services/ldap.service';

export interface JwtPayload {
    sub: string;
    email: string;
    organizationId?: string;
    roles: string[];
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    requiresMfa?: boolean;
    mfaToken?: string;
}

export interface LoginContext {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly mfaService: MfaService,
        private readonly sessionService: SessionService,
        private readonly loginHistoryService: LoginHistoryService,
        private readonly passwordPolicyService: PasswordPolicyService,
        private readonly ipControlService: IpControlService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly ldapService: LdapService,
        @Inject(forwardRef(() => SettingsService)) private readonly settingsService: SettingsService,
    ) { }

    async register(dto: RegisterDto): Promise<TokenResponse> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Validate password against default policy
        const validation = await this.passwordPolicyService.validatePassword(dto.password);
        if (!validation.isValid) {
            throw new BadRequestException(validation.errors.join(', '));
        }

        const passwordHash = await this.passwordPolicyService.hashPassword(dto.password);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                passwordHash,
                passwordChangedAt: new Date(),
                isActive: dto.status !== 'INACTIVE',
                organizationId: dto.organizationId || undefined,
                roles: {
                    create: {
                        role: dto.role || 'VIEWER',
                        scope: 'ORGANIZATION',
                    },
                },
            },
            include: {
                roles: true,
            },
        });

        // Create email verification token
        const verificationToken = await this.emailVerificationService.createVerificationToken(user.id);
        this.logger.log(`Email verification token created for user ${user.email}`);

        return this.generateTokens(user);
    }

    async login(dto: LoginDto, context?: LoginContext): Promise<TokenResponse> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: {
                roles: true,
                organization: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if account is locked
        if (await this.loginHistoryService.isAccountLocked(user.id)) {
            await this.loginHistoryService.recordLoginAttempt({
                userId: user.id,
                status: 'ACCOUNT_LOCKED',
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
                deviceId: context?.deviceId,
            });
            throw new ForbiddenException('Account is temporarily locked. Please try again later.');
        }

        // Check IP whitelist if organization has one
        if (user.organizationId && context?.ipAddress) {
            const ipAllowed = await this.ipControlService.isIpAllowed(user.organizationId, context.ipAddress);
            if (!ipAllowed) {
                await this.loginHistoryService.recordLoginAttempt({
                    userId: user.id,
                    status: 'BLOCKED_IP',
                    ipAddress: context?.ipAddress,
                    userAgent: context?.userAgent,
                    deviceId: context?.deviceId,
                    failReason: 'IP not in whitelist',
                });
                throw new ForbiddenException('Access denied from this IP address');
            }
        }

        let isPasswordValid = await this.passwordPolicyService.verifyPassword(dto.password, user.passwordHash);

        // Try LDAP if local password failed
        if (!isPasswordValid) {
            try {
                const ldapSettings = await this.settingsService.get('ldap') as LdapConfig;
                if (ldapSettings?.enabled) {
                    const isLdapValid = await this.ldapService.verifyPassword(ldapSettings, user.email, dto.password);
                    if (isLdapValid) {
                        isPasswordValid = true;
                        // Sync password to local DB for fallback and faster subsequent logins
                        try {
                            const passwordHash = await this.passwordPolicyService.hashPassword(dto.password);
                            await this.prisma.user.update({
                                where: { id: user.id },
                                data: { passwordHash, passwordChangedAt: new Date() }
                            });
                        } catch (e) {
                            this.logger.warn('Failed to update password hash from LDAP login', e);
                        }
                    }
                }
            } catch (error) {
                this.logger.warn('LDAP authentication attempt failed', error);
            }
        }

        if (!isPasswordValid) {
            await this.loginHistoryService.recordLoginAttempt({
                userId: user.id,
                status: 'FAILED_PASSWORD',
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
                deviceId: context?.deviceId,
            });

            // Check if account should be locked
            if (await this.loginHistoryService.shouldLockAccount(user.id)) {
                await this.loginHistoryService.lockAccount(user.id);
            }

            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is disabled');
        }

        // Check if MFA is enabled
        const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);
        if (mfaEnabled) {
            // Return MFA required response
            const mfaToken = this.jwtService.sign(
                { sub: user.id, type: 'mfa_pending' },
                { expiresIn: '5m' }
            );
            return {
                accessToken: '',
                refreshToken: '',
                expiresIn: 0,
                requiresMfa: true,
                mfaToken,
            };
        }

        // Record successful login
        await this.loginHistoryService.recordLoginAttempt({
            userId: user.id,
            status: 'SUCCESS',
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
            deviceId: context?.deviceId,
        });

        const tokens = this.generateTokens(user);

        // Create session
        await this.sessionService.createSession(
            user.id,
            tokens.refreshToken,
            context?.ipAddress,
            {
                userAgent: context?.userAgent,
                deviceId: context?.deviceId,
            }
        );

        return tokens;
    }

    async verifyMfaAndLogin(mfaToken: string, otpCode: string, context?: LoginContext): Promise<TokenResponse> {
        try {
            const payload = this.jwtService.verify(mfaToken) as { sub: string; type: string };

            if (payload.type !== 'mfa_pending') {
                throw new UnauthorizedException('Invalid MFA token');
            }

            const userId = payload.sub;
            const isValid = await this.mfaService.verifyToken(userId, otpCode);

            if (!isValid) {
                // Try backup code
                const isBackupValid = await this.mfaService.verifyBackupCode(userId, otpCode);
                if (!isBackupValid) {
                    await this.loginHistoryService.recordLoginAttempt({
                        userId,
                        status: 'FAILED_MFA',
                        ipAddress: context?.ipAddress,
                        userAgent: context?.userAgent,
                        deviceId: context?.deviceId,
                    });
                    throw new UnauthorizedException('Invalid MFA code');
                }
            }

            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { roles: true },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Record successful login
            await this.loginHistoryService.recordLoginAttempt({
                userId: user.id,
                status: 'SUCCESS',
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
                deviceId: context?.deviceId,
            });

            const tokens = this.generateTokens(user);

            // Create session
            await this.sessionService.createSession(
                user.id,
                tokens.refreshToken,
                context?.ipAddress,
                {
                    userAgent: context?.userAgent,
                    deviceId: context?.deviceId,
                }
            );

            return tokens;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid or expired MFA token');
        }
    }

    async refreshTokens(refreshToken: string): Promise<TokenResponse> {
        const session = await this.sessionService.validateSession(refreshToken);

        if (!session) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: session.userId },
            include: { roles: true },
        });

        if (!user || !user.isActive) {
            await this.sessionService.invalidateSession(session.sessionId);
            throw new UnauthorizedException('User not found or disabled');
        }

        const tokens = this.generateTokens(user);

        // Rotate refresh token
        await this.sessionService.rotateRefreshToken(refreshToken, tokens.refreshToken);

        return tokens;
    }

    async logout(refreshToken: string): Promise<void> {
        const session = await this.sessionService.validateSession(refreshToken);
        if (session) {
            await this.sessionService.invalidateSession(session.sessionId);
        }
    }

    async logoutAllDevices(userId: string): Promise<number> {
        return this.sessionService.invalidateAllSessions(userId);
    }

    async validateUser(userId: string) {
        this.logger.debug(`Validating user: ${userId}`);
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    roles: true,
                    organization: true,
                },
            });
            
            if (user) {
                this.logger.debug(`User found: ${user.email}, active: ${user.isActive}`);
            } else {
                this.logger.warn(`User not found: ${userId}`);
            }
            
            return user;
        } catch (error) {
            this.logger.error(`Error fetching user ${userId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async validateApiKey(tokenHash: string) {
        const apiToken = await this.prisma.apiToken.findUnique({
            where: { tokenHash },
            include: {
                organization: true,
            },
        });

        if (!apiToken) {
            return null;
        }

        if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
            return null;
        }

        // Update last used
        await this.prisma.apiToken.update({
            where: { id: apiToken.id },
            data: { lastUsedAt: new Date() },
        });

        return apiToken;
    }

    private generateTokens(user: any): TokenResponse {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            organizationId: user.organizationId,
            roles: user.roles.map((r: any) => r.role),
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            refreshToken,
            expiresIn: 86400, // 1 day in seconds
        };
    }
}
