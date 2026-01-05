'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftIcon, rightIcon, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
                            w-full px-3 py-2.5 rounded-lg border transition-colors duration-200
                            bg-white dark:bg-slate-900
                            text-slate-900 dark:text-white
                            placeholder:text-slate-400
                            focus:outline-none focus:ring-2 focus:ring-offset-0
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${leftIcon ? 'pl-10' : ''}
                            ${rightIcon ? 'pr-10' : ''}
                            ${error
                                ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                            }
                            ${className}
                        `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';

// Password input with toggle
interface PasswordInputProps extends Omit<InputProps, 'type'> {}

export function PasswordInput({ ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Input
            {...props}
            type={showPassword ? 'text' : 'password'}
            rightIcon={
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            }
        />
    );
}

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={`
                        w-full px-3 py-2.5 rounded-lg border transition-colors duration-200
                        bg-white dark:bg-slate-900
                        text-slate-900 dark:text-white
                        placeholder:text-slate-400
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        disabled:opacity-50 disabled:cursor-not-allowed
                        resize-y min-h-[100px]
                        ${error
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                            : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                        }
                        ${className}
                    `}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
                )}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';

// Select
interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, placeholder, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    className={`
                        w-full px-3 py-2.5 rounded-lg border transition-colors duration-200
                        bg-white dark:bg-slate-900
                        text-slate-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${error
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                            : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                        }
                        ${className}
                    `}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Select.displayName = 'Select';

// Checkbox
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string;
    description?: string;
}

export function Checkbox({ label, description, className = '', ...props }: CheckboxProps) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
                <input
                    type="checkbox"
                    className={`
                        peer sr-only
                    `}
                    {...props}
                />
                <div className={`
                    w-5 h-5 rounded border-2 transition-colors duration-200
                    border-slate-300 dark:border-slate-600
                    peer-checked:bg-blue-600 peer-checked:border-blue-600
                    peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2
                    peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
                    flex items-center justify-center
                `}>
                    <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
            </div>
            <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                    {label}
                </span>
                {description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                )}
            </div>
        </label>
    );
}

// Radio group
interface RadioOption {
    value: string;
    label: string;
    description?: string;
}

interface RadioGroupProps {
    name: string;
    label?: string;
    options: RadioOption[];
    value?: string;
    onChange?: (value: string) => void;
    direction?: 'horizontal' | 'vertical';
}

export function RadioGroup({
    name,
    label,
    options,
    value,
    onChange,
    direction = 'vertical',
}: RadioGroupProps) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                </label>
            )}
            <div className={`flex ${direction === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-6'}`}>
                {options.map((option) => (
                    <label key={option.value} className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex-shrink-0 mt-0.5">
                            <input
                                type="radio"
                                name={name}
                                value={option.value}
                                checked={value === option.value}
                                onChange={(e) => onChange?.(e.target.value)}
                                className="peer sr-only"
                            />
                            <div className={`
                                w-5 h-5 rounded-full border-2 transition-colors duration-200
                                border-slate-300 dark:border-slate-600
                                peer-checked:border-blue-600
                                peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2
                                flex items-center justify-center
                            `}>
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {option.label}
                            </span>
                            {option.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}

// Switch / Toggle
interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
}

export function Switch({ checked = false, onChange, label, description, disabled = false }: SwitchProps) {
    return (
        <label className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            {(label || description) && (
                <div>
                    {label && (
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {label}
                        </span>
                    )}
                    {description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    )}
                </div>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange?.(!checked)}
                className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 rounded-full
                    transition-colors duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}
                `}
            >
                <span
                    className={`
                        pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                        transform transition-transform duration-200 ease-in-out
                        ${checked ? 'translate-x-5' : 'translate-x-0.5'}
                        mt-0.5
                    `}
                />
            </button>
        </label>
    );
}
