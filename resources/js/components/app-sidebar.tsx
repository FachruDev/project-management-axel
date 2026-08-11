import { Link, usePage } from '@inertiajs/react';
import { sidebarItems, type SidebarItem } from '@/navigation/sidebar';
import type { Auth } from '@/types';

type Props = {
    open: boolean;
    onCollapse: () => void;
};

export function AppSidebar({ open, onCollapse }: Props) {
    const { auth } = usePage().props as unknown as { auth: Auth };
    const permissions = auth.user?.permissions ?? [];
    const currentUrl = usePage().url.split('?')[0] ?? '/';
    const visibleItems = sidebarItems
        .map((item) => ({
            ...item,
            allowed: item.permission ? permissions.includes(item.permission) : true,
        }))
        .filter((item) => item.allowed || item.status === 'planned');

    return (
        <aside
            className={`relative min-h-screen shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ${
                open ? 'w-72' : 'w-0 border-r-0'
            }`}
        >
            <div className="flex h-screen w-72 flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">
                            PM
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-950">
                                Project Management
                            </div>
                            <div className="truncate text-xs text-slate-500">
                                {auth.user?.external_id ?? auth.user?.email ?? 'Internal'}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Collapse sidebar"
                        onClick={onCollapse}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <div className="flex flex-col gap-6">
                        {groupSidebarItems(visibleItems).map(([section, items]) => (
                            <div key={section}>
                                <div className="px-3 text-[11px] font-semibold uppercase text-slate-400">
                                    {section}
                                </div>
                                <div className="mt-2 flex flex-col gap-1">
                                    {items.map((item) => (
                                        <SidebarLink
                                            key={`${section}-${item.label}`}
                                            item={item}
                                            active={isActive(currentUrl, item.href)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                            {auth.user?.name?.charAt(0) ?? 'U'}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-slate-800">
                                {auth.user?.name ?? 'Unknown User'}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">
                                {auth.user?.email ?? '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function SidebarLink({
    item,
    active,
}: {
    item: SidebarItem & { allowed: boolean };
    active: boolean;
}) {
    const className = `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
        active
            ? 'bg-primary text-white'
            : item.href && item.allowed
              ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              : 'cursor-not-allowed text-slate-400'
    }`;

    if (item.href && item.allowed) {
        return (
            <Link href={item.href} className={className}>
                <span>{item.label}</span>
            </Link>
        );
    }

    return (
        <div className={className} aria-disabled="true">
            <span>{item.label}</span>
            <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px]">
                Soon
            </span>
        </div>
    );
}

function groupSidebarItems(items: Array<SidebarItem & { allowed: boolean }>) {
    return Object.entries(
        items.reduce<Record<string, Array<SidebarItem & { allowed: boolean }>>>(
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
