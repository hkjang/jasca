/**
 * JASCA Design System - Design Tokens
 * 색상, 간격, 타이포그래피 상수 정의
 */

// ============================================
// 심각도(Severity) 색상
// ============================================
export const severityColors = {
    critical: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-300 dark:border-red-700',
        solid: 'bg-red-600 text-white',
        hex: '#DC2626',
        icon: '🔴',
    },
    high: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-300 dark:border-orange-700',
        solid: 'bg-orange-500 text-white',
        hex: '#EA580C',
        icon: '🟠',
    },
    medium: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-300 dark:border-yellow-700',
        solid: 'bg-yellow-500 text-white',
        hex: '#CA8A04',
        icon: '🟡',
    },
    low: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        solid: 'bg-blue-500 text-white',
        hex: '#2563EB',
        icon: '🔵',
    },
    unknown: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-300 dark:border-slate-600',
        solid: 'bg-slate-500 text-white',
        hex: '#6B7280',
        icon: '⚪',
    },
} as const;

// ============================================
// 상태(Status) 색상
// ============================================
export const statusColors = {
    open: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
        label: '미해결',
    },
    assigned: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
        label: '할당됨',
    },
    in_progress: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
        label: '진행 중',
    },
    fix_submitted: {
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-200 dark:border-cyan-800',
        dot: 'bg-cyan-500',
        label: '수정 제출',
    },
    verifying: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-700 dark:text-indigo-300',
        border: 'border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-500',
        label: '검증 중',
    },
    fixed: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        dot: 'bg-green-500',
        label: '해결됨',
    },
    closed: {
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        label: '종료',
    },
    ignored: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-500 dark:text-slate-500',
        border: 'border-slate-300 dark:border-slate-600',
        dot: 'bg-slate-400',
        label: '무시',
    },
    false_positive: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        label: '오탐',
    },
} as const;

// ============================================
// 역할(Role) 색상
// ============================================
export const roleColors = {
    system_admin: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-300',
        label: '시스템 관리자',
    },
    org_admin: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-300',
        label: '조직 관리자',
    },
    security_admin: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-300',
        label: '보안 담당자',
    },
    project_admin: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        label: '프로젝트 관리자',
    },
    developer: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        label: '개발자',
    },
    viewer: {
        bg: 'bg-slate-100 dark:bg-slate-700',
        text: 'text-slate-700 dark:text-slate-300',
        label: '뷰어',
    },
} as const;

// ============================================
// 간격 시스템
// ============================================
export const spacing = {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
} as const;

// ============================================
// 타이포그래피
// ============================================
export const typography = {
    // 수치 전용 (모노스페이스)
    mono: 'font-mono tabular-nums',
    // 제목
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-semibold tracking-tight',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-medium',
    // 본문
    body: 'text-base',
    bodySmall: 'text-sm',
    caption: 'text-xs text-slate-500 dark:text-slate-400',
    // 라벨
    label: 'text-sm font-medium',
} as const;

// ============================================
// 애니메이션
// ============================================
export const animations = {
    fadeIn: 'animate-in fade-in duration-200',
    slideIn: 'animate-in slide-in-from-bottom-2 duration-300',
    pulse: 'animate-pulse',
    spin: 'animate-spin',
} as const;

// ============================================
// 공통 스타일
// ============================================
export const commonStyles = {
    // 카드
    card: 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700',
    cardHover: 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer',
    // 버튼
    buttonBase: 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
    buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    buttonSecondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    buttonDanger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    buttonGhost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
    // 크기
    buttonSm: 'h-8 px-3 text-sm',
    buttonMd: 'h-10 px-4 text-sm',
    buttonLg: 'h-12 px-6 text-base',
    // 입력
    input: 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
    // 테이블
    tableHeader: 'bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider',
    tableRow: 'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
    tableCell: 'px-4 py-3 text-sm text-slate-900 dark:text-slate-100',
} as const;

// ============================================
// 유틸리티 함수
// ============================================
export function getSeverityStyle(severity: string) {
    const key = severity.toLowerCase() as keyof typeof severityColors;
    return severityColors[key] || severityColors.unknown;
}

export function getStatusStyle(status: string) {
    const key = status.toLowerCase().replace(/-/g, '_') as keyof typeof statusColors;
    return statusColors[key] || statusColors.open;
}

export function getRoleStyle(role: string) {
    const key = role.toLowerCase() as keyof typeof roleColors;
    return roleColors[key] || roleColors.viewer;
}

// ============================================
// 타입 정의
// ============================================
export type Severity = keyof typeof severityColors;
export type Status = keyof typeof statusColors;
export type Role = keyof typeof roleColors;
