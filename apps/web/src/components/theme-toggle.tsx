'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle({ className = '' }: { className?: string }) {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('jasca-theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            applyTheme(savedTheme);
        }
    }, []);

    const applyTheme = (newTheme: Theme) => {
        const root = document.documentElement;
        if (newTheme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', systemPrefersDark);
        } else {
            root.classList.toggle('dark', newTheme === 'dark');
        }
    };

    const cycleTheme = () => {
        const themes: Theme[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setTheme(nextTheme);
        localStorage.setItem('jasca-theme', nextTheme);
        applyTheme(nextTheme);
    };

    if (!mounted) {
        return (
            <button className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`}>
                <div className="h-5 w-5" />
            </button>
        );
    }

    const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
    const label = theme === 'light' ? '라이트 모드' : theme === 'dark' ? '다크 모드' : '시스템 설정';

    return (
        <button
            onClick={cycleTheme}
            className={`
                group relative p-2 rounded-lg 
                bg-slate-100 hover:bg-slate-200 
                dark:bg-slate-800 dark:hover:bg-slate-700 
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                dark:focus:ring-offset-slate-900
                ${className}
            `}
            title={label}
            aria-label={`테마 변경: ${label}`}
        >
            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300 transition-transform group-hover:scale-110" />
            
            {/* Tooltip */}
            <span className="
                absolute -bottom-10 left-1/2 -translate-x-1/2
                px-2 py-1 rounded text-xs
                bg-slate-900 dark:bg-slate-100
                text-white dark:text-slate-900
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                whitespace-nowrap pointer-events-none
                z-50
            ">
                {label}
            </span>
        </button>
    );
}

// Compact variant for headers
export function ThemeToggleCompact() {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('jasca-theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('jasca-theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggleTheme}
            className="
                relative w-14 h-7 rounded-full
                bg-slate-200 dark:bg-slate-700
                transition-colors duration-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
            role="switch"
            aria-checked={theme === 'dark'}
        >
            <span className="sr-only">테마 전환</span>
            
            {/* Icons */}
            <Sun className="absolute left-1.5 top-1.5 h-4 w-4 text-amber-500" />
            <Moon className="absolute right-1.5 top-1.5 h-4 w-4 text-blue-400" />
            
            {/* Toggle circle */}
            <span
                className={`
                    absolute top-0.5 w-6 h-6 rounded-full
                    bg-white shadow-md
                    transition-transform duration-300
                    ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'}
                `}
            />
        </button>
    );
}
