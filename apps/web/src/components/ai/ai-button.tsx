'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Sparkles, Loader2, X, AlertCircle, Coins } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

// ============================================
// AI Button Variants
// ============================================
const aiButtonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            variant: {
                primary: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 focus:ring-violet-500 shadow-md hover:shadow-lg',
                secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 focus:ring-slate-500 border border-slate-200 dark:border-slate-600',
                inline: 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 focus:ring-violet-500 p-1',
            },
            size: {
                sm: 'h-8 px-3 text-sm',
                md: 'h-10 px-4 text-sm',
                lg: 'h-12 px-6 text-base',
                icon: 'h-10 w-10',
                iconSm: 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

// ============================================
// AI Action Types
// ============================================
export type AiActionType =
    // Dashboard
    | 'dashboard.summary'
    | 'dashboard.riskAnalysis'
    // Project
    | 'project.analysis'
    | 'scan.changeAnalysis'
    // Vulnerabilities
    | 'vuln.priorityReorder'
    | 'vuln.actionGuide'
    | 'vuln.impactAnalysis'
    // Policies
    | 'policy.interpretation'
    | 'policy.recommendation'
    // Workflow
    | 'workflow.fixVerification'
    // Report
    | 'report.generation'
    // Notification
    | 'notification.summary'
    // Guide
    | 'guide.trivyCommand'
    // Admin
    | 'admin.permissionRecommendation'
    | 'admin.complianceMapping';

// ============================================
// AI Action Labels & Tooltips
// ============================================
const AI_ACTION_CONFIG: Record<AiActionType, { label: string; tooltip: string; requiredRole?: string }> = {
    'dashboard.summary': {
        label: 'AI 요약',
        tooltip: '전체 취약점 현황을 자연어로 요약합니다',
    },
    'dashboard.riskAnalysis': {
        label: 'AI 위험 분석',
        tooltip: '조직 전체의 위험 요인을 분석합니다',
        requiredRole: 'SYSTEM_ADMIN',
    },
    'project.analysis': {
        label: 'AI 프로젝트 분석',
        tooltip: '프로젝트별 핵심 리스크 원인을 분석합니다',
    },
    'scan.changeAnalysis': {
        label: 'AI 변화 분석',
        tooltip: '이전 스캔 대비 증가/감소 원인을 설명합니다',
    },
    'vuln.priorityReorder': {
        label: 'AI 우선순위',
        tooltip: '실제 악용 가능성 기준으로 취약점을 재정렬합니다',
    },
    'vuln.actionGuide': {
        label: 'AI 조치 가이드',
        tooltip: '패치 방법 및 업그레이드 권장사항을 제공합니다',
    },
    'vuln.impactAnalysis': {
        label: 'AI 영향 분석',
        tooltip: '영향받는 이미지/서비스를 요약합니다',
    },
    'policy.interpretation': {
        label: 'AI 정책 해석',
        tooltip: '차단 사유를 자연어로 설명합니다',
    },
    'policy.recommendation': {
        label: 'AI 정책 추천',
        tooltip: '프로젝트별 정책 초안을 생성합니다',
        requiredRole: 'ORG_ADMIN',
    },
    'workflow.fixVerification': {
        label: 'AI 수정 검증',
        tooltip: 'Fix 후 재발 가능성을 분석합니다',
    },
    'report.generation': {
        label: 'AI 리포트',
        tooltip: '감사용 요약 리포트를 생성합니다',
    },
    'notification.summary': {
        label: 'AI 알림 요약',
        tooltip: '다수 알림을 묶어 요약합니다',
    },
    'guide.trivyCommand': {
        label: 'AI 명령어 생성',
        tooltip: '환경별 Trivy 명령을 자동 생성합니다',
    },
    'admin.permissionRecommendation': {
        label: 'AI 권한 추천',
        tooltip: '역할 기반 권한을 추천합니다',
        requiredRole: 'SYSTEM_ADMIN',
    },
    'admin.complianceMapping': {
        label: 'AI 규제 매핑',
        tooltip: 'ISMS/ISO 항목을 자동 매핑합니다',
        requiredRole: 'SYSTEM_ADMIN',
    },
};

// ============================================
// Token Badge Component
// ============================================
interface TokenBadgeProps {
    estimatedTokens: number;
    className?: string;
}

export function AiTokenBadge({ estimatedTokens, className }: TokenBadgeProps) {
    const formatTokens = (tokens: number) => {
        if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}K`;
        }
        return tokens.toString();
    };

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ${className || ''}`}
        >
            <Coins className="h-3 w-3" />
            ~{formatTokens(estimatedTokens)}
        </span>
    );
}

// ============================================
// AI Button Props
// ============================================
export interface AiButtonProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>,
    VariantProps<typeof aiButtonVariants> {
    action: AiActionType;
    context?: Record<string, unknown>;
    estimatedTokens?: number;
    showTokens?: boolean;
    loading?: boolean;
    onExecute?: (action: AiActionType, context: Record<string, unknown>) => void;
    onCancel?: () => void;
    hideLabel?: boolean;
}

// ============================================
// AI Button Component
// ============================================
export function AiButton({
    className,
    variant,
    size,
    action,
    context = {},
    estimatedTokens,
    showTokens = true,
    loading = false,
    disabled,
    onExecute,
    onCancel,
    hideLabel = false,
    ...props
}: AiButtonProps) {
    const config = AI_ACTION_CONFIG[action];

    const handleClick = () => {
        if (loading && onCancel) {
            onCancel();
        } else if (onExecute) {
            onExecute(action, context);
        }
    };

    const buttonContent = (
        <>
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {!hideLabel && <span>처리 중...</span>}
                    {onCancel && (
                        <X className="h-3 w-3 ml-1 hover:text-red-300" />
                    )}
                </>
            ) : (
                <>
                    <Sparkles className="h-4 w-4" />
                    {!hideLabel && <span>{config.label}</span>}
                    {showTokens && estimatedTokens && estimatedTokens > 0 && (
                        <AiTokenBadge estimatedTokens={estimatedTokens} />
                    )}
                </>
            )}
        </>
    );

    const button = (
        <button
            className={aiButtonVariants({ variant, size, className })}
            disabled={disabled || (loading && !onCancel)}
            onClick={handleClick}
            {...props}
        >
            {buttonContent}
        </button>
    );

    // Wrap with tooltip if not loading
    if (!loading && config.tooltip) {
        return (
            <Tooltip content={config.tooltip} position="bottom">
                {button}
            </Tooltip>
        );
    }

    return button;
}

// ============================================
// AI Button Group Component
// ============================================
interface AiButtonGroupProps {
    children: React.ReactNode;
    className?: string;
}

export function AiButtonGroup({ children, className }: AiButtonGroupProps) {
    return (
        <div className={`inline-flex items-center gap-2 ${className || ''}`}>
            {children}
        </div>
    );
}

// ============================================
// Exports
// ============================================
export { aiButtonVariants, AI_ACTION_CONFIG };
export type { TokenBadgeProps };
