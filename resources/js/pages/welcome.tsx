import { Link, usePage } from '@inertiajs/react';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import { sidebarItems } from '@/navigation/sidebar';
import type { Auth } from '@/types';

const statusMetrics = [
    { label: 'Draft', value: '0', tone: 'border-slate-200 bg-white' },
    { label: 'Pending Approval', value: '0', tone: 'border-amber-200 bg-amber-50' },
    { label: 'Planning', value: '0', tone: 'border-sky-200 bg-sky-50' },
    { label: 'Ongoing', value: '0', tone: 'border-emerald-200 bg-emerald-50' },
    { label: 'Awaiting BAST', value: '0', tone: 'border-indigo-200 bg-indigo-50' },
    { label: 'Ready To Close', value: '0', tone: 'border-violet-200 bg-violet-50' },
];

export default function Welcome() {
    const { auth } = usePage().props as unknown as { auth: Auth };
    const permissions = auth.user?.permissions ?? [];
    const visibleModules = sidebarItems
        .filter((item) => item.label !== 'Dashboard')
        .map((item) => ({
            ...item,
            allowed: item.permission ? permissions.includes(item.permission) : true,
        }));
    const readyModules = visibleModules.filter(
        (item) => item.status === 'ready' && item.allowed,
    );
    const plannedModules = visibleModules.filter((item) => item.status === 'planned');

    return (
        <AppLayout title="Project Management">
            <PageHeader
                eyebrow="Gate Apps Workspace"
                title="Project Management"
            />

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {statusMetrics.map((metric) => (
                    <div
                        key={metric.label}
                        className={`rounded-lg border p-4 ${metric.tone}`}
                    >
                        <div className="text-xs font-semibold text-slate-500">
                            {metric.label}
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-950">
                            {metric.value}
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-950">
                            Available Modules
                        </h2>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {readyModules.length} ready
                        </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {readyModules.map((item) => (
                            <div
                                key={item.label}
                                className="flex min-h-36 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-base font-semibold text-slate-950">
                                            {item.label}
                                        </h3>
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                            Active
                                        </span>
                                    </div>
                                </div>

                                {item.href && (
                                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                                        <Link
                                            href={item.href}
                                            className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"
                                        >
                                            Open
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-950">
                            Build Queue
                        </h2>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {plannedModules.length} planned
                        </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3">
                            {plannedModules.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-md border border-slate-100 bg-slate-50 p-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {item.label}
                                        </div>
                                        <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                            Upcoming
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
