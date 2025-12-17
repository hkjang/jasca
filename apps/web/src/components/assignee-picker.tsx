'use client';

import * as React from 'react';
import { Check, ChevronDown, Loader2, Search, User, X } from 'lucide-react';

// ============================================
// Types
// ============================================
export interface Assignee {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

// ============================================
// Assignee Picker Component
// ============================================
export interface AssigneePickerProps {
    value: Assignee | null;
    onChange: (assignee: Assignee | null) => void | Promise<void>;
    assignees: Assignee[];
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export function AssigneePicker({
    value,
    onChange,
    assignees,
    placeholder = '담당자 선택',
    disabled = false,
    loading = false,
    className,
}: AssigneePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isUpdating, setIsUpdating] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Filter assignees by search query
    const filteredAssignees = React.useMemo(() => {
        if (!searchQuery) return assignees;
        const query = searchQuery.toLowerCase();
        return assignees.filter(
            (a) => a.name.toLowerCase().includes(query) || a.email.toLowerCase().includes(query)
        );
    }, [assignees, searchQuery]);

    // Close on outside click
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    React.useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = async (assignee: Assignee | null) => {
        if (assignee?.id === value?.id) {
            setIsOpen(false);
            setSearchQuery('');
            return;
        }

        setIsUpdating(true);
        try {
            await onChange(assignee);
        } finally {
            setIsUpdating(false);
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className || ''}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled || loading || isUpdating}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 transition-colors ${disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800'
                    }`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {value ? (
                    <>
                        <Avatar assignee={value} size="sm" />
                        <span className="text-slate-900 dark:text-white truncate max-w-[120px]">
                            {value.name}
                        </span>
                    </>
                ) : (
                    <>
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
                    </>
                )}
                {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                ) : (
                    <ChevronDown className={`h-3 w-3 ml-auto text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                    role="listbox"
                >
                    {/* Search */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="이름 또는 이메일 검색..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-700 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                >
                                    <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Unassign option */}
                    {value && (
                        <button
                            onClick={() => handleSelect(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700"
                        >
                            <X className="h-4 w-4" />
                            <span>할당 해제</span>
                        </button>
                    )}

                    {/* Assignee list */}
                    <div className="max-h-[240px] overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            </div>
                        ) : filteredAssignees.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                {searchQuery ? '검색 결과가 없습니다' : '할당 가능한 사용자가 없습니다'}
                            </div>
                        ) : (
                            filteredAssignees.map((assignee) => {
                                const isSelected = assignee.id === value?.id;
                                return (
                                    <button
                                        key={assignee.id}
                                        onClick={() => handleSelect(assignee)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar assignee={assignee} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-slate-900 dark:text-white truncate">{assignee.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{assignee.email}</p>
                                            </div>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Avatar Component
// ============================================
interface AvatarProps {
    assignee: Assignee;
    size?: 'sm' | 'md' | 'lg';
}

function Avatar({ assignee, size = 'md' }: AvatarProps) {
    const sizeClasses = {
        sm: 'h-6 w-6 text-xs',
        md: 'h-8 w-8 text-sm',
        lg: 'h-10 w-10 text-base',
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (assignee.avatar) {
        return (
            <img
                src={assignee.avatar}
                alt={assignee.name}
                className={`${sizeClasses[size]} rounded-full object-cover`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-medium flex-shrink-0`}
        >
            {getInitials(assignee.name)}
        </div>
    );
}

// ============================================
// Simple Assignee Display
// ============================================
export interface AssigneeDisplayProps {
    assignee: Assignee | null;
    size?: 'sm' | 'md' | 'lg';
}

export function AssigneeDisplay({ assignee, size = 'md' }: AssigneeDisplayProps) {
    if (!assignee) {
        return (
            <span className="text-sm text-slate-400 dark:text-slate-500">
                미할당
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Avatar assignee={assignee} size={size} />
            <span className="text-sm text-slate-900 dark:text-white">{assignee.name}</span>
        </div>
    );
}
