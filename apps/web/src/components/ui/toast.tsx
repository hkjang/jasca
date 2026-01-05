'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

// Simple in-memory store
let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

const notify = () => {
    listeners.forEach(listener => listener(toasts));
};

export const toast = {
    show: (toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString();
        toasts = [...toasts, { ...toast, id }];
        notify();
        
        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                toasts = toasts.filter(t => t.id !== id);
                notify();
            }, duration);
        }
    },
    success: (title: string, message?: string) => {
        toast.show({ type: 'success', title, message });
    },
    error: (title: string, message?: string) => {
        toast.show({ type: 'error', title, message });
    },
    warning: (title: string, message?: string) => {
        toast.show({ type: 'warning', title, message });
    },
    info: (title: string, message?: string) => {
        toast.show({ type: 'info', title, message });
    },
    remove: (id: string) => {
        toasts = toasts.filter(t => t.id !== id);
        notify();
    },
};

function getToastStyles(type: ToastType) {
    switch (type) {
        case 'success':
            return {
                bg: 'bg-green-50 dark:bg-green-900/20',
                border: 'border-green-200 dark:border-green-800',
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            };
        case 'error':
            return {
                bg: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-800',
                icon: <XCircle className="h-5 w-5 text-red-500" />,
            };
        case 'warning':
            return {
                bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                border: 'border-yellow-200 dark:border-yellow-800',
                icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            };
        case 'info':
            return {
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                border: 'border-blue-200 dark:border-blue-800',
                icon: <Info className="h-5 w-5 text-blue-500" />,
            };
    }
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
    const styles = getToastStyles(t.type);
    
    return (
        <div
            className={`
                flex items-start gap-3 p-4 rounded-xl border shadow-lg
                ${styles.bg} ${styles.border}
                animate-in slide-in-from-right duration-300
            `}
        >
            <div className="flex-shrink-0">{styles.icon}</div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{t.title}</p>
                {t.message && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {t.message}
                    </p>
                )}
            </div>
            <button
                onClick={onRemove}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export function ToastContainer() {
    const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const listener = (newToasts: Toast[]) => {
            setCurrentToasts([...newToasts]);
        };
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, []);

    if (currentToasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3 max-w-md">
            {currentToasts.map(t => (
                <ToastItem
                    key={t.id}
                    toast={t}
                    onRemove={() => toast.remove(t.id)}
                />
            ))}
        </div>
    );
}

// Hook for using toast
export function useToast() {
    return {
        success: toast.success,
        error: toast.error,
        warning: toast.warning,
        info: toast.info,
        show: toast.show,
    };
}

// ToastProvider wrapper - includes ToastContainer
export function ToastProvider({ children }: { children: ReactNode }) {
    return (
        <>
            {children}
            <ToastContainer />
        </>
    );
}

