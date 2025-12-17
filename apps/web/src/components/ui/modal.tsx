'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

// ============================================
// Modal Context
// ============================================
interface ModalContextType {
    open: boolean;
    onClose: () => void;
}

const ModalContext = React.createContext<ModalContextType | null>(null);

function useModal() {
    const context = React.useContext(ModalContext);
    if (!context) {
        throw new Error('Modal components must be used within a Modal');
    }
    return context;
}

// ============================================
// Modal Root
// ============================================
export interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    // Handle escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    if (!mounted || !open) return null;

    return createPortal(
        <ModalContext.Provider value={{ open, onClose }}>
            {children}
        </ModalContext.Provider>,
        document.body
    );
}

// ============================================
// Modal Overlay
// ============================================
export function ModalOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const { onClose } = useModal();

    return (
        <div
            className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ${className || ''}`}
            onClick={onClose}
            aria-hidden="true"
            {...props}
        />
    );
}

// ============================================
// Modal Content
// ============================================
export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
};

export function ModalContent({ className, size = 'md', children, ...props }: ModalContentProps) {
    return (
        <>
            <ModalOverlay />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    className={`relative w-full ${sizeStyles[size]} bg-white dark:bg-slate-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col ${className || ''}`}
                    onClick={(e) => e.stopPropagation()}
                    {...props}
                >
                    {children}
                </div>
            </div>
        </>
    );
}

// ============================================
// Modal Header
// ============================================
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    showClose?: boolean;
}

export function ModalHeader({ className, showClose = true, children, ...props }: ModalHeaderProps) {
    const { onClose } = useModal();

    return (
        <div
            className={`flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 ${className || ''}`}
            {...props}
        >
            <div className="flex-1">{children}</div>
            {showClose && (
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Close modal"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}

// ============================================
// Modal Title
// ============================================
export function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h2
            className={`text-lg font-semibold text-slate-900 dark:text-white ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Modal Description
// ============================================
export function ModalDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Modal Body
// ============================================
export function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`p-6 overflow-y-auto flex-1 ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Modal Footer
// ============================================
export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Confirm Modal (편의 컴포넌트)
// ============================================
export interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
    loading?: boolean;
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'default',
    loading = false,
}: ConfirmModalProps) {
    return (
        <Modal open={open} onClose={onClose}>
            <ModalContent size="sm">
                <ModalHeader showClose={false}>
                    <ModalTitle>{title}</ModalTitle>
                    {description && <ModalDescription>{description}</ModalDescription>}
                </ModalHeader>
                <ModalFooter>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? '처리 중...' : confirmText}
                    </button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
