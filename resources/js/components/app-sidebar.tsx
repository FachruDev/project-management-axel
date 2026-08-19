import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { sidebarItems } from '@/navigation/sidebar';
import type { SidebarItem } from '@/navigation/sidebar';
import type { Auth, ProjectReminderSummary } from '@/types';

type Props = {
    open: boolean;
    onCollapse: () => void;
};

export function AppSidebar({ open, onCollapse }: Props) {
    const { auth, project_reminders } = usePage().props as unknown as {
        auth: Auth;
        project_reminders?: ProjectReminderSummary;
    };
    const permissions = auth.user?.permissions ?? [];
    const currentUrl = usePage().url.split('?')[0] ?? '/';

    const visibleItems = sidebarItems
        .map((item) => ({
            ...item,
            allowed: item.permission ? permissions.includes(item.permission) : true,
            badge:
                item.label === 'Projects'
                    ? (project_reminders?.actionable_total ?? 0)
                    : 0,
        }))
        .filter((item) => item.allowed || item.status === 'planned');

    const groupedData = groupSidebarItems(visibleItems);

    return (
        <aside
            className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out ${
                open ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden border-r-0'
            }`}
        >
            <div className="flex h-full w-72 flex-col justify-between">

                {/* Header / Brand Identity */}
                <div>
                    <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/20">
                                PM
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-bold tracking-tight text-slate-900">
                                    Project Management
                                </div>
                                <div className="truncate text-[11px] font-medium text-slate-400">
                                    {auth.user?.external_id ?? auth.user?.email ?? 'Internal Account'}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Collapse sidebar"
                            onClick={onCollapse}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation Items with Accordion Groups */}
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[calc(100vh-8rem)]">
                        {groupedData.map(([section, items]) => (
                            <SidebarGroupAccordion
                                key={section}
                                section={section}
                                items={items}
                                currentUrl={currentUrl}
                            />
                        ))}
                    </nav>
                </div>

                {/* Footer User Profile */}
                <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-primary/20">
                            {auth.user?.name?.charAt(0) ?? 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-slate-800">
                                {auth.user?.name ?? 'Unknown User'}
                            </div>
                            <div className="truncate text-[11px] text-slate-400">
                                {auth.user?.email ?? '-'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </aside>
    );
}

{/* Component Sub-Accordion Group */}
function SidebarGroupAccordion({
    section,
    items,
    currentUrl,
}: {
    section: string;
    items: Array<SidebarItem & { allowed: boolean; badge: number }>;
    currentUrl: string;
}) {
    // Check if any sub-item inside this section is currently active
    const hasActiveItem = items.some((item) => isActive(currentUrl, item.href));

    // Accordion state: Default open if section contains the active menu
    const [isOpen, setIsOpen] = useState(hasActiveItem);

    useEffect(() => {
        if (hasActiveItem) {
            setIsOpen(true);
        }
    }, [currentUrl, hasActiveItem]);

    return (
        <div className="rounded-xl transition-colors">
            {/* Group Header Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-100/70 hover:text-slate-600"
            >
                <span>{section}</span>
                <svg
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Group Body Links */}
            {isOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l-2 border-slate-100 pl-2 transition-all">
                    {items.map((item) => (
                        <SidebarLink
                            key={`${section}-${item.label}`}
                            item={item}
                            active={isActive(currentUrl, item.href)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SidebarLink({
    item,
    active,
}: {
    item: SidebarItem & { allowed: boolean; badge: number };
    active: boolean;
}) {
    const Icon = item.icon;
    const isClickable = item.href && item.allowed;

    const baseStyle =
        'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150';

    if (active) {
        return (
            <Link
                href={item.href!}
                className={`${baseStyle} bg-primary text-white shadow-xs shadow-primary/30`}
            >
                <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-white" />
                    <span>{item.label}</span>
                </div>
                {item.badge > 0 ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        {item.badge}
                    </span>
                ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                )}
            </Link>
        );
    }

    if (isClickable) {
        return (
            <Link
                href={item.href!}
                className={`${baseStyle} text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 group`}
            >
                <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
                    <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    }

    return (
        <div
            className={`${baseStyle} cursor-not-allowed text-slate-400 hover:bg-slate-50`}
            aria-disabled="true"
        >
            <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-slate-300" />
                <span>{item.label}</span>
            </div>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                Soon
            </span>
        </div>
    );
}

function groupSidebarItems(items: Array<SidebarItem & { allowed: boolean; badge: number }>) {
    return Object.entries(
        items.reduce<Record<string, Array<SidebarItem & { allowed: boolean; badge: number }>>>(
            (groups, item) => {
                groups[item.section] = [...(groups[item.section] ?? []), item];

                return groups;
            },
            {},
        ),
    );
}

function isActive(currentUrl: string, href?: string) {
    if (!href) {
        return false;
    }

    if (href === '/') {
        return currentUrl === '/';
    }

    return currentUrl === href || currentUrl.startsWith(`${href}/`);
}
