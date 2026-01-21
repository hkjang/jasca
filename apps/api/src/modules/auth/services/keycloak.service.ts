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
}
