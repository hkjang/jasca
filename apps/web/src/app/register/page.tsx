'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, User, Loader2, CheckCircle, Building2, Key, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/auth-api';

// SSO Provider icons (simplified)
const SsoProviders = [
    { id: 'google', name: 'Google', icon: '🔵', color: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
    { id: 'github', name: 'GitHub', icon: '⚫', color: 'hover:bg-slate-100 dark:hover:bg-slate-700' },
    { id: 'microsoft', name: 'Microsoft', icon: '🟦', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
];

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser, setTokens, setError, setLoading, isLoading, error } = useAuthStore();

    const [step, setStep] = useState(1); // 1: Org/Invite, 2: Account Info
    const [invitationCode, setInvitationCode] = useState(searchParams.get('code') || '');
    const [selectedOrg, setSelectedOrg] = useState('');
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    const [showEmailVerification, setShowEmailVerification] = useState(false);

    // Fetch organizations on mount
    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const response = await fetch('/api/organizations/public');
                if (response.ok) {
                    const data = await response.json();
                    setOrganizations(data);
                }
            } catch {
                // Use mock data if API not available
                setOrganizations([
                    { id: '1', name: 'ACME Corp' },
                    { id: '2', name: 'TechStart Inc' },
                    { id: '3', name: 'SecureNet' },
                ]);
            }
        };
        fetchOrgs();
    }, []);

    // Auto-validate invitation code
    useEffect(() => {
        if (invitationCode && invitationCode.length >= 8) {
            // Could validate code here
        }
    }, [invitationCode]);

    const validatePassword = (pwd: string) => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push('8자 이상이어야 합니다');
        if (!/[A-Z]/.test(pwd)) errors.push('대문자를 포함해야 합니다');
        if (!/[a-z]/.test(pwd)) errors.push('소문자를 포함해야 합니다');
        if (!/[0-9]/.test(pwd)) errors.push('숫자를 포함해야 합니다');
        setPasswordErrors(errors);
        return errors.length === 0;
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pwd = e.target.value;
        setPassword(pwd);
        if (pwd) validatePassword(pwd);
    };

    const handleNextStep = () => {
        if (!invitationCode && !selectedOrg) {
            setError('조직을 선택하거나 초대 코드를 입력해주세요.');
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleSsoLogin = (providerId: string) => {
        // Redirect to SSO endpoint
        window.location.href = `/api/auth/sso/${providerId}?redirect=/dashboard`;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validatePassword(password)) {
            return;
        }

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다');
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.register({
                email,
                password,
                name,
                organizationId: selectedOrg || undefined,
                invitationCode: invitationCode || undefined,
            });

            // Check if email verification is required
            if (response.requiresEmailVerification) {
                setShowEmailVerification(true);
                setLoading(false);
                return;
            }

            setTokens(response.accessToken, response.refreshToken);

            const payload = JSON.parse(atob(response.accessToken.split('.')[1]));
            setUser({
                id: payload.sub,
                email: payload.email,
                name: name,
                organizationId: payload.organizationId,
                roles: payload.roles || [],
            });

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // Email verification sent screen
    if (showEmailVerification) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="h-8 w-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">이메일 인증 필요</h2>
                        <p className="text-slate-400 mb-6">
                            <span className="text-blue-400">{email}</span>로 인증 메일을 발송했습니다.
                            <br />이메일의 링크를 클릭하여 가입을 완료해주세요.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full px-4 py-3 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                인증 메일 재발송
                            </button>
                            <Link
                                href="/login"
                                className="block w-full px-4 py-3 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                로그인 페이지로 이동
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <Shield className="h-12 w-12 text-blue-400" />
                        <span className="text-3xl font-bold text-white">JASCA</span>
                    </div>
                    <p className="text-slate-400">취약점 관리 시스템</p>
                </div>

                {/* Register Form */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            1
                        </div>
                        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            2
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                        {step === 1 ? '조직 선택' : '계정 정보'}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <div className="space-y-5">
                            {/* SSO Options */}
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 text-center">SSO로 빠르게 시작하기</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {SsoProviders.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => handleSsoLogin(provider.id)}
                                            className={`flex flex-col items-center gap-1 p-3 border border-slate-600 rounded-lg transition-colors ${provider.color}`}
                                        >
                                            <span className="text-xl">{provider.icon}</span>
                                            <span className="text-xs text-slate-400">{provider.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-slate-800/50 text-slate-500">또는</span>
                                </div>
                            </div>

                            {/* Organization Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    조직 선택
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <select
                                        value={selectedOrg}
                                        onChange={(e) => setSelectedOrg(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                    >
                                        <option value="">조직을 선택하세요</option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-slate-800/50 text-slate-500">또는 초대 코드 입력</span>
                                </div>
                            </div>

                            {/* Invitation Code */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    초대 코드
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type="text"
                                        value={invitationCode}
                                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest"
                                        placeholder="XXXX-XXXX"
                                        maxLength={9}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    관리자로부터 받은 초대 코드를 입력하세요
                                </p>
                            </div>

                            <button
                                onClick={handleNextStep}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                다음
                                <ArrowRight className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 mb-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                이전 단계
                            </button>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    이름
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="홍길동"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    이메일
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="name@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    비밀번호
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                {password && (
                                    <div className="mt-2 space-y-1">
                                        {['8자 이상', '대문자 포함', '소문자 포함', '숫자 포함'].map((rule, idx) => {
                                            const checks = [
                                                password.length >= 8,
                                                /[A-Z]/.test(password),
                                                /[a-z]/.test(password),
                                                /[0-9]/.test(password),
                                            ];
                                            return (
                                                <div key={idx} className={`flex items-center gap-2 text-xs ${checks[idx] ? 'text-green-400' : 'text-slate-500'}`}>
                                                    <CheckCircle className="h-3 w-3" />
                                                    {rule}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    비밀번호 확인
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full bg-slate-900/50 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${confirmPassword && password !== confirmPassword
                                            ? 'border-red-500'
                                            : 'border-slate-600'
                                            }`}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="mt-1 text-xs text-red-400">비밀번호가 일치하지 않습니다</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || passwordErrors.length > 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        가입 중...
                                    </>
                                ) : (
                                    '회원가입'
                                )}
                            </button>
                        </form>
                    )}

                    <p className="mt-6 text-center text-slate-400 text-sm">
                        이미 계정이 있으신가요?{' '}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300">
                            로그인
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
