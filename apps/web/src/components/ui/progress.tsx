'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
    keys: string[];
    description: string;
    category?: string;
}

const shortcuts: Shortcut[] = [
    { keys: ['Ctrl', 'K'], description: '글로벌 검색 열기', category: '네비게이션' },
    { keys: ['Ctrl', '/'], description: '키보드 단축키 보기', category: '도움말' },
    { keys: ['G', 'H'], description: '홈으로 이동', category: '네비게이션' },
    { keys: ['G', 'D'], description: '대시보드로 이동', category: '네비게이션' },
    { keys: ['G', 'V'], description: '취약점 목록으로 이동', category: '네비게이션' },
    { keys: ['G', 'R'], description: '리포트로 이동', category: '네비게이션' },
    { keys: ['Esc'], description: '모달/패널 닫기', category: '일반' },
    { keys: ['↑', '↓'], description: '목록에서 이동', category: '일반' },
    { keys: ['Enter'], description: '선택 확인', category: '일반' },
    { keys: ['Shift', '?'], description: '도움말 보기', category: '도움말' },
];

export function KeyboardShortcutsModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Group by category
    const grouped = shortcuts.reduce((acc, shortcut) => {
        const category = shortcut.category || '기타';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <Keyboard className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            키보드 단축키
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto p-6 space-y-6">
                    {Object.entries(grouped).map(([category, categoryShortcuts]) => (
                        <div key={category}>
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {categoryShortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-2"
                                    >
                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                            {shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, i) => (
                                                <span key={i}>
                                                    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono text-slate-600 dark:text-slate-300">
                                                        {key}
                                                    </kbd>
                                                    {i < shortcut.keys.length - 1 && (
                                                        <span className="mx-1 text-slate-400">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">Ctrl</kbd>
                        <span className="mx-1">+</span>
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">/</kbd>
                        <span className="ml-2">를 눌러 언제든지 이 창을 열 수 있습니다</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// Hook for global keyboard shortcuts
export function useKeyboardShortcuts() {
    const [showShortcuts, setShowShortcuts] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl + / to show shortcuts
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setShowShortcuts(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        showShortcuts,
        setShowShortcuts,
    };
}

// Progress bar component
export function ProgressBar({
    value,
    max = 100,
    size = 'md',
    color = 'blue',
    showLabel = false,
    animated = false,
}: {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'green' | 'red' | 'yellow';
    showLabel?: boolean;
    animated?: boolean;
}) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
    };

    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
    };

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">진행률</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
            <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
                <div
                    className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-500 ${animated ? 'animate-pulse' : ''}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

// Step progress indicator
export function StepProgress({
    steps,
    currentStep,
}: {
    steps: string[];
    currentStep: number;
}) {
    return (
        <div className="flex items-center w-full">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex items-center">
                        <div
                            className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                ${index < currentStep
                                    ? 'bg-green-500 text-white'
                                    : index === currentStep
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }
                            `}
                        >
                            {index < currentStep ? '✓' : index + 1}
                        </div>
                        <span
                            className={`
                                ml-2 text-sm
                                ${index <= currentStep
                                    ? 'text-slate-900 dark:text-white font-medium'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                            `}
                        >
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={`
                                flex-1 h-0.5 mx-4
                                ${index < currentStep
                                    ? 'bg-green-500'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }
                            `}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
