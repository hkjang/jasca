'use client';

import * as React from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { getStatusStyle } from '@/lib/design-tokens';

// ============================================
// Status Types
// ============================================
const statusOptions = [
    { value: 'OPEN', label: '미해결' },
    { value: 'ASSIGNED', label: '할당됨' },
    { value: 'IN_PROGRESS', label: '진행 중' },
    { value: 'FIX_SUBMITTED', label: '수정 제출' },
    { value: 'VERIFYING', label: '검증 중' },
    { value: 'FIXED', label: '해결됨' },
    { value: 'CLOSED', label: '종료' },
    { value: 'IGNORED', label: '무시' },
    { value: 'FALSE_POSITIVE', label: '오탐' },
] as const;

export type VulnStatus = typeof statusOptions[number]['value'];

// ============================================
// Status Dropdown Component
// ============================================
export interface StatusDropdownProps {
    value: VulnStatus;
    onChange: (status: VulnStatus) => void | Promise<void>;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export function StatusDropdown({
    value,
    onChange,
    disabled = false,
    size = 'md',
    className,
}: StatusDropdownProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const currentStatus = statusOptions.find((s) => s.value === value) || statusOptions[0];
    const style = getStatusStyle(value);

    // Close on outside click
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape
    React.useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSelect = async (status: VulnStatus) => {
        if (status === value) {
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            await onChange(status);
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    const sizeClasses = size === 'sm'
        ? 'text-xs px-2 py-1 min-w-[100px]'
        : 'text-sm px-3 py-1.5 min-w-[120px]';

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className || ''}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled || isLoading}
                className={`flex items-center justify-between gap-2 rounded-lg border transition-colors ${sizeClasses} ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    } ${style.bg} ${style.text} ${style.border}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    <span className="font-medium">{currentStatus.label}</span>
                </div>
                {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 w-full min-w-[150px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 max-h-[300px] overflow-auto"
                    role="listbox"
                >
                    {statusOptions.map((option) => {
                        const optionStyle = getStatusStyle(option.value);
                        const isSelected = option.value === value;

                        return (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${isSelected
                                        ? 'bg-slate-100 dark:bg-slate-700'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                role="option"
                                aria-selected={isSelected}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${optionStyle.dot}`} />
                                    <span className="text-slate-900 dark:text-white">{option.label}</span>
                                </div>
                                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================
// Inline Status Change (테이블용)
// ============================================
export interface InlineStatusProps {
    value: VulnStatus;
    onUpdate: (status: VulnStatus) => Promise<void>;
    disabled?: boolean;
}

export function InlineStatus({ value, onUpdate, disabled = false }: InlineStatusProps) {
    return (
        <StatusDropdown
            value={value}
            onChange={onUpdate}
            disabled={disabled}
            size="sm"
        />
    );
}

// ============================================
// Status Badge (읽기 전용)
// ============================================
export interface StatusDisplayProps {
    status: VulnStatus;
    size?: 'sm' | 'md' | 'lg';
}

export function StatusDisplay({ status, size = 'md' }: StatusDisplayProps) {
    const statusInfo = statusOptions.find((s) => s.value === status);
    const style = getStatusStyle(status);

    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses[size]}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {statusInfo?.label || status}
        </span>
    );
}

// ============================================
// Workflow-based Status Dropdown (워크플로우 규칙 기반)
// ============================================
export interface WorkflowStatusDropdownProps {
    vulnerabilityId: string;
    currentStatus: VulnStatus;
    onUpdate: (status: VulnStatus) => Promise<void>;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export function WorkflowStatusDropdown({
    vulnerabilityId,
    currentStatus,
    onUpdate,
    disabled = false,
    size = 'md',
    className,
}: WorkflowStatusDropdownProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [transitions, setTransitions] = React.useState<{ status: string; name: string }[]>([]);
    const [loadingTransitions, setLoadingTransitions] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const currentStatusInfo = statusOptions.find((s) => s.value === currentStatus) || statusOptions[0];
    const style = getStatusStyle(currentStatus);

    // Fetch available transitions when dropdown opens
    React.useEffect(() => {
        if (isOpen && vulnerabilityId) {
            setLoadingTransitions(true);
            fetch(`/api/vulnerabilities/${vulnerabilityId}/available-transitions`, {
                headers: {
                    'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`,
                },
            })
                .then(res => res.json())
                .then(data => {
                    setTransitions(data || []);
                })
                .catch(() => {
                    // Fallback to all status options if API fails
                    setTransitions(statusOptions.map(s => ({ status: s.value, name: s.label })));
                })
                .finally(() => setLoadingTransitions(false));
        }
    }, [isOpen, vulnerabilityId]);

    // Close on outside click
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape
    React.useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSelect = async (status: VulnStatus) => {
        if (status === currentStatus) {
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            await onUpdate(status);
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    const sizeClasses = size === 'sm'
        ? 'text-xs px-2 py-1 min-w-[100px]'
        : 'text-sm px-3 py-1.5 min-w-[120px]';

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className || ''}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled || isLoading}
                className={`flex items-center justify-between gap-2 rounded-lg border transition-colors ${sizeClasses} ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    } ${style.bg} ${style.text} ${style.border}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    <span className="font-medium">{currentStatusInfo.label}</span>
                </div>
                {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 w-full min-w-[150px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 max-h-[300px] overflow-auto"
                    role="listbox"
                >
                    {loadingTransitions ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        </div>
                    ) : transitions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center">
                            가능한 상태 전이가 없습니다
                        </div>
                    ) : (
                        transitions.map((transition) => {
                            const optionStyle = getStatusStyle(transition.status);
                            
                            return (
                                <button
                                    key={transition.status}
                                    onClick={() => handleSelect(transition.status as VulnStatus)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                    role="option"
                                    aria-selected={false}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${optionStyle.dot}`} />
                                        <span className="text-slate-900 dark:text-white">{transition.name}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

export { statusOptions };

