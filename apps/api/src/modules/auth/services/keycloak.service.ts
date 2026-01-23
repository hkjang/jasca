import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface KeycloakConfig {
    serverUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    syncEnabled?: boolean;
    autoCreateUsers?: boolean;
    autoUpdateUsers?: boolean;
    defaultRole?: string;
    groupMapping?: Record<string, string>;
}

export interface KeycloakUser {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    enabled: boolean;
    emailVerified: boolean;
    groups?: string[];
}

export interface SyncResult {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    syncedAt: string;
}

@Injectable()
export class KeycloakService {
    private readonly logger = new Logger(KeycloakService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Keycloak 연결 테스트
     */
    async testConnection(config: KeycloakConfig): Promise<boolean> {
        try {
            // Keycloak Admin Token 획득
            const token = await this.getAdminToken(config);
            return !!token;
        } catch (error: any) {
            this.logger.error(`Keycloak connection test failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Keycloak Admin API 토큰 획득
     */
    private async getAdminToken(config: KeycloakConfig): Promise<string> {
        const tokenUrl = `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get admin token: ${error}`);
        }

        const data = await response.json();
        return data.access_token;
    }

    /**
     * Keycloak에서 사용자 목록 조회
     */
    async getUsers(config: KeycloakConfig): Promise<KeycloakUser[]> {
        const token = await this.getAdminToken(config);
        const usersUrl = `${config.serverUrl}/admin/realms/${config.realm}/users`;

        const response = await fetch(usersUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get users: ${await response.text()}`);
        }

        const users = await response.json();

        // 각 사용자의 그룹 정보 조회
        const usersWithGroups = await Promise.all(
            users.map(async (user: any) => {
                const groups = await this.getUserGroups(config, token, user.id);
                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    enabled: user.enabled,
                    emailVerified: user.emailVerified,
                    groups,
                };
            })
        );

        return usersWithGroups;
    }

    /**
     * 특정 사용자의 그룹 조회
     */
    private async getUserGroups(config: KeycloakConfig, token: string, userId: string): Promise<string[]> {
        const groupsUrl = `${config.serverUrl}/admin/realms/${config.realm}/users/${userId}/groups`;

        try {
            const response = await fetch(groupsUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                return [];
            }

            const groups = await response.json();
            return groups.map((g: any) => g.name);
        } catch {
            return [];
        }
    }

    /**
     * Keycloak 사용자를 JASCA DB로 동기화
     */
    async syncUsers(config: KeycloakConfig): Promise<SyncResult> {
        const result: SyncResult = {
            success: false,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            syncedAt: new Date().toISOString(),
        };

        try {
            const keycloakUsers = await this.getUsers(config);
            this.logger.log(`Found ${keycloakUsers.length} users in Keycloak`);

            for (const kcUser of keycloakUsers) {
                try {
                    // 이메일이 없는 사용자는 스킵
                    if (!kcUser.email) {
                        result.skipped++;
                        continue;
                    }

                    // 비활성화된 사용자는 스킵
                    if (!kcUser.enabled) {
                        result.skipped++;
                        continue;
                    }

                    // 기존 사용자 조회
                    const existingUser = await this.prisma.user.findUnique({
                        where: { email: kcUser.email },
                        include: { roles: true },
                    });

                    if (existingUser) {
                        // 기존 사용자 업데이트
                        if (config.autoUpdateUsers !== false) {
                            const name = [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username;
                            await this.prisma.user.update({
                                where: { id: existingUser.id },
                                data: {
                                    name,
                                    emailVerifiedAt: kcUser.emailVerified ? new Date() : null,
                                },
                            });

                            // 그룹 매핑에 따른 역할 업데이트
                            if (config.groupMapping && kcUser.groups) {
                                await this.updateUserRoles(existingUser.id, kcUser.groups, config.groupMapping);
                            }

                            result.updated++;
                        } else {
                            result.skipped++;
                        }
                    } else {
                        // 새 사용자 생성
                        if (config.autoCreateUsers) {
                            const name = [kcUser.firstName, kcUser.lastName].filter(Boolean).join(' ') || kcUser.username;

                            // 랜덤 비밀번호 생성 (SSO 로그인만 사용하므로 직접 사용되지 않음)
                            const randomPassword = Math.random().toString(36).slice(-16);
                            const passwordHash = await bcrypt.hash(randomPassword, 10);

                            const newUser = await this.prisma.user.create({
                                data: {
                                    email: kcUser.email,
                                    passwordHash,
                                    name,
                                    emailVerifiedAt: kcUser.emailVerified ? new Date() : null,
                                    isActive: true,
                                },
                            });

                            // 기본 역할 할당
                            const defaultRole = config.defaultRole || 'VIEWER';
                            await this.prisma.userRole.create({
                                data: {
                                    userId: newUser.id,
                                    role: defaultRole as any,
                                    scope: 'ORGANIZATION',
                                },
                            });

                            // 그룹 매핑에 따른 역할 추가
                            if (config.groupMapping && kcUser.groups) {
                                await this.updateUserRoles(newUser.id, kcUser.groups, config.groupMapping);
                            }

                            result.created++;
                        } else {
                            result.skipped++;
                        }
                    }
                } catch (error: any) {
                    result.errors.push(`User ${kcUser.email}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
        } catch (error: any) {
            result.errors.push(error.message);
            this.logger.error(`Keycloak sync failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Keycloak 그룹 매핑에 따라 사용자 역할 업데이트
     */
    private async updateUserRoles(
        userId: string,
        groups: string[],
        groupMapping: Record<string, string>
    ): Promise<void> {
        for (const group of groups) {
            const mappedRole = groupMapping[group];
            if (mappedRole) {
                // 이미 역할이 있는지 확인
                const existingRole = await this.prisma.userRole.findFirst({
                    where: {
                        userId,
                        role: mappedRole as any,
                    },
                });

                if (!existingRole) {
                    await this.prisma.userRole.create({
                        data: {
                            userId,
                            role: mappedRole as any,
                            scope: 'ORGANIZATION',
                        },
                    });
                }
            }
        }
    }

    /**
     * OIDC 토큰 검증 및 사용자 정보 반환
     */
    async validateToken(config: KeycloakConfig, token: string): Promise<any> {
        const userInfoUrl = `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/userinfo`;

        const response = await fetch(userInfoUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        return response.json();
    }

    /**
     * OIDC Authorization URL 생성
     */
    getAuthorizationUrl(config: KeycloakConfig, redirectUri: string, state: string): string {
        this.logger.debug(`Building authorization URL - realm: ${config.realm}, clientId: ${config.clientId}`);
        
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state: state,
        });

        const authUrl = `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/auth?${params.toString()}`;
        this.logger.debug(`Authorization URL generated: ${config.serverUrl}/realms/${config.realm}/...`);
        
        return authUrl;
    }

    /**
     * Authorization Code를 Access Token으로 교환
     */
    async exchangeCodeForToken(
        config: KeycloakConfig,
        code: string,
        redirectUri: string,
    ): Promise<{ accessToken: string; refreshToken: string; idToken?: string }> {
        const tokenUrl = `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/token`;
        this.logger.debug(`Exchanging code for token - tokenUrl: ${tokenUrl}`);

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        try {
            const startTime = Date.now();
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            const duration = Date.now() - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Token exchange failed (${duration}ms) - status: ${response.status}, error: ${errorText}`);
                
                // Parse error for better message
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error === 'invalid_grant') {
                        throw new Error('Authorization code expired or already used. Please try again.');
                    }
                    throw new Error(`Token exchange failed: ${errorJson.error_description || errorJson.error}`);
                } catch (parseErr) {
                    if (parseErr instanceof Error && parseErr.message.includes('Token exchange failed')) {
                        throw parseErr;
                    }
                    throw new Error('Failed to exchange authorization code for token');
                }
            }

            const data = await response.json();
            this.logger.debug(`Token exchange successful (${duration}ms) - hasAccessToken: ${!!data.access_token}, hasRefreshToken: ${!!data.refresh_token}`);
            
            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                idToken: data.id_token,
            };
        } catch (err: any) {
            if (err.message && !err.message.includes('fetch')) {
                throw err;
            }
            this.logger.error(`Token exchange network error: ${err.message}`);
            throw new Error('Cannot connect to Keycloak server. Please check network connectivity.');
        }
    }

    /**
     * Keycloak 토큰에서 사용자 정보를 가져와 로컬 사용자 생성 또는 조회
     */
    async findOrCreateUserFromToken(
        config: KeycloakConfig,
        accessToken: string,
    ): Promise<{ userId: string; email: string; name: string; isNew: boolean }> {
        this.logger.debug('Fetching user info from Keycloak token...');
        
        // Keycloak에서 사용자 정보 조회
        let userInfo: any;
        try {
            userInfo = await this.validateToken(config, accessToken);
            this.logger.debug(`User info retrieved - email: ${userInfo.email}, emailVerified: ${userInfo.email_verified}`);
        } catch (err: any) {
            this.logger.error(`Failed to validate token: ${err.message}`);
            throw new Error('Failed to retrieve user information from Keycloak');
        }

        if (!userInfo.email) {
            this.logger.error('Email not found in Keycloak user info');
            throw new Error('Email not provided by Keycloak. Please ensure email scope is configured.');
        }

        // 기존 사용자 조회
        this.logger.debug(`Looking up existing user by email: ${userInfo.email}`);
        let user = await this.prisma.user.findUnique({
            where: { email: userInfo.email },
        });

        const name = userInfo.name || 
            [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') || 
            userInfo.preferred_username || 
            userInfo.email.split('@')[0];

        if (user) {
            this.logger.debug(`Existing user found - userId: ${user.id}, name: ${user.name}`);
            
            // 기존 사용자 업데이트
            if (config.autoUpdateUsers !== false) {
                this.logger.debug('Updating existing user info...');
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        name,
                        emailVerifiedAt: userInfo.email_verified ? new Date() : user.emailVerifiedAt,
                    },
                });
            }
            return { userId: user.id, email: user.email, name: user.name, isNew: false };
        }

        // 새 사용자 생성
        this.logger.debug(`No existing user found for ${userInfo.email}`);
        
        if (!config.autoCreateUsers) {
            this.logger.warn(`Auto-creation disabled, rejecting new user: ${userInfo.email}`);
            throw new Error('User does not exist and auto-creation is disabled. Please contact administrator.');
        }

        this.logger.log(`Creating new user from Keycloak: ${userInfo.email}`);

        // 랜덤 비밀번호 생성 (SSO 로그인만 사용하므로 직접 사용되지 않음)
        const randomPassword = Math.random().toString(36).slice(-16);
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        const newUser = await this.prisma.user.create({
            data: {
                email: userInfo.email,
                passwordHash,
                name,
                emailVerifiedAt: userInfo.email_verified ? new Date() : null,
                isActive: true,
            },
        });

        // 기본 역할 할당
        const defaultRole = config.defaultRole || 'VIEWER';
        this.logger.debug(`Assigning default role: ${defaultRole}`);
        
        await this.prisma.userRole.create({
            data: {
                userId: newUser.id,
                role: defaultRole as any,
                scope: 'ORGANIZATION',
            },
        });

        this.logger.log(`New user created successfully - userId: ${newUser.id}, email: ${newUser.email}, role: ${defaultRole}`);
        return { userId: newUser.id, email: newUser.email, name: newUser.name, isNew: true };
    }
}
