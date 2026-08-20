import { Link, router } from '@inertiajs/react';
import { SquarePen, Printer } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    create,
    edit,
    index,
    print as printQuotation,
} from '@/actions/App/Http/Controllers/ProjectQuotationController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { ProjectQuotationIndexProps, ProjectQuotationSummary } from '@/types';

// Class input dibuat reusable dengan w-full agar mengisi ruang grid dengan rapi
const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-700 focus:ring-1 focus:ring-slate-700';

export default function ProjectQuotationIndex({
    quotations,
    filters,
    options,
}: ProjectQuotationIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const [projectId, setProjectId] = useState(filters.project_id ?? '');
    const [customer, setCustomer] = useState(filters.customer ?? '');

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    status,
                    type,
                    project_id: projectId,
                    customer,
                },
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    return (
        <AppLayout title="Project Quotations">
            <PageHeader
                eyebrow="Project"
                title="Project Quotations"
                actions={
                    <Link
                        href={create.url()}
                        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                    >
                        New Quotation
                    </Link>
                }
            />

            {/* Form Filter Responsif: 1 kolom di HP, 2 kolom di tablet (sm), 3 kolom di desktop sedang (lg), dan 6 kolom di layar lebar (xl) */}
            <form
                onSubmit={submitFilters}
                className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            >
                {/* Search input mengambil 2 span di layar medium agar lebih leluasa */}
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search quotation, project, desc..."
                        className={inputClass}
                    />
                </div>

                <div>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">All Status</option>
                        {options.statuses.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">All Types</option>
                        {options.types.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={projectId}
                        onChange={(event) => setProjectId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">All Projects</option>
                        {options.projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <input
                        value={customer}
                        onChange={(event) => setCustomer(event.target.value)}
                        placeholder="Customer"
                        className={inputClass}
                    />
                </div>

                {/* Tombol Apply membentang penuh di mobile, atau pas di desktop */}
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
                    <button
                        type="submit"
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        Apply Filter
                    </button>
                </div>
            </form>

            {/* Container Tabel dengan proteksi scroll horizontal */}
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr className="text-center">
                                <th className="whitespace-nowrap px-4 py-3">Date</th>
                                <th className="whitespace-nowrap px-4 py-3">Quotation No</th>
                                <th className="whitespace-nowrap px-4 py-3">Project</th>
                                <th className="whitespace-nowrap px-4 py-3">Customer</th>
                                <th className="whitespace-nowrap px-4 py-3">Type</th>
                                <th className="whitespace-nowrap px-4 py-3">Status</th>
                                <th className="whitespace-nowrap px-4 py-3">Grand Total</th>
                                <th className="whitespace-nowrap px-4 py-3">Updated By</th>
                                <th className="whitespace-nowrap px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {quotations.data.map((quotation) => (
                                <QuotationRow key={quotation.id} quotation={quotation} />
                            ))}
                            {quotations.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No project quotations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={quotations} />
            </section>
        </AppLayout>
    );
}

function QuotationRow({ quotation }: { quotation: ProjectQuotationSummary }) {
    return (
        <tr className="transition hover:bg-slate-50/80">
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {quotation.quotation_date ?? '-'}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
                <div className="font-semibold text-slate-900">{quotation.quotation_no}</div>
                <div className="text-xs text-slate-400">{quotation.updated_at ?? '-'}</div>
            </td>
            <td className="max-w-50 truncate px-4 py-3 text-slate-700" title={quotation.project?.name}>
                {quotation.project?.name ?? '-'}
            </td>
            <td className="max-w-45 truncate px-4 py-3 text-slate-700" title={quotation.customer_name}>
                {quotation.customer_name}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {quotation.quotation_type_label}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge quotation={quotation} />
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                {formatCurrency(quotation.grand_total)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {quotation.updated_by?.name ?? '-'}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={edit.url(quotation.id)}
                        className="rounded-md border gap-2 inline-flex border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        <SquarePen className="size-4" /> Edit
                    </Link>
                    <Link
                        href={printQuotation.url(quotation.id)}
                        target="_blank"
                        className="rounded-md gap-2 inline-flex border-primary bg-primary/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary"
                    >
                        <Printer className="size-4" /> Print
                    </Link>
                </div>
            </td>
        </tr>
    );
}

function StatusBadge({ quotation }: { quotation: ProjectQuotationSummary }) {
    const colors = {
        quotation: 'border-slate-200 bg-slate-100 text-slate-700',
        invoiced: 'border-blue-200 bg-blue-50 text-blue-700',
        paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    } satisfies Record<string, string>;

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                colors[quotation.status] ?? 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
        >
            {quotation.status_label}
        </span>
    );
}

function formatCurrency(value: string | number | null) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
}
