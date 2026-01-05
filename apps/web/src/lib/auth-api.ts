import { useAuthStore } from '@/stores/auth-store';

const API_BASE = '/api';

// ============ Configuration ============
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

// ============ Types ============
interface LoginRequest {
    email: string;
    password: string;
}

interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    organizationId?: string;
    invitationCode?: string;
}

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    requiresMfa?: boolean;
    mfaToken?: string;
    requiresEmailVerification?: boolean;
}

interface MfaVerifyRequest {
    mfaToken: string;
    code: string;
}

// ============ Error Class ============
export class AuthApiError extends Error {
    constructor(
        message: string,
        public status: number = 0,
        public isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'AuthApiError';
    }
}

// ============ Helper Functions ============
function getRetryDelay(attempt: number): number {
    const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), 5000);
    return delay + Math.random() * 500;
}

async function safeParseJson(response: Response): Promise<any> {
    const text = await response.text();
    if (!text || text.trim() === '') {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch {
        console.warn('[Auth API] Failed to parse response as JSON');
        return null;
    }
}

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new AuthApiError('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.', 0, true);
        }
        throw error;
    }
}

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
): Promise<Response> {
    try {
        const response = await fetchWithTimeout(url, options);
        
        // 5xx 에러는 재시도
        if ([500, 502, 503, 504].includes(response.status) && retryCount < MAX_RETRIES) {
            const delay = getRetryDelay(retryCount);
            console.log(`[Auth API] ${response.status} error, retrying in ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }
        
        return response;
    } catch (error: any) {
        // 네트워크 에러 재시도
        if ((error instanceof TypeError || error instanceof AuthApiError) && retryCount < MAX_RETRIES) {
            const delay = getRetryDelay(retryCount);
            console.log(`[Auth API] Network error, retrying in ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }
        throw error;
    }
}

// ============ Auth API Class ============
class AuthApi {
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        const token = useAuthStore.getState().accessToken;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.',
                    response.status,
                    response.status >= 500
                );
            }

            const result = await safeParseJson(response);
            if (!result) {
                throw new AuthApiError('서버 응답을 처리할 수 없습니다.', 500, true);
            }
            return result;
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.', 0, true);
            }
            throw new AuthApiError(error.message || '로그인 중 오류가 발생했습니다.', 0, false);
        }
    }

    async register(data: RegisterRequest): Promise<AuthResponse> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || '회원가입에 실패했습니다.',
                    response.status,
                    response.status >= 500
                );
            }

            const result = await safeParseJson(response);
            if (!result) {
                throw new AuthApiError('서버 응답을 처리할 수 없습니다.', 500, true);
            }
            return result;
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.', 0, true);
            }
            throw new AuthApiError(error.message || '회원가입 중 오류가 발생했습니다.', 0, false);
        }
    }

    async verifyMfa(data: MfaVerifyRequest): Promise<AuthResponse> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/mfa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || 'MFA 인증에 실패했습니다. 코드를 확인해주세요.',
                    response.status,
                    response.status >= 500
                );
            }

            const result = await safeParseJson(response);
            if (!result) {
                throw new AuthApiError('서버 응답을 처리할 수 없습니다.', 500, true);
            }
            return result;
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.', 0, true);
            }
            throw new AuthApiError(error.message || 'MFA 인증 중 오류가 발생했습니다.', 0, false);
        }
    }

    async refresh(refreshToken: string): Promise<AuthResponse> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                throw new AuthApiError('토큰 갱신에 실패했습니다.', response.status, false);
            }

            const result = await safeParseJson(response);
            if (!result) {
                throw new AuthApiError('서버 응답을 처리할 수 없습니다.', 500, true);
            }
            return result;
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            throw new AuthApiError('토큰 갱신 중 오류가 발생했습니다.', 0, false);
        }
    }

    async logout(refreshToken: string): Promise<void> {
        try {
            await fetchWithTimeout(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ refreshToken }),
            }, 10000); // 로그아웃은 짧은 타임아웃
        } catch {
            // 로그아웃 실패는 무시 (클라이언트에서 토큰만 삭제하면 됨)
            console.warn('[Auth API] Logout request failed, but clearing local state');
        }
    }

    async getProfile(): Promise<any> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/users/me`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new AuthApiError('프로필 정보를 가져오는데 실패했습니다.', response.status, response.status >= 500);
            }

            return await safeParseJson(response);
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('프로필 정보를 가져오는 중 오류가 발생했습니다.', 0, false);
        }
    }

    async getSessions(): Promise<any[]> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/sessions`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new AuthApiError('세션 목록을 가져오는데 실패했습니다.', response.status, response.status >= 500);
            }

            return await safeParseJson(response) || [];
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('세션 목록을 가져오는 중 오류가 발생했습니다.', 0, false);
        }
    }

    async revokeSession(sessionId: string): Promise<void> {
        try {
            await fetchWithRetry(`${API_BASE}/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            throw new AuthApiError('세션 취소에 실패했습니다.', 0, false);
        }
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || '비밀번호 변경에 실패했습니다.',
                    response.status,
                    response.status >= 500
                );
            }
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('비밀번호 변경 중 오류가 발생했습니다.', 0, false);
        }
    }

    async getLoginHistory(limit = 20, offset = 0): Promise<any[]> {
        try {
            const response = await fetchWithRetry(
                `${API_BASE}/auth/login-history?limit=${limit}&offset=${offset}`,
                {
                    method: 'GET',
                    headers: this.getHeaders(),
                }
            );

            if (!response.ok) {
                throw new AuthApiError('로그인 기록을 가져오는데 실패했습니다.', response.status, response.status >= 500);
            }

            return await safeParseJson(response) || [];
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('로그인 기록을 가져오는 중 오류가 발생했습니다.', 0, false);
        }
    }

    async updateProfile(data: { name?: string }): Promise<any> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/users/me`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || '프로필 업데이트에 실패했습니다.',
                    response.status,
                    response.status >= 500
                );
            }

            return await safeParseJson(response);
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('프로필 업데이트 중 오류가 발생했습니다.', 0, false);
        }
    }

    async updateNotificationSettings(settings: {
        emailAlerts: boolean;
        criticalOnly: boolean;
        weeklyDigest: boolean;
    }): Promise<any> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/users/me/notification-settings`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || '알림 설정 업데이트에 실패했습니다.',
                    response.status,
                    response.status >= 500
                );
            }

            return await safeParseJson(response);
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('알림 설정 업데이트 중 오류가 발생했습니다.', 0, false);
        }
    }

    async getNotificationSettings(): Promise<{
        emailAlerts: boolean;
        criticalOnly: boolean;
        weeklyDigest: boolean;
    }> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/users/me/notification-settings`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                // 설정이 없으면 기본값 반환
                return {
                    emailAlerts: true,
                    criticalOnly: false,
                    weeklyDigest: true,
                };
            }

            const result = await safeParseJson(response);
            return result || {
                emailAlerts: true,
                criticalOnly: false,
                weeklyDigest: true,
            };
        } catch {
            // 에러 시 기본값 반환
            return {
                emailAlerts: true,
                criticalOnly: false,
                weeklyDigest: true,
            };
        }
    }

    // ==================== MFA ====================

    async getMfaStatus(): Promise<{ enabled: boolean }> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/mfa/status`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new AuthApiError('MFA 상태 조회에 실패했습니다.', response.status, response.status >= 500);
            }

            return await safeParseJson(response) || { enabled: false };
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('MFA 상태 조회 중 오류가 발생했습니다.', 0, false);
        }
    }

    async setupMfa(): Promise<{ secret: string; qrCodeUrl: string }> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/mfa/setup`, {
                method: 'POST',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || 'MFA 설정에 실패했습니다.',
                    response.status,
                    response.status >= 500
                );
            }

            const result = await safeParseJson(response);
            if (!result) {
                throw new AuthApiError('서버 응답을 처리할 수 없습니다.', 500, true);
            }
            return result;
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('MFA 설정 중 오류가 발생했습니다.', 0, false);
        }
    }

    async enableMfa(code: string): Promise<{ success: boolean; message: string; backupCodes?: string[] }> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/mfa/enable`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || 'MFA 활성화에 실패했습니다. 코드를 확인해주세요.',
                    response.status,
                    response.status >= 500
                );
            }

            return await safeParseJson(response) || { success: true, message: 'MFA 활성화 완료' };
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('MFA 활성화 중 오류가 발생했습니다.', 0, false);
        }
    }

    async disableMfa(code: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/mfa/disable`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || 'MFA 비활성화에 실패했습니다. 코드를 확인해주세요.',
                    response.status,
                    response.status >= 500
                );
            }

            return await safeParseJson(response) || { success: true, message: 'MFA 비활성화 완료' };
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('MFA 비활성화 중 오류가 발생했습니다.', 0, false);
        }
    }

    async regenerateBackupCodes(code: string): Promise<{ success: boolean; backupCodes: string[] }> {
        try {
            const response = await fetchWithRetry(`${API_BASE}/auth/mfa/backup-codes`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const error = await safeParseJson(response);
                throw new AuthApiError(
                    error?.message || '백업 코드 재생성에 실패했습니다.',
                    response.status,
                    response.status >= 500
                );
            }

            const result = await safeParseJson(response);
            if (!result) {
                throw new AuthApiError('서버 응답을 처리할 수 없습니다.', 500, true);
            }
            return result;
        } catch (error: any) {
            if (error instanceof AuthApiError) throw error;
            if (error instanceof TypeError) {
                throw new AuthApiError('서버에 연결할 수 없습니다.', 0, true);
            }
            throw new AuthApiError('백업 코드 재생성 중 오류가 발생했습니다.', 0, false);
        }
    }
}

export const authApi = new AuthApi();


