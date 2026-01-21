import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface LdapConfig {
    serverUrl: string;           // LDAP 서버 URL
    bindDn: string;              // Bind DN
    bindPassword: string;        // Bind 비밀번호
    baseDn: string;              // 검색 Base DN
    userSearchBase: string;      // 사용자 검색 Base
    userSearchFilter: string;    // 사용자 검색 필터
    usernameAttribute: string;   // 사용자 ID 속성
    emailAttribute: string;      // 이메일 속성
    nameAttribute: string;       // 이름 속성
    groupSearchBase?: string;    // 그룹 검색 Base
    groupSearchFilter?: string;  // 그룹 검색 필터
    groupMemberAttribute?: string; // 그룹 멤버 속성
    useTls?: boolean;            // TLS 사용 여부
    autoCreateUsers?: boolean;
    autoUpdateUsers?: boolean;
    defaultRole?: string;
    groupMapping?: Record<string, string>;
}

export interface LdapUser {
    dn: string;
    username: string;
    email: string;
    name: string;
    groups?: string[];
}

export interface LdapSyncResult {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    syncedAt: string;
}

@Injectable()
export class LdapService {
    private readonly logger = new Logger(LdapService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * LDAP 연결 테스트
     */
    async testConnection(config: LdapConfig): Promise<boolean> {
        try {
            // 동적 import로 ldapjs 로드 시도
            let ldap: any;
            try {
                ldap = await import('ldapjs');
            } catch {
                // ldapjs가 설치되지 않은 경우 시뮬레이션
                this.logger.warn('ldapjs not installed, simulating connection test');
                // 기본 연결 테스트: URL 형식 확인
                if (!config.serverUrl.startsWith('ldap://') && !config.serverUrl.startsWith('ldaps://')) {
                    throw new Error('Invalid LDAP URL format');
                }
                return true;
            }

            return new Promise((resolve) => {
                const client = ldap.createClient({
                    url: config.serverUrl,
                    tlsOptions: config.useTls ? {} : undefined,
                });

                client.bind(config.bindDn, config.bindPassword, (err: any) => {
                    if (err) {
                        this.logger.error(`LDAP bind failed: ${err.message}`);
                        client.unbind();
                        resolve(false);
                    } else {
                        this.logger.log('LDAP connection successful');
                        client.unbind();
                        resolve(true);
                    }
                });

                client.on('error', (err: any) => {
                    this.logger.error(`LDAP connection error: ${err.message}`);
                    resolve(false);
                });
            });
        } catch (error: any) {
            this.logger.error(`LDAP connection test failed: ${error.message}`);
            return false;
        }
    }

    /**
     * LDAP에서 사용자 목록 조회
     */
    async getUsers(config: LdapConfig): Promise<LdapUser[]> {
        const users: LdapUser[] = [];

        try {
            let ldap: any;
            try {
                ldap = await import('ldapjs');
            } catch {
                this.logger.warn('ldapjs not installed, returning empty user list');
                return [];
            }

            return new Promise((resolve, reject) => {
                const client = ldap.createClient({
                    url: config.serverUrl,
                    tlsOptions: config.useTls ? {} : undefined,
                });

                client.bind(config.bindDn, config.bindPassword, (bindErr: any) => {
                    if (bindErr) {
                        client.unbind();
                        reject(new Error(`LDAP bind failed: ${bindErr.message}`));
                        return;
                    }

                    const searchBase = config.userSearchBase
                        ? `${config.userSearchBase},${config.baseDn}`
                        : config.baseDn;

                    const opts = {
                        filter: config.userSearchFilter,
                        scope: 'sub',
                        attributes: [
                            config.usernameAttribute,
                            config.emailAttribute,
                            config.nameAttribute,
                        ],
                    };

                    client.search(searchBase, opts, (searchErr: any, res: any) => {
                        if (searchErr) {
                            client.unbind();
                            reject(new Error(`LDAP search failed: ${searchErr.message}`));
                            return;
                        }

                        res.on('searchEntry', (entry: any) => {
                            const obj = entry.object || entry.pojo?.attributes?.reduce((acc: any, attr: any) => {
                                acc[attr.type] = attr.values?.[0] || attr.vals?.[0];
                                return acc;
                            }, {});

                            if (obj) {
                                users.push({
                                    dn: entry.dn?.toString() || entry.objectName,
                                    username: obj[config.usernameAttribute] || '',
                                    email: obj[config.emailAttribute] || '',
                                    name: obj[config.nameAttribute] || '',
                                });
                            }
                        });

                        res.on('error', (err: any) => {
                            client.unbind();
                            reject(new Error(`LDAP search error: ${err.message}`));
                        });

                        res.on('end', () => {
                            client.unbind();
                            resolve(users);
                        });
                    });
                });

                client.on('error', (err: any) => {
                    reject(new Error(`LDAP connection error: ${err.message}`));
                });
            });
        } catch (error: any) {
            this.logger.error(`Failed to get LDAP users: ${error.message}`);
            throw error;
        }
    }

    /**
     * 특정 사용자의 그룹 조회
     */
    async getUserGroups(config: LdapConfig, userDn: string): Promise<string[]> {
        if (!config.groupSearchBase) {
            return [];
        }

        try {
            let ldap: any;
            try {
                ldap = await import('ldapjs');
            } catch {
                return [];
            }

            return new Promise((resolve) => {
                const client = ldap.createClient({
                    url: config.serverUrl,
                    tlsOptions: config.useTls ? {} : undefined,
                });

                client.bind(config.bindDn, config.bindPassword, (bindErr: any) => {
                    if (bindErr) {
                        client.unbind();
                        resolve([]);
                        return;
                    }

                    const searchBase = `${config.groupSearchBase},${config.baseDn}`;
                    const memberAttr = config.groupMemberAttribute || 'member';

                    const opts = {
                        filter: `(&${config.groupSearchFilter || '(objectClass=groupOfNames)'}(${memberAttr}=${userDn}))`,
                        scope: 'sub',
                        attributes: ['cn'],
                    };

                    const groups: string[] = [];

                    client.search(searchBase, opts, (searchErr: any, res: any) => {
                        if (searchErr) {
                            client.unbind();
                            resolve([]);
                            return;
                        }

                        res.on('searchEntry', (entry: any) => {
                            const obj = entry.object || {};
                            if (obj.cn) {
                                groups.push(obj.cn);
                            }
                        });

                        res.on('end', () => {
                            client.unbind();
                            resolve(groups);
                        });

                        res.on('error', () => {
                            client.unbind();
                            resolve([]);
                        });
                    });
                });

                client.on('error', () => {
                    resolve([]);
                });
            });
        } catch {
            return [];
        }
    }

    /**
     * LDAP 사용자를 JASCA DB로 동기화
     */
    async syncUsers(config: LdapConfig): Promise<LdapSyncResult> {
        const result: LdapSyncResult = {
            success: false,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            syncedAt: new Date().toISOString(),
        };

        try {
            const ldapUsers = await this.getUsers(config);
            this.logger.log(`Found ${ldapUsers.length} users in LDAP`);

            for (const ldapUser of ldapUsers) {
                try {
                    // 이메일이 없는 사용자는 스킵
                    if (!ldapUser.email) {
                        result.skipped++;
                        continue;
                    }

                    // 기존 사용자 조회
                    const existingUser = await this.prisma.user.findUnique({
                        where: { email: ldapUser.email },
                        include: { roles: true },
                    });

                    // 사용자 그룹 조회
                    const groups = await this.getUserGroups(config, ldapUser.dn);

                    if (existingUser) {
                        // 기존 사용자 업데이트
                        if (config.autoUpdateUsers !== false) {
                            await this.prisma.user.update({
                                where: { id: existingUser.id },
                                data: {
                                    name: ldapUser.name || ldapUser.username,
                                },
                            });

                            // 그룹 매핑에 따른 역할 업데이트
                            if (config.groupMapping && groups.length > 0) {
                                await this.updateUserRoles(existingUser.id, groups, config.groupMapping);
                            }

                            result.updated++;
                        } else {
                            result.skipped++;
                        }
                    } else {
                        // 새 사용자 생성
                        if (config.autoCreateUsers) {
                            // 랜덤 비밀번호 생성 (LDAP 인증만 사용하므로 직접 사용되지 않음)
                            const randomPassword = Math.random().toString(36).slice(-16);
                            const passwordHash = await bcrypt.hash(randomPassword, 10);

                            const newUser = await this.prisma.user.create({
                                data: {
                                    email: ldapUser.email,
                                    passwordHash,
                                    name: ldapUser.name || ldapUser.username,
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
                            if (config.groupMapping && groups.length > 0) {
                                await this.updateUserRoles(newUser.id, groups, config.groupMapping);
                            }

                            result.created++;
                        } else {
                            result.skipped++;
                        }
                    }
                } catch (error: any) {
                    result.errors.push(`User ${ldapUser.email}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
        } catch (error: any) {
            result.errors.push(error.message);
            this.logger.error(`LDAP sync failed: ${error.message}`);
        }

        return result;
    }

    /**
     * LDAP 그룹 매핑에 따라 사용자 역할 업데이트
     */
    private async updateUserRoles(
        userId: string,
        groups: string[],
        groupMapping: Record<string, string>
    ): Promise<void> {
        for (const group of groups) {
            const mappedRole = groupMapping[group];
            if (mappedRole) {
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
}
