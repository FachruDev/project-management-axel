import { Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import MyIncentiveController from '@/actions/App/Http/Controllers/MyIncentiveController';
import { show as calculationShow } from '@/actions/App/Http/Controllers/ProjectCalculationController';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { IncentiveItem, MyIncentiveIndexProps } from '@/types';

// Class standar input dengan w-full agar mengisi grid secara proporsional
const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-700 focus:ring-1 focus:ring-slate-700';

export default function MyIncentiveIndex({
    items,
    summary,
    filters,
    options,
}: MyIncentiveIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [projectId, setProjectId] = useState(filters.project_id ?? '');
    const [customerId, setCustomerId] = useState(filters.customer_id ?? '');
    const [profileId, setProfileId] = useState(filters.incentive_profile_id ?? '');
    const [lockedFrom, setLockedFrom] = useState(filters.locked_from ?? '');
    const [lockedTo, setLockedTo] = useState(filters.locked_to ?? '');

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            MyIncentiveController.url({
                query: {
                    search,
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
        <AppLayout title="My Incentive">
            <PageHeader
                eyebrow="Incentive"
                title="My Incentive"
                description="Readonly incentive from locked current project calculations."
            />

            {/* Metric Card Section: 1 kolom di HP, 3 kolom di layar tablet ke atas */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Metric label="Total Final Score" value={formatScore(summary.total_incentive)} />
                <Metric label="Projects" value={String(summary.projects_count)} />
                <Metric label="Items" value={String(summary.items_count)} />
            </section>

            {/* Filter Form: Grid responsif bertahap (1 col -> 2 col -> 3 col -> 7 col) */}
            <form
                onSubmit={submitFilters}
                className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7"
            >
                {/* Search input membentang 2 kolom pada tablet dan desktop sedang */}
                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search project, customer, role"
                        className={inputClass}
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

                {/* Tombol Apply membentang penuh di mobile/tablet, atau pas di desktop lebar */}
                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
                    <button
                        type="submit"
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        Apply
                    </button>
                </div>
            </form>

            {/* Container Tabel dengan Pagination */}
            <div className="space-y-4">
                <IncentiveTable items={items.data} showEmployee={false} />
                <Pagination data={items} />
            </div>
        </AppLayout>
    );
}

function IncentiveTable({
    items,
    showEmployee,
}: {
    items: IncentiveItem[];
    showEmployee: boolean;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                            {showEmployee && <th className="whitespace-nowrap px-4 py-3">Employee</th>}
                            <th className="whitespace-nowrap px-4 py-3">Project</th>
                            <th className="whitespace-nowrap px-4 py-3">Role</th>
                            <th className="whitespace-nowrap px-4 py-3">Profile</th>
                            <th className="whitespace-nowrap px-4 py-3">Locked At</th>
                            <th className="whitespace-nowrap px-4 py-3 text-right">Final Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {items.map((item) => (
                            <tr key={item.id} className="transition hover:bg-slate-50/80">
                                {showEmployee && (
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <div className="font-medium text-slate-950">{item.employee.name}</div>
                                        <div className="text-xs text-slate-500">{item.employee.email || '-'}</div>
                                    </td>
                                )}
                                <td className="max-w-[220px] px-4 py-3">
                                    <div className="truncate font-medium text-slate-950" title={item.project.name}>
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
                                    <div className="text-xs text-slate-500">
                                        {item.calculation.delivery_status || '-'}
                                    </div>
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
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={showEmployee ? 6 : 5}
                                    className="px-4 py-12 text-center text-sm text-slate-500"
                                >
                                    No locked incentive found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
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
