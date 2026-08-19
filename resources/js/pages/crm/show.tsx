import { Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { index as crmIndex, show as crmShow } from '@/actions/App/Http/Controllers/CrmController';
import { show as calculationShow } from '@/actions/App/Http/Controllers/ProjectCalculationController';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type { CrmProjectRow, CrmShowProps } from '@/types';

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function CrmShow({
    customer,
    projects,
    status_distribution,
    filters,
    options,
}: CrmShowProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            crmShow.url(customer.id, { query: { search, status } }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <AppLayout title={`CRM - ${customer.name}`}>
            <PageHeader
                eyebrow="CRM Customer"
                title={customer.name}
                description={`${customer.company_name ?? 'No company'} / ${customer.email ?? 'No email'}`}
                actions={
                    <Link
                        href={crmIndex.url()}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                    >
                        Back
                    </Link>
                }
            />

            <section className="grid gap-4 md:grid-cols-4">
                <Metric label="Projects" value={String(customer.summary.projects_count)} />
                <Metric label="Active" value={String(customer.summary.active_projects_count)} />
                <Metric label="Closed" value={String(customer.summary.closed_projects_count)} />
                <Metric label="Locked Incentive" value={formatCurrency(customer.summary.locked_incentive_total)} />
            </section>

            <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-slate-950">Customer Profile</h2>
                    <div className="mt-4 space-y-3 text-sm">
                        <Info label="Company" value={customer.company_name ?? '-'} />
                        <Info label="Email" value={customer.email ?? '-'} />
                        <Info label="Address" value={customer.company_address ?? '-'} />
                        <Info label="Status" value={customer.is_active ? 'Active' : 'Inactive'} />
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-slate-950">Status Distribution</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {status_distribution.map((row) => (
                            <div key={row.status} className="rounded-md border border-slate-100 p-3">
                                <ProjectStatusBadge status={row.status} />
                                <div className="mt-2 text-lg font-semibold text-slate-950">{row.count}</div>
                            </div>
                        ))}
                        {status_distribution.length === 0 && (
                            <p className="text-sm text-slate-500">No project status data.</p>
                        )}
                    </div>
                </div>
            </section>

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_220px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search project"
                    className={inputClass}
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Statuses</option>
                    {options.statuses.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                    Apply
                </button>
            </form>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">PM / PIC</th>
                                <th className="px-4 py-3">Dates</th>
                                <th className="px-4 py-3">Progress</th>
                                <th className="px-4 py-3">Calculation</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projects.data.map((project) => (
                                <ProjectRow key={project.id} project={project} />
                            ))}
                            {projects.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No project found for this customer.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={projects} />
            </section>
        </AppLayout>
    );
}

function ProjectRow({ project }: { project: CrmProjectRow }) {
    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3">
                <div className="font-medium text-slate-950">{project.name}</div>
                <div className="mt-1">
                    <ProjectStatusBadge status={project.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                    {project.incentive_profile
                        ? `${project.incentive_profile.code} v${project.incentive_profile.version}`
                        : 'No incentive profile'}
                </div>
            </td>
            <td className="px-4 py-3 text-slate-600">
                <div>{project.pm?.name ?? '-'}</div>
                <div className="text-xs text-slate-500">{project.members_count} member(s)</div>
            </td>
            <td className="px-4 py-3 text-slate-600">
                <div>{project.plan_start_date ?? '-'} - {project.plan_end_date ?? '-'}</div>
                <div className="text-xs text-slate-500">
                    Actual {project.actual_start_date ?? '-'} - {project.actual_end_date ?? '-'}
                </div>
            </td>
            <td className="px-4 py-3 text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{project.progress}%</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                    {project.done_tasks_count}/{project.tasks_count} tasks
                </div>
            </td>
            <td className="px-4 py-3 text-slate-600">
                {project.calculation ? (
                    <>
                        <div className="font-semibold text-slate-950">
                            {formatCurrency(project.calculation.total_incentive)}
                        </div>
                        <div className="text-xs text-slate-500">
                            {project.calculation.is_locked ? 'Locked' : 'Open'} / {project.calculation.delivery_status || '-'}
                        </div>
                    </>
                ) : (
                    '-'
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                    {project.actions.can_view_project && (
                        <Link
                            href={projectShow.url(project.id)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Project
                        </Link>
                    )}
                    {project.actions.can_view_calculation && project.calculation && (
                        <Link
                            href={calculationShow.url(project.calculation.id)}
                            className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
                        >
                            Calculation
                        </Link>
                    )}
                </div>
            </td>
        </tr>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
            <div className="mt-1 text-slate-800">{value}</div>
        </div>
    );
}

function formatCurrency(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));
}
