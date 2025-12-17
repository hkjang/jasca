import { useAuthStore } from '@/stores/auth-store';

const API_BASE = '/api';

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
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        return response.json();
    }

    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return response.json();
    }

    async verifyMfa(data: MfaVerifyRequest): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/mfa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'MFA verification failed');
        }

        return response.json();
    }

    async refresh(refreshToken: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        return response.json();
    }

    async logout(refreshToken: string): Promise<void> {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ refreshToken }),
        });
    }

    async getProfile(): Promise<any> {
        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get profile');
        }

        return response.json();
    }

    async getSessions(): Promise<any[]> {
        const response = await fetch(`${API_BASE}/auth/sessions`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get sessions');
        }

        return response.json();
    }

    async revokeSession(sessionId: string): Promise<void> {
        await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password');
        }
    }

    async getLoginHistory(limit = 20, offset = 0): Promise<any[]> {
        const response = await fetch(
            `${API_BASE}/auth/login-history?limit=${limit}&offset=${offset}`,
            {
                method: 'GET',
                headers: this.getHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get login history');
        }

        return response.json();
    }
}

export const authApi = new AuthApi();
