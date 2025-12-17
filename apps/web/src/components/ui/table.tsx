'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ============================================
// Table Components
// ============================================
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    containerClassName?: string;
}

export function Table({ className, containerClassName, ...props }: TableProps) {
    return (
        <div className={`w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 ${containerClassName || ''}`}>
            <table
                className={`w-full caption-bottom text-sm ${className || ''}`}
                {...props}
            />
        </div>
    );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead className={`bg-slate-50 dark:bg-slate-800/50 ${className || ''}`} {...props} />
    );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody className={`divide-y divide-slate-100 dark:divide-slate-700 ${className || ''}`} {...props} />
    );
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tfoot
            className={`bg-slate-50 dark:bg-slate-800/50 font-medium ${className || ''}`}
            {...props}
        />
    );
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Sortable Table Head
// ============================================
export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
    onSort?: () => void;
}

export function TableHead({
    className,
    sortable,
    sortDirection,
    onSort,
    children,
    ...props
}: TableHeadProps) {
    return (
        <th
            className={`h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider ${sortable ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200' : ''
                } ${className || ''}`}
            onClick={sortable ? onSort : undefined}
            {...props}
        >
            <div className="flex items-center gap-1.5">
                {children}
                {sortable && (
                    <span className="flex-shrink-0">
                        {sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
                        {sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
                        {!sortDirection && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                    </span>
                )}
            </div>
        </th>
    );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td
            className={`p-4 align-middle text-slate-900 dark:text-slate-100 ${className || ''}`}
            {...props}
        />
    );
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
    return (
        <caption
            className={`mt-4 text-sm text-slate-500 dark:text-slate-400 ${className || ''}`}
            {...props}
        />
    );
}

// ============================================
// Empty State
// ============================================
export interface TableEmptyProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function TableEmpty({ icon, title, description, action }: TableEmptyProps) {
    return (
        <tr>
            <td colSpan={100} className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                    {icon && (
                        <div className="text-slate-300 dark:text-slate-600 mb-4">
                            {icon}
                        </div>
                    )}
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                            {description}
                        </p>
                    )}
                    {action && <div className="mt-4">{action}</div>}
                </div>
            </td>
        </tr>
    );
}

// ============================================
// Pagination
// ============================================
export interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
}

export function TablePagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
}: TablePaginationProps) {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {totalItems > 0
                        ? `${startItem}-${endItem} / ${totalItems.toLocaleString()}건`
                        : '0건'}
                </span>
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}개씩
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    이전
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[80px] text-center">
                    {currentPage} / {totalPages || 1}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    다음
                </button>
            </div>
        </div>
    );
}
