import { Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { index, show } from '@/actions/App/Http/Controllers/CrmController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { CrmCustomerRow, CrmIndexProps } from '@/types';

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function CrmIndex({ customers, filters, options }: CrmIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({ query: { search, status } }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <AppLayout title="CRM">
            <PageHeader
                eyebrow="CRM"
                title="Customer Workspace"
                description="Customer 360 view for projects, status, PM, and locked incentive summaries."
            />

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_220px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search customer, company, email, project"
                    className={inputClass}
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    {options.statuses.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
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
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Projects</th>
                                <th className="px-4 py-3">Last Update</th>
                                <th className="px-4 py-3 text-right">Locked Incentive</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {customers.data.map((customer) => (
                                <CustomerRow key={customer.id} customer={customer} />
                            ))}
                            {customers.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No CRM customer found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={customers} />
            </section>
        </AppLayout>
    );
}

function CustomerRow({ customer }: { customer: CrmCustomerRow }) {
    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3">
                <div className="font-medium text-slate-950">{customer.name}</div>
                <div className="text-xs text-slate-500">
                    {customer.company_name ?? '-'} / {customer.email ?? '-'}
                </div>
                <span
                    className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        customer.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                >
                    {customer.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td className="px-4 py-3 text-slate-600">
                <div>{customer.projects_count} total</div>
                <div className="text-xs text-slate-500">
                    {customer.active_projects_count} active / {customer.closed_projects_count} closed
                </div>
            </td>
            <td className="px-4 py-3 text-slate-600">{customer.last_project_update ?? '-'}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-950">
                {formatCurrency(customer.locked_incentive_total)}
            </td>
            <td className="px-4 py-3 text-right">
                <Link
                    href={show.url(customer.id)}
                    className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    Detail
                </Link>
            </td>
        </tr>
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
