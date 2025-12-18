import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ApiTokenController } from './api-token.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { UsersModule } from '../users/users.module';

// Auth extension services
import { MfaService } from './services/mfa.service';
import { SessionService } from './services/session.service';
import { LoginHistoryService } from './services/login-history.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { IpControlService } from './services/ip-control.service';
import { EmailVerificationService } from './services/email-verification.service';
import { InvitationService } from './services/invitation.service';
import { ApiTokenService } from './services/api-token.service';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'jasca-secret-key',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1d',
                },
            }),
            inject: [ConfigService],
        }),
        UsersModule,
    ],
    controllers: [AuthController, ApiTokenController],
    providers: [
        AuthService,
        JwtStrategy,
        ApiKeyStrategy,
        // Auth extension services
        MfaService,
        SessionService,
        LoginHistoryService,
        PasswordPolicyService,
        IpControlService,
        EmailVerificationService,
        InvitationService,
        ApiTokenService,
    ],
    exports: [
        AuthService,
        JwtModule,
        MfaService,
        SessionService,
        LoginHistoryService,
        PasswordPolicyService,
        IpControlService,
        EmailVerificationService,
        InvitationService,
        ApiTokenService,
    ],
})
export class AuthModule { }
