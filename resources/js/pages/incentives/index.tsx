import { Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import IncentiveController from '@/actions/App/Http/Controllers/IncentiveController';
import { show as calculationShow } from '@/actions/App/Http/Controllers/ProjectCalculationController';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { AdminIncentiveIndexProps, IncentiveItem } from '@/types';

// Class reusable untuk input dan select agar seragam dan responsif
const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-700 focus:ring-1 focus:ring-slate-700';

export default function IncentiveIndex({
    items,
    summary,
    filters,
    options,
}: AdminIncentiveIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id ?? '');
    const [projectId, setProjectId] = useState(filters.project_id ?? '');
    const [customerId, setCustomerId] = useState(filters.customer_id ?? '');
    const [profileId, setProfileId] = useState(filters.incentive_profile_id ?? '');
    const [lockedFrom, setLockedFrom] = useState(filters.locked_from ?? '');
    const [lockedTo, setLockedTo] = useState(filters.locked_to ?? '');

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            IncentiveController.url({
                query: {
                    search,
                    employee_id: employeeId,
                    project_id: projectId,
                    customer_id: customerId,
                    incentive_profile_id: profileId,
                    locked_from: lockedFrom,
                    locked_to: lockedTo,
                },
            }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <AppLayout title="Incentives">
            <PageHeader
                eyebrow="Incentive"
                title="Incentives"
                description="Readonly employee incentives from locked current project calculations."
            />

            {/* Kartu Ringkasan (Metrics): 1 kolom di HP, 2 di tablet, 4 di desktop */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Total Final Score" value={formatScore(summary.total_incentive)} />
                <Metric label="Employees" value={String(summary.employees_count)} />
                <Metric label="Projects" value={String(summary.projects_count)} />
                <Metric label="Items" value={String(summary.items_count)} />
            </section>

            {/* Form Filter Responsif: 1 -> 2 -> 4 -> 8 kolom */}
            <form
                onSubmit={submitFilters}
                className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8"
            >
                <div className="sm:col-span-2 lg:col-span-2 2xl:col-span-1">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search employee, project, customer"
                        className={inputClass}
                    />
                </div>

                <div>
                    <Select
                        value={employeeId}
                        onChange={setEmployeeId}
                        label="All Employees"
                        options={options.employees}
                    />
                </div>

                <div>
                    <Select
                        value={projectId}
                        onChange={setProjectId}
                        label="All Projects"
                        options={options.projects}
                    />
                </div>

                <div>
                    <Select
                        value={customerId}
                        onChange={setCustomerId}
                        label="All Customers"
                        options={options.customers}
                    />
                </div>

                <div>
                    <select
                        value={profileId}
                        onChange={(event) => setProfileId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">All Profiles</option>
                        {options.incentive_profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                                {profile.code} v{profile.version}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <input
                        type="date"
                        value={lockedFrom}
                        onChange={(event) => setLockedFrom(event.target.value)}
                        className={inputClass}
                        aria-label="Locked from"
                    />
                </div>

                <div>
                    <input
                        type="date"
                        value={lockedTo}
                        onChange={(event) => setLockedTo(event.target.value)}
                        className={inputClass}
                        aria-label="Locked to"
                    />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 2xl:col-span-1">
                    <button
                        type="submit"
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        Apply
                    </button>
                </div>
            </form>

            {/* Bagian Tabel Data */}
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="whitespace-nowrap px-4 py-3">Employee</th>
                                <th className="whitespace-nowrap px-4 py-3">Project</th>
                                <th className="whitespace-nowrap px-4 py-3">Role</th>
                                <th className="whitespace-nowrap px-4 py-3">Profile</th>
                                <th className="whitespace-nowrap px-4 py-3">Locked At</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Final Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {items.data.map((item) => (
                                <IncentiveRow key={item.id} item={item} />
                            ))}
                            {items.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No locked incentive found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={items} />
            </section>
        </AppLayout>
    );
}

function IncentiveRow({ item }: { item: IncentiveItem }) {
    return (
        <tr className="transition hover:bg-slate-50/80">
            <td className="max-w-[180px] px-4 py-3">
                <div className="truncate font-medium text-slate-950" title={item.employee.name}>
                    {item.employee.name}
                </div>
                <div className="truncate text-xs text-slate-500" title={item.employee.email || ''}>
                    {item.employee.email || '-'}
                </div>
            </td>
            <td className="max-w-[220px] px-4 py-3">
                <div className="truncate font-medium text-slate-950" title={item.project.name ?? ''}>
                    {item.project.id ? (
                        <Link href={projectShow.url(item.project.id)} className="hover:underline">
                            {item.project.name}
                        </Link>
                    ) : (
                        item.project.name ?? '-'
                    )}
                </div>
                <div className="truncate text-xs text-slate-500" title={item.project.customers.map((c) => c.name).join(', ')}>
                    {item.project.customers.map((customer) => customer.name).join(', ') || '-'}
                </div>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                <div>{item.project_role}</div>
                <div className="text-xs text-slate-500">
                    {item.pic_level ?? '-'} {item.is_support ? '/ Support' : ''}
                </div>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {item.incentive_profile
                    ? `${item.incentive_profile.code} v${item.incentive_profile.version}`
                    : '-'}
                <div className="text-xs text-slate-500">{item.calculation.delivery_status || '-'}</div>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                <div>{item.calculation.locked_at ?? '-'}</div>
                {item.calculation.id && (
                    <div>
                        <Link
                            href={calculationShow.url(item.calculation.id)}
                            className="text-xs font-medium text-slate-800 hover:underline"
                        >
                            Calculation #{item.calculation.id}
                        </Link>
                    </div>
                )}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-950">
                {formatScore(item.final_incentive)}
                <div className="text-xs font-normal text-slate-500">
                    Base {formatScore(item.base_incentive)} x {formatScore(item.delivery_multiplier)}
                </div>
            </td>
        </tr>
    );
}

function Select({
    value,
    onChange,
    label,
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    options: Array<{ id: number; name: string }>;
}) {
    return (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
            <option value="">{label}</option>
            {options.map((option) => (
                <option key={option.id} value={option.id}>
                    {option.name}
                </option>
            ))}
        </select>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
        </div>
    );
}

function formatScore(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(Number(value));
}
