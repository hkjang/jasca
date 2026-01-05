import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'jasca-secret-key',
        });
        this.logger.log('JwtStrategy initialized');
    }

    async validate(payload: JwtPayload) {
        this.logger.debug(`Validating JWT payload for user: ${payload.sub}`);
        
        try {
            const user = await this.authService.validateUser(payload.sub);

            if (!user) {
                this.logger.warn(`User not found: ${payload.sub}`);
                throw new UnauthorizedException('User not found');
            }

            if (!user.isActive) {
                this.logger.warn(`User is inactive: ${payload.sub}`);
                throw new UnauthorizedException('User is inactive');
            }

            this.logger.debug(`User validated successfully: ${user.email}`);

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                organizationId: user.organizationId,
                organization: user.organization,
                roles: user.roles,
            };
        } catch (error) {
            this.logger.error(`Error validating user ${payload.sub}: ${error.message}`, error.stack);
            throw error;
        }
    }
}
