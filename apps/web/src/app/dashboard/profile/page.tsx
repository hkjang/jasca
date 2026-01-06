'use client';

import { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Building2,
    Shield,
    Bell,
    Key,
    Save,
    Loader2,
    CheckCircle,
    Camera,
    AlertTriangle,
    RefreshCw,
    X,
    Eye,
    EyeOff,
    Copy,
    Check,
    Monitor,
    Calendar,
    Clock,
    Move,
    Minimize2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
    useProfile,
    useUpdateProfile,
    useNotificationSettings as useNotificationSettingsApi,
    useUpdateNotificationSettings,
} from '@/lib/api-hooks';
import { authApi } from '@/lib/auth-api';
import {
    usePreferencesStore,
    DateFormat,
    TimeFormat,
} from '@/stores/preferences-store';

// Password Change Modal Component
function PasswordChangeModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        if (newPassword.length < 8) {
            setError('비밀번호는 8자 이상이어야 합니다.');
            return;
        }

        setLoading(true);
        try {
            await authApi.changePassword(currentPassword, newPassword);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || '비밀번호 변경에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        비밀번호 변경
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {success ? (
                    <div className="flex flex-col items-center py-8">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">
                            비밀번호가 변경되었습니다
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                현재 비밀번호
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                새 비밀번호
                            </label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                새 비밀번호 확인
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                변경
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// MFA Management Modal Component
function MfaModal({
    isOpen,
    onClose,
    isMfaEnabled,
    onMfaChange,
}: {
    isOpen: boolean;
    onClose: () => void;
    isMfaEnabled: boolean;
    onMfaChange: () => void;
}) {
    const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'success' | 'disable'>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep('idle');
            setCode('');
            setError('');
        }
    }, [isOpen]);

    const handleSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await authApi.setupMfa();
            setQrCodeUrl(result.qrCodeUrl);
            setSecret(result.secret);
            setStep('setup');
        } catch (err: any) {
            setError(err.message || 'MFA 설정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleEnable = async () => {
        if (code.length !== 6) {
            setError('6자리 코드를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const result = await authApi.enableMfa(code);
            if (result.success) {
                if (result.backupCodes) {
                    setBackupCodes(result.backupCodes);
                }
                setStep('success');
                onMfaChange();
            } else {
                setError(result.message || '코드가 올바르지 않습니다.');
            }
        } catch (err: any) {
            setError(err.message || 'MFA 활성화에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (code.length !== 6) {
            setError('6자리 코드를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const result = await authApi.disableMfa(code);
            if (result.success) {
                onMfaChange();
                onClose();
            } else {
                setError(result.message || '코드가 올바르지 않습니다.');
            }
        } catch (err: any) {
            setError(err.message || 'MFA 비활성화에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        2단계 인증 (MFA) 관리
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {step === 'idle' && !isMfaEnabled && (
                    <div className="text-center py-4">
                        <Shield className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            2단계 인증을 활성화하면 로그인 시 추가 보안 코드가 필요합니다.
                        </p>
                        <button
                            onClick={handleSetup}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                            2단계 인증 설정하기
                        </button>
                    </div>
                )}

                {step === 'idle' && isMfaEnabled && (
                    <div className="text-center py-4">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <Shield className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <p className="text-green-600 font-medium mb-2">2단계 인증이 활성화되어 있습니다</p>
                        <p className="text-slate-500 text-sm mb-6">
                            비활성화하려면 인증 앱의 코드를 입력하세요.
                        </p>
                        <button
                            onClick={() => setStep('disable')}
                            className="w-full px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            2단계 인증 비활성화
                        </button>
                    </div>
                )}

                {step === 'setup' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Google Authenticator 또는 다른 TOTP 앱으로 아래 QR 코드를 스캔하세요.
                        </p>
                        
                        {qrCodeUrl && (
                            <div className="flex justify-center p-4 bg-white rounded-lg">
                                <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                            </div>
                        )}

                        <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">또는 수동으로 입력:</p>
                            <div className="flex items-center justify-center gap-2">
                                <code className="text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono">
                                    {secret}
                                </code>
                                <button
                                    onClick={copySecret}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('verify')}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            다음
                        </button>
                    </div>
                )}

                {step === 'verify' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            인증 앱에 표시된 6자리 코드를 입력하세요.
                        </p>
                        
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-full text-center text-2xl tracking-widest bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={6}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('setup')}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                이전
                            </button>
                            <button
                                onClick={handleEnable}
                                disabled={loading || code.length !== 6}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                활성화
                            </button>
                        </div>
                    </div>
                )}

                {step === 'disable' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            2단계 인증을 비활성화하려면 인증 앱의 코드를 입력하세요.
                        </p>
                        
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-full text-center text-2xl tracking-widest bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={6}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('idle')}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDisable}
                                disabled={loading || code.length !== 6}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                비활성화
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-4">
                        <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                            2단계 인증이 활성화되었습니다
                        </p>
                        
                        {backupCodes.length > 0 && (
                            <div className="mt-4 text-left">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    백업 코드를 안전한 곳에 보관하세요:
                                </p>
                                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                    {backupCodes.map((code, i) => (
                                        <code key={i} className="text-sm font-mono text-center">
                                            {code}
                                        </code>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            완료
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Display Preferences Card Component
function DisplayPreferencesCard() {
    const dateFormat = usePreferencesStore((state) => state.display.dateFormat);
    const timeFormat = usePreferencesStore((state) => state.display.timeFormat);
    const itemsPerPage = usePreferencesStore((state) => state.display.itemsPerPage);
    const reducedMotion = usePreferencesStore((state) => state.display.reducedMotion);
    const compactMode = usePreferencesStore((state) => state.display.compactMode);

    const setDateFormat = usePreferencesStore((state) => state.setDateFormat);
    const setTimeFormat = usePreferencesStore((state) => state.setTimeFormat);
    const setItemsPerPage = usePreferencesStore((state) => state.setItemsPerPage);
    const setReducedMotion = usePreferencesStore((state) => state.setReducedMotion);
    const setCompactMode = usePreferencesStore((state) => state.setCompactMode);

    const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-01-07' },
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '01/07/2026' },
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '07/01/2026' },
        { value: 'relative', label: '상대적', example: '2일 전' },
    ];

    const timeFormatOptions: { value: TimeFormat; label: string; example: string }[] = [
        { value: '24h', label: '24시간', example: '14:30' },
        { value: '12h', label: '12시간', example: '오후 2:30' },
    ];

    const itemsPerPageOptions = [10, 20, 30, 50, 100];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                화면 설정
            </h3>

            <div className="space-y-6">
                {/* Date Format */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        날짜 형식
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {dateFormatOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setDateFormat(option.value)}
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                    dateFormat === option.value
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <p className={`font-medium ${
                                    dateFormat === option.value
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-slate-900 dark:text-white'
                                }`}>
                                    {option.label}
                                </p>
                                <p className="text-xs text-slate-500">{option.example}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Format */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        시간 형식
                    </label>
                    <div className="flex gap-2">
                        {timeFormatOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setTimeFormat(option.value)}
                                className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                                    timeFormat === option.value
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <p className={`font-medium ${
                                    timeFormat === option.value
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-slate-900 dark:text-white'
                                }`}>
                                    {option.label}
                                </p>
                                <p className="text-xs text-slate-500">{option.example}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items Per Page */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        페이지 당 항목 수
                    </label>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {itemsPerPageOptions.map((count) => (
                            <option key={count} value={count}>
                                {count}개
                            </option>
                        ))}
                    </select>
                </div>

                {/* Accessibility Options */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                        접근성 옵션
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <Move className="h-4 w-4 text-slate-400" />
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">모션 줄이기</p>
                                    <p className="text-xs text-slate-500">애니메이션 효과를 줄입니다</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReducedMotion(!reducedMotion)}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    reducedMotion ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            >
                                <span
                                    className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                        reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <Minimize2 className="h-4 w-4 text-slate-400" />
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">컴팩트 모드</p>
                                    <p className="text-xs text-slate-500">더 많은 정보를 화면에 표시합니다</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCompactMode(!compactMode)}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    compactMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            >
                                <span
                                    className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                        compactMode ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user: authUser } = useAuthStore();
    const { data: profile, isLoading: profileLoading, error: profileError, refetch } = useProfile();
    const { data: notificationSettings, isLoading: notifLoading } = useNotificationSettingsApi();
    const updateProfileMutation = useUpdateProfile();
    const updateNotificationMutation = useUpdateNotificationSettings();

    const [saved, setSaved] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [mfaModalOpen, setMfaModalOpen] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        criticalOnly: false,
        weeklyDigest: false,
    });

    // Load profile data
    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
        }
    }, [profile]);

    // Load notification settings
    useEffect(() => {
        if (notificationSettings) {
            setNotifications({
                emailAlerts: notificationSettings.emailAlerts ?? true,
                criticalOnly: notificationSettings.criticalOnly ?? false,
                weeklyDigest: notificationSettings.weeklyDigest ?? false,
            });
        }
    }, [notificationSettings]);

    const handleSaveProfile = async () => {
        try {
            await updateProfileMutation.mutateAsync({ name });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to update profile:', err);
        }
    };

    const handleToggleNotification = async (key: keyof typeof notifications) => {
        const newValue = !notifications[key];
        setNotifications(prev => ({ ...prev, [key]: newValue }));
        try {
            await updateNotificationMutation.mutateAsync({ [key]: newValue });
        } catch (err) {
            // Revert on error
            setNotifications(prev => ({ ...prev, [key]: !newValue }));
            console.error('Failed to update notification settings:', err);
        }
    };

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">오류 발생</h3>
                <p className="text-red-600 dark:text-red-300 mb-4">프로필을 불러오는데 실패했습니다.</p>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">프로필 설정</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        계정 정보 및 알림 설정을 관리합니다
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">계정 정보</h3>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {name?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                            <Camera className="h-4 w-4" />
                        </button>
                    </div>
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">{name || 'Unknown'}</p>
                        <p className="text-sm text-slate-500">{profile?.email}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            역할: {profile?.role || authUser?.roles?.join(', ') || 'User'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            이름
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            이메일
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="email"
                                value={profile?.email || ''}
                                disabled
                                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-500 dark:text-slate-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            조직
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                value={profile?.organization?.name || '-'}
                                disabled
                                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-500 dark:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {updateProfileMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        프로필 저장
                    </button>
                </div>
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">보안</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-slate-400" />
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">비밀번호 변경</p>
                                <p className="text-sm text-slate-500">계정 비밀번호를 변경합니다</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setPasswordModalOpen(true)}
                            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            변경
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Shield className={`h-5 w-5 ${profile?.mfaEnabled ? 'text-green-500' : 'text-slate-400'}`} />
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">2단계 인증 (MFA)</p>
                                <p className={`text-sm ${profile?.mfaEnabled ? 'text-green-600' : 'text-slate-500'}`}>
                                    {profile?.mfaEnabled ? '활성화됨' : '비활성화됨'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setMfaModalOpen(true)}
                            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            관리
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    알림 설정
                    {notifLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                </h3>

                <div className="space-y-4">
                    {[
                        { key: 'emailAlerts' as const, label: '이메일 알림', desc: '중요 이벤트 발생 시 이메일로 알림 받기' },
                        { key: 'criticalOnly' as const, label: 'Critical 전용', desc: 'Critical 수준 취약점만 알림 받기' },
                        { key: 'weeklyDigest' as const, label: '주간 리포트', desc: '매주 월요일 요약 리포트 발송' },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                            <button
                                onClick={() => handleToggleNotification(item.key)}
                                disabled={updateNotificationMutation.isPending}
                                className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.key]
                                    ? 'bg-blue-600'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications[item.key] ? 'translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Display Preferences */}
            <DisplayPreferencesCard />

            {/* Save Status */}
            {saved && (
                <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
                    <CheckCircle className="h-5 w-5" />
                    저장되었습니다
                </div>
            )}

            {/* Modals */}
            <PasswordChangeModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
            />
            <MfaModal
                isOpen={mfaModalOpen}
                onClose={() => setMfaModalOpen(false)}
                isMfaEnabled={profile?.mfaEnabled ?? false}
                onMfaChange={() => refetch()}
            />
        </div>
    );
}
