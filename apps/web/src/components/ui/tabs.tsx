'use client';

import { useState, ReactNode, createContext, useContext } from 'react';

interface Tab {
    id: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
    badge?: string | number;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
    variant?: 'default' | 'pills' | 'underline';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    children?: ReactNode;
}

interface TabPanelProps {
    id: string;
    children: ReactNode;
}

const TabsContext = createContext<{ activeTab: string }>({ activeTab: '' });

export function Tabs({
    tabs,
    defaultTab,
    onChange,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    children,
}: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        onChange?.(tabId);
    };

    const sizeClasses = {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-5 py-2.5',
    };

    const getTabClasses = (tab: Tab) => {
        const isActive = activeTab === tab.id;
        const base = `
            inline-flex items-center gap-2 font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
        `;

        switch (variant) {
            case 'pills':
                return `
                    ${base}
                    rounded-lg
                    ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                `;
            case 'underline':
                return `
                    ${base}
                    border-b-2 -mb-px
                    ${isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                    }
                `;
            default:
                return `
                    ${base}
                    rounded-t-lg border-x border-t
                    ${isActive
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-blue-600 -mb-px'
                        : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }
                `;
        }
    };

    return (
        <TabsContext.Provider value={{ activeTab }}>
            <div>
                <div
                    className={`
                        flex gap-1
                        ${variant === 'underline' ? 'border-b border-slate-200 dark:border-slate-700' : ''}
                        ${fullWidth ? 'w-full' : ''}
                    `}
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            disabled={tab.disabled}
                            className={`
                                ${getTabClasses(tab)}
                                ${fullWidth ? 'flex-1 justify-center' : ''}
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.badge !== undefined && (
                                <span className={`
                                    inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                                    text-xs font-medium rounded-full
                                    ${activeTab === tab.id
                                        ? 'bg-white/20 text-inherit'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    }
                                `}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabPanel({ id, children }: TabPanelProps) {
    const { activeTab } = useContext(TabsContext);

    if (activeTab !== id) return null;

    return <div className="pt-4">{children}</div>;
}

// Vertical tabs
interface VerticalTabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
    children?: ReactNode;
}

export function VerticalTabs({ tabs, defaultTab, onChange, children }: VerticalTabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        onChange?.(tabId);
    };

    return (
        <TabsContext.Provider value={{ activeTab }}>
            <div className="flex gap-6">
                <div className="w-56 flex-shrink-0 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            disabled={tab.disabled}
                            className={`
                                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left
                                transition-colors
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${activeTab === tab.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }
                            `}
                        >
                            {tab.icon}
                            <span className="font-medium">{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium rounded-full bg-slate-200 dark:bg-slate-700">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex-1">{children}</div>
            </div>
        </TabsContext.Provider>
    );
}

// Accordion component
interface AccordionItem {
    id: string;
    title: string;
    content: ReactNode;
    disabled?: boolean;
}

interface AccordionProps {
    items: AccordionItem[];
    allowMultiple?: boolean;
    defaultOpen?: string[];
}

export function Accordion({ items, allowMultiple = false, defaultOpen = [] }: AccordionProps) {
    const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

    const toggleItem = (id: string) => {
        const newOpen = new Set(openItems);
        if (newOpen.has(id)) {
            newOpen.delete(id);
        } else {
            if (!allowMultiple) {
                newOpen.clear();
            }
            newOpen.add(id);
        }
        setOpenItems(newOpen);
    };

    return (
        <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {items.map((item) => {
                const isOpen = openItems.has(item.id);
                return (
                    <div key={item.id}>
                        <button
                            onClick={() => toggleItem(item.id)}
                            disabled={item.disabled}
                            className={`
                                w-full flex items-center justify-between px-4 py-3 text-left
                                bg-white dark:bg-slate-800
                                text-slate-900 dark:text-white font-medium
                                hover:bg-slate-50 dark:hover:bg-slate-700/50
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors
                            `}
                        >
                            {item.title}
                            <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {isOpen && (
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                                {item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
