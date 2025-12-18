import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface CreateApiTokenDto {
    name: string;
    permissions: string[];
    expiresIn?: number; // days, null = never expires
}

export interface ApiTokenResponse {
    id: string;
    name: string;
    tokenPrefix: string;
    permissions: string[];
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
}

@Injectable()
export class ApiTokenService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate a new API token for an organization
     * Returns the full token only once - it's not stored
     */
    async createToken(
        organizationId: string,
        dto: CreateApiTokenDto,
    ): Promise<{ token: string; tokenInfo: ApiTokenResponse }> {
        // Generate a secure random token
        const tokenValue = this.generateToken();
        const tokenPrefix = 'jasca_' + tokenValue.substring(0, 4);
        const tokenHash = this.hashToken(tokenValue);

        // Calculate expiration
        let expiresAt: Date | null = null;
        if (dto.expiresIn && dto.expiresIn > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + dto.expiresIn);
        }

        const apiToken = await this.prisma.apiToken.create({
            data: {
                name: dto.name,
                tokenHash,
                tokenPrefix,
                organizationId,
                permissions: dto.permissions,
                expiresAt,
            },
        });

        return {
            token: `jasca_${tokenValue}`,
            tokenInfo: {
                id: apiToken.id,
                name: apiToken.name,
                tokenPrefix: apiToken.tokenPrefix,
                permissions: apiToken.permissions,
                expiresAt: apiToken.expiresAt,
                lastUsedAt: apiToken.lastUsedAt,
                createdAt: apiToken.createdAt,
            },
        };
    }

    /**
     * List all tokens for an organization (without the actual token values)
     */
    async listTokens(organizationId: string): Promise<ApiTokenResponse[]> {
        const tokens = await this.prisma.apiToken.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });

        return tokens.map((token) => ({
            id: token.id,
            name: token.name,
            tokenPrefix: token.tokenPrefix,
            permissions: token.permissions,
            expiresAt: token.expiresAt,
            lastUsedAt: token.lastUsedAt,
            createdAt: token.createdAt,
        }));
    }

    /**
     * Get a specific token by ID
     */
    async getToken(organizationId: string, tokenId: string): Promise<ApiTokenResponse> {
        const token = await this.prisma.apiToken.findFirst({
            where: {
                id: tokenId,
                organizationId,
            },
        });

        if (!token) {
            throw new NotFoundException('API token not found');
        }

        return {
            id: token.id,
            name: token.name,
            tokenPrefix: token.tokenPrefix,
            permissions: token.permissions,
            expiresAt: token.expiresAt,
            lastUsedAt: token.lastUsedAt,
            createdAt: token.createdAt,
        };
    }

    /**
     * Delete an API token
     */
    async deleteToken(organizationId: string, tokenId: string): Promise<void> {
        const token = await this.prisma.apiToken.findFirst({
            where: {
                id: tokenId,
                organizationId,
            },
        });

        if (!token) {
            throw new NotFoundException('API token not found');
        }

        await this.prisma.apiToken.delete({
            where: { id: tokenId },
        });
    }

    /**
     * Validate an API token and return user info
     */
    async validateToken(tokenValue: string): Promise<any> {
        // Remove prefix if present
        const cleanToken = tokenValue.startsWith('jasca_')
            ? tokenValue.substring(6)
            : tokenValue;

        const tokenHash = this.hashToken(cleanToken);

        const apiToken = await this.prisma.apiToken.findUnique({
            where: { tokenHash },
            include: { organization: true },
        });

        if (!apiToken) {
            throw new UnauthorizedException('Invalid API token');
        }

        if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
            throw new UnauthorizedException('API token has expired');
        }

        // Update last used timestamp
        await this.prisma.apiToken.update({
            where: { id: apiToken.id },
            data: { lastUsedAt: new Date() },
        });

        return apiToken;
    }

    private generateToken(): string {
        return crypto.randomBytes(24).toString('base64url');
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
