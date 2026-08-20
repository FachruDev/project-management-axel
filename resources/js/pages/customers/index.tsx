import { router, useForm, usePage } from '@inertiajs/react';
import { Trash2, SquarePen, CirclePlus } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/CustomerController';
import {
    exportMethod as exportCustomers,
    template as customerTemplate,
} from '@/actions/App/Http/Controllers/CustomerExcelController';
import { create as importCreate } from '@/actions/App/Http/Controllers/ImportPreviewController';
import { ExcelTransferActions } from '@/components/excel-transfer-actions';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { CustomerSummary, MasterDataFilters, Paginated } from '@/types';

type Props = {
    customers: Paginated<CustomerSummary>;
    filters: MasterDataFilters;
};

type CustomerPayload = {
    name: string;
    email: string;
    company_name: string;
    company_address: string;
    is_active: boolean;
};

const blankCustomer: CustomerPayload = {
    name: '',
    email: '',
    company_name: '',
    company_address: '',
    is_active: true,
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function CustomerIndex({ customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [editing, setEditing] = useState<CustomerSummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const flash = usePage().props.flash as
        | {
              success?: string | null;
              excel_error_title?: string | null;
              excel_errors?: string[] | null;
          }
        | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;

    const form = useForm<CustomerPayload>(blankCustomer);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    status,
                },
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function openCreate() {
        setEditing(null);
        form.clearErrors();
        form.setData(blankCustomer);
        setModalOpen(true);
    }

    function openEdit(customer: CustomerSummary) {
        setEditing(customer);
        form.clearErrors();
        form.setData({
            name: customer.name,
            email: customer.email ?? '',
            company_name: customer.company_name ?? '',
            company_address: customer.company_address ?? '',
            is_active: customer.is_active,
        });
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        form.clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeModal,
        };

        if (editing) {
            form.put(update.url(editing.id), options);

            return;
        }

        form.post(store.url(), options);
    }

    function deleteCustomer(customer: CustomerSummary) {
        if (!window.confirm('Delete this customer?')) {
            return;
        }

        router.delete(destroy.url(customer.id), {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout title="Customers">
            <PageHeader
                eyebrow="Master Data"
                title="Customers"
                actions={
                    <>
                        <ExcelTransferActions
                            exportUrl={exportCustomers.url()}
                            templateUrl={customerTemplate.url()}
                            importUrl={importCreate.url('customers')}
                        />
                        <button
                            type="button"
                            onClick={openCreate}
                            className="rounded-md gap-2 inline-flex bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                            <CirclePlus className="size-5" /> New Customer
                        </button>
                    </>
                }
            />

            {flash?.success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {errors?.customer && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.customer}
                </div>
            )}
            {flash?.excel_errors && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p className="font-medium">
                        {flash.excel_error_title ?? 'Excel process failed'}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {flash.excel_errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search customer, email, company"
                    className={inputClass}
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
                            <tr className="text-center">
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3">Projects</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {customers.data.map((customer) => (
                                <tr key={customer.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {customer.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {customer.email ?? '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div>{customer.company_name ?? '-'}</div>
                                        <div className="max-w-md truncate text-xs">
                                            {customer.company_address ?? '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {customer.projects_count}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge active={customer.is_active} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(customer)}
                                                className="rounded-md gap-2 inline-flex border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                <SquarePen className="size-4" /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteCustomer(customer)}
                                                className="rounded-md gap-2 inline-flex border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="size-4" /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {customers.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No customers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={customers} />
            </section>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Customer' : 'New Customer'}
                onClose={closeModal}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Name" error={form.errors.name} required>
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Email" error={form.errors.email}>
                        <input
                            type="email"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Company Name" error={form.errors.company_name}>
                        <input
                            value={form.data.company_name}
                            onChange={(event) => form.setData('company_name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Company Address" error={form.errors.company_address}>
                        <textarea
                            value={form.data.company_address}
                            onChange={(event) => form.setData('company_address', event.target.value)}
                            className={`${inputClass} min-h-24`}
                        />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData('is_active', event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Active *
                    </label>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
                        >
                            {form.processing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}

function Field({
    label,
    error,
    children,
    required = false,
}: {
    label: string;
    error?: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
                {label}
                {required && <span className="text-red-600"> *</span>}
            </span>
            {children}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </label>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
        >
            {active ? 'active' : 'inactive'}
        </span>
    );
}
