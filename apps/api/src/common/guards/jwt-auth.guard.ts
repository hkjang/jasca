import { Injectable, ExecutionContext, UnauthorizedException, Inject, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        @Optional() private readonly moduleRef?: ModuleRef,
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        // Check if it's an API token (jasca_...)
        if (authHeader && authHeader.startsWith('Bearer jasca_')) {
            const token = authHeader.substring(7); // Remove 'Bearer '
            
            try {
                // Dynamically import and use ApiTokenService to avoid circular dependencies
                const { ApiTokenService } = await import('../../modules/auth/services/api-token.service');
                
                // Try to get the service from module ref if available
                let apiTokenService: InstanceType<typeof ApiTokenService> | null = null;
                
                if (this.moduleRef) {
                    try {
                        apiTokenService = this.moduleRef.get(ApiTokenService, { strict: false });
                    } catch (e) {
                        // Service not available from moduleRef
                    }
                }
                
                if (!apiTokenService) {
                    // Fallback: create a new instance with PrismaService
                    const { PrismaService } = await import('../../prisma/prisma.service');
                    let prismaService: InstanceType<typeof PrismaService> | null = null;
                    
                    if (this.moduleRef) {
                        try {
                            prismaService = this.moduleRef.get(PrismaService, { strict: false });
                        } catch (e) {
                            // PrismaService not available
                        }
                    }
                    
                    if (!prismaService) {
                        throw new UnauthorizedException('Database service not available for API token validation');
                    }
                    
                    apiTokenService = new ApiTokenService(prismaService);
                }
                
                const apiToken = await apiTokenService.validateToken(token);
                
                // Set user info from API token for downstream use
                request.user = {
                    id: `api-token:${apiToken.id}`,
                    organizationId: apiToken.organizationId,
                    role: 'API_TOKEN',
                    permissions: apiToken.permissions,
                    isApiToken: true,
                    apiTokenId: apiToken.id,
                    apiTokenName: apiToken.name,
                };
                
                return true;
            } catch (error) {
                console.error('API Token validation error:', error);
                if (error instanceof UnauthorizedException) {
                    throw error;
                }
                throw new UnauthorizedException('Invalid or expired API token');
            }
        }

        // Otherwise, use default JWT authentication
        return super.canActivate(context) as Promise<boolean>;
    }
}
