'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============================================
// Toast Types
// ============================================
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number;
}

// ============================================
// Toast Context
// ============================================
interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Helper functions for easier toast creation
export function useToastHelpers() {
    const { addToast } = useToast();

    return {
        success: (title: string, description?: string) =>
            addToast({ type: 'success', title, description }),
        error: (title: string, description?: string) =>
            addToast({ type: 'error', title, description }),
        warning: (title: string, description?: string) =>
            addToast({ type: 'warning', title, description }),
        info: (title: string, description?: string) =>
            addToast({ type: 'info', title, description }),
    };
}

// ============================================
// Toast Provider
// ============================================
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id, duration: toast.duration ?? 5000 };

        setToasts((prev) => [...prev, newToast]);

        // Auto dismiss
        if (newToast.duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, newToast.duration);
        }
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            {mounted && createPortal(
                <ToastContainer toasts={toasts} onRemove={removeToast} />,
                document.body
            )}
        </ToastContext.Provider>
    );
}

// ============================================
// Toast Container
// ============================================
function ToastContainer({
    toasts,
    onRemove
}: {
    toasts: Toast[];
    onRemove: (id: string) => void
}) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

// ============================================
// Toast Item
// ============================================
const typeStyles: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
    success: {
        bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        icon: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />,
    },
    error: {
        bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
        icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    },
};

function ToastItem({
    toast,
    onRemove
}: {
    toast: Toast;
    onRemove: (id: string) => void
}) {
    const style = typeStyles[toast.type];

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right fade-in duration-300 ${style.bg}`}
            role="alert"
        >
            <div className="flex-shrink-0">{style.icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {toast.title}
                </p>
                {toast.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {toast.description}
                    </p>
                )}
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4 text-slate-400" />
            </button>
        </div>
    );
}

// ============================================
// Standalone Toast (without provider)
// ============================================
export interface StandaloneToastProps {
    type: ToastType;
    title: string;
    description?: string;
    onClose?: () => void;
}

export function StandaloneToast({
    type,
    title,
    description,
    onClose
}: StandaloneToastProps) {
    const style = typeStyles[type];

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${style.bg}`}
            role="alert"
        >
            <div className="flex-shrink-0">{style.icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {title}
                </p>
                {description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {description}
                    </p>
                )}
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4 text-slate-400" />
                </button>
            )}
        </div>
    );
}
