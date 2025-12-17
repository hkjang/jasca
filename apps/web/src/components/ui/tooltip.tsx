'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

// ============================================
// Tooltip Component
// ============================================
export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

export function Tooltip({
    content,
    children,
    position = 'top',
    delay = 200,
    className
}: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [coords, setCoords] = React.useState({ x: 0, y: 0 });
    const [mounted, setMounted] = React.useState(false);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        setMounted(true);
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const showTooltip = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const offset = 8;

                let x = 0;
                let y = 0;

                switch (position) {
                    case 'top':
                        x = rect.left + rect.width / 2;
                        y = rect.top - offset;
                        break;
                    case 'bottom':
                        x = rect.left + rect.width / 2;
                        y = rect.bottom + offset;
                        break;
                    case 'left':
                        x = rect.left - offset;
                        y = rect.top + rect.height / 2;
                        break;
                    case 'right':
                        x = rect.right + offset;
                        y = rect.top + rect.height / 2;
                        break;
                }

                setCoords({ x, y });
                setIsVisible(true);
            }
        }, delay);
    }, [delay, position]);

    const hideTooltip = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    }, []);

    const positionStyles: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowStyles: Record<string, string> = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800 dark:border-t-slate-700',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800 dark:border-b-slate-700',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800 dark:border-l-slate-700',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800 dark:border-r-slate-700',
    };

    const tooltipContent = (
        <div
            className={`absolute z-50 px-3 py-2 text-sm text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-lg max-w-xs animate-in fade-in zoom-in-95 duration-150 ${positionStyles[position]} ${className || ''}`}
            role="tooltip"
        >
            {content}
            <div
                className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`}
                aria-hidden="true"
            />
        </div>
    );

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {mounted && isVisible && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        left: coords.x,
                        top: coords.y,
                        transform: position === 'top' ? 'translate(-50%, -100%)' :
                            position === 'bottom' ? 'translate(-50%, 0)' :
                                position === 'left' ? 'translate(-100%, -50%)' :
                                    'translate(0, -50%)',
                        zIndex: 9999,
                    }}
                >
                    <div className="px-3 py-2 text-sm text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-lg max-w-xs animate-in fade-in zoom-in-95 duration-150">
                        {content}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ============================================
// InfoTooltip (CVE, CVSS 설명용)
// ============================================
export interface InfoTooltipProps {
    content: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ content, position = 'top' }: InfoTooltipProps) {
    return (
        <Tooltip content={content} position={position}>
            <button
                type="button"
                className="inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="More information"
            >
                <HelpCircle className="h-4 w-4" />
            </button>
        </Tooltip>
    );
}

// ============================================
// CVE Tooltip
// ============================================
export interface CveTooltipProps {
    cveId: string;
    children: React.ReactElement;
}

export function CveTooltip({ cveId, children }: CveTooltipProps) {
    const content = (
        <div className="space-y-1">
            <p className="font-medium">{cveId}</p>
            <p className="text-slate-300 text-xs">
                CVE(Common Vulnerabilities and Exposures)는 공개적으로 알려진
                정보 보안 취약점의 표준화된 식별자입니다.
            </p>
            <a
                href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 text-xs underline"
                onClick={(e) => e.stopPropagation()}
            >
                NVD에서 자세히 보기 →
            </a>
        </div>
    );

    return (
        <Tooltip content={content} position="top">
            {children}
        </Tooltip>
    );
}

// ============================================
// CVSS Tooltip
// ============================================
export interface CvssTooltipProps {
    score: number;
    vector?: string;
    children: React.ReactElement;
}

export function CvssTooltip({ score, vector, children }: CvssTooltipProps) {
    const getSeverity = (score: number) => {
        if (score >= 9.0) return { label: 'Critical', color: 'text-red-400' };
        if (score >= 7.0) return { label: 'High', color: 'text-orange-400' };
        if (score >= 4.0) return { label: 'Medium', color: 'text-yellow-400' };
        if (score >= 0.1) return { label: 'Low', color: 'text-blue-400' };
        return { label: 'None', color: 'text-slate-400' };
    };

    const severity = getSeverity(score);

    const content = (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="font-medium">CVSS 점수:</span>
                <span className={`font-bold ${severity.color}`}>{score}</span>
                <span className={`text-xs ${severity.color}`}>({severity.label})</span>
            </div>
            {vector && (
                <p className="text-xs text-slate-300 font-mono break-all">
                    {vector}
                </p>
            )}
            <p className="text-xs text-slate-400">
                CVSS(Common Vulnerability Scoring System)는 취약점의
                심각도를 0-10 점수로 나타내는 표준 시스템입니다.
            </p>
        </div>
    );

    return (
        <Tooltip content={content} position="top">
            {children}
        </Tooltip>
    );
}
