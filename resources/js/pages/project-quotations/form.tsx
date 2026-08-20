import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import {
    index,
    print as printQuotation,
    store,
    update,
} from '@/actions/App/Http/Controllers/ProjectQuotationController';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type {
    ProjectQuotationFormPayload,
    ProjectQuotationFormProps,
    ProjectQuotationItemForm,
    ProjectQuotationType,
} from '@/types';

// Standar input yang bersih dan responsif
const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-slate-700 focus:ring-1 focus:ring-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

export default function ProjectQuotationForm({
    mode,
    quotation,
    options,
}: ProjectQuotationFormProps) {
    const isEdit = mode === 'edit';
    const pageTitle = isEdit ? 'Edit Project Quotation' : 'New Project Quotation';
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const form = useForm<ProjectQuotationFormPayload>({
        ...quotation,
        items: quotation.items.length > 0 ? quotation.items : [emptyItem()],
    });
    const preview = calculatePreview(form.data.items, form.data.ppn_pph_percent);
    const category =
        options.types.find((option) => option.value === form.data.quotation_type)?.category ??
        'project';

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isEdit && quotation.id !== null) {
            form.put(update.url(quotation.id));

            return;
        }

        form.post(store.url());
    }

    function changeProject(projectId: string) {
        const project = options.projects.find((option) => String(option.id) === projectId);

        form.setData((data) => ({
            ...data,
            project_id: projectId,
            customer_name: project?.customer_name ?? data.customer_name,
            customer_address: project?.customer_address ?? data.customer_address,
            customer_identifier: project?.customer_identifier ?? data.customer_identifier,
        }));
    }

    function changeType(type: ProjectQuotationType) {
        form.setData('quotation_type', type);
    }

    function updateItem(index: number, key: keyof ProjectQuotationItemForm, value: string) {
        const items = [...form.data.items];
        items[index] = { ...items[index], [key]: value };
        form.setData('items', items);
    }

    function addItems(count: number) {
        form.setData('items', [
            ...form.data.items,
            ...Array.from({ length: count }, () => emptyItem()),
        ]);
    }

    function removeItem(index: number) {
        if (form.data.items.length === 1) {
            return;
        }

        form.setData(
            'items',
            form.data.items.filter((_, itemIndex) => itemIndex !== index),
        );
    }

    return (
        <AppLayout title={pageTitle}>
            <PageHeader
                eyebrow="Project"
                title={pageTitle}
                actions={
                    <div className="flex gap-2">
                        <Link
                            href={index.url()}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Back
                        </Link>
                        {isEdit && quotation.id !== null && (
                            <Link
                                href={printQuotation.url(quotation.id)}
                                target="_blank"
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Print
                            </Link>
                        )}
                    </div>
                }
            />

            {flash?.success && (
                <section className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                    {flash.success}
                </section>
            )}

            {/* Wrapper Utama Form: Flex Column lurus ke bawah */}
            <form onSubmit={submit} className="flex max-w-7xl flex-col gap-6">

                {/* 1. SECTION: Header Information */}
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Header Information
                        </h2>
                        {quotation.quotation_no && (
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-700">
                                {quotation.quotation_no}
                            </span>
                        )}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Project" error={errorFor(form.errors, 'project_id')} required>
                            <select
                                value={form.data.project_id}
                                onChange={(event) => changeProject(event.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select approved project</option>
                                {options.projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Type" error={errorFor(form.errors, 'quotation_type')} required>
                            <select
                                value={form.data.quotation_type}
                                onChange={(event) =>
                                    changeType(event.target.value as ProjectQuotationType)
                                }
                                className={inputClass}
                            >
                                {options.types.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Quotation Date" error={errorFor(form.errors, 'quotation_date')} required>
                            <input
                                type="date"
                                value={form.data.quotation_date ?? ''}
                                onChange={(event) => form.setData('quotation_date', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Status" error={errorFor(form.errors, 'status')} required>
                            <select
                                value={form.data.status}
                                onChange={(event) =>
                                    form.setData('status', event.target.value as ProjectQuotationFormPayload['status'])
                                }
                                className={inputClass}
                            >
                                {options.statuses.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="sm:col-span-2">
                            <Field label="Customer" error={errorFor(form.errors, 'customer_name')} required>
                                <input
                                    value={form.data.customer_name}
                                    onChange={(event) => form.setData('customer_name', event.target.value)}
                                    className={inputClass}
                                    placeholder="Enter customer name"
                                />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Customer Identifier" error={errorFor(form.errors, 'customer_identifier')}>
                                <input
                                    value={form.data.customer_identifier}
                                    onChange={(event) => form.setData('customer_identifier', event.target.value)}
                                    className={inputClass}
                                    placeholder="e.g. Tax ID or Company Reg No"
                                />
                            </Field>
                        </div>

                        <Field label="Term Of Payment" error={errorFor(form.errors, 'term_of_payment_date')}>
                            <input
                                type="date"
                                value={form.data.term_of_payment_date ?? ''}
                                onChange={(event) => form.setData('term_of_payment_date', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Valid Until" error={errorFor(form.errors, 'valid_until_date')}>
                            <input
                                type="date"
                                value={form.data.valid_until_date ?? ''}
                                onChange={(event) => form.setData('valid_until_date', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <Field label="Customer Address" error={errorFor(form.errors, 'customer_address')}>
                            <textarea
                                value={form.data.customer_address}
                                onChange={(event) => form.setData('customer_address', event.target.value)}
                                className={`${inputClass} min-h-29 resize-none`}
                                placeholder="Full customer address..."
                            />
                        </Field>
                        <div className="grid gap-4">
                            <Field label="CC (Carbon Copy)" error={errorFor(form.errors, 'cc')}>
                                <input
                                    value={form.data.cc}
                                    onChange={(event) => form.setData('cc', event.target.value)}
                                    className={inputClass}
                                    placeholder="email1@test.com, email2@test.com"
                                />
                            </Field>
                            <Field label="QR Target URL" error={errorFor(form.errors, 'qr_target_url')}>
                                <input
                                    value={form.data.qr_target_url}
                                    onChange={(event) => form.setData('qr_target_url', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://"
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                {/* 2. SECTION: Quotation Items (Table Layout) */}
                <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Quotation Items</h2>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                                Category: {category}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => addItems(1)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                + Add Item
                            </button>
                            <button
                                type="button"
                                onClick={() => addItems(5)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                + Add 5 Items
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto p-5 pt-0">
                        {/* Tabel dengan min-width untuk mencegah kolom menyempit berlebihan */}
                        <table className="mt-4 min-w-225 w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600 rounded-t-md">
                                <tr className="text-center">
                                    <th className="px-3 py-3 w-12 rounded-tl-md">#</th>
                                    <th className="px-3 py-3 min-w-62.5">Description</th>
                                    <th className="px-3 py-3 w-32">Unit</th>
                                    <th className="px-3 py-3 w-28">Qty</th>
                                    <th className="px-3 py-3 w-36">Unit Price</th>
                                    <th className="px-3 py-3 w-24">Disc %</th>
                                    <th className="px-3 py-3 w-40">Manual Amount</th>
                                    <th className="px-3 py-3 w-16 rounded-tr-md"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {form.data.items.map((item, itemIndex) => (
                                    <tr key={itemIndex} className="group hover:bg-slate-50/50">
                                        <td className="px-3 py-3 align-top text-center text-slate-400 font-medium pt-5">
                                            {itemIndex + 1}
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.description}
                                                onChange={(event) => updateItem(itemIndex, 'description', event.target.value)}
                                                className={inputClass}
                                                maxLength={255}
                                                placeholder="Item description..."
                                            />
                                            <div className="mt-1">
                                                <FieldError error={errorFor(form.errors, `items.${itemIndex}.description`)} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <select
                                                value={item.unit}
                                                onChange={(event) => updateItem(itemIndex, 'unit', event.target.value)}
                                                className={inputClass}
                                            >
                                                {options.units.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.qty ?? ''}
                                                onChange={(event) => updateItem(itemIndex, 'qty', event.target.value)}
                                                className={inputClass}
                                                inputMode="decimal"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.unit_price ?? ''}
                                                onChange={(event) => updateItem(itemIndex, 'unit_price', event.target.value)}
                                                className={inputClass}
                                                inputMode="decimal"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.discount ?? ''}
                                                onChange={(event) => updateItem(itemIndex, 'discount', event.target.value)}
                                                className={inputClass}
                                                inputMode="decimal"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.amount ?? ''}
                                                onChange={(event) => updateItem(itemIndex, 'amount', event.target.value)}
                                                className={inputClass}
                                                inputMode="decimal"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-center pt-4">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(itemIndex)}
                                                disabled={form.data.items.length === 1}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
                                                title="Remove item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 pb-5">
                        <FieldError error={errorFor(form.errors, 'items')} />
                    </div>
                </section>

                {/* 3. SECTION: Bottom Area (Notes/Signatures + Summary Preview) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Kiri: Notes & Signatures */}
                    <section className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">
                            Notes & Signature
                        </h2>
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="Prepared By" error={errorFor(form.errors, 'prepared_by_name')}>
                                <input
                                    value={form.data.prepared_by_name}
                                    onChange={(event) => form.setData('prepared_by_name', event.target.value)}
                                    className={inputClass}
                                    placeholder="Name of preparer"
                                />
                            </Field>
                            <Field label="Approved By" error={errorFor(form.errors, 'approved_by_name')}>
                                <input
                                    value={form.data.approved_by_name}
                                    onChange={(event) => form.setData('approved_by_name', event.target.value)}
                                    className={inputClass}
                                    placeholder="Name of approver"
                                />
                            </Field>
                        </div>
                        <div className="grid gap-5">
                            <Field label="Description (Internal)" error={errorFor(form.errors, 'description')}>
                                <textarea
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                    className={`${inputClass} min-h-20`}
                                    placeholder="Internal notes..."
                                />
                            </Field>
                            <Field label="Note (For Customer)" error={errorFor(form.errors, 'note')}>
                                <textarea
                                    value={form.data.note}
                                    onChange={(event) => form.setData('note', event.target.value)}
                                    className={`${inputClass} min-h-20`}
                                    placeholder="Notes visible to customer..."
                                />
                            </Field>
                        </div>
                    </section>

                    {/* Kanan: Summary Preview */}
                    <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-5">
                                Summary Preview
                            </h2>

                            <div className="mb-6 flex flex-col gap-3">
                                <Field label="PPN/PPH Percent (%)" error={errorFor(form.errors, 'ppn_pph_percent')}>
                                    <input
                                        value={form.data.ppn_pph_percent}
                                        onChange={(event) => form.setData('ppn_pph_percent', event.target.value)}
                                        className={`${inputClass} w-1/2 min-w-37.5 font-medium bg-white`}
                                        inputMode="decimal"
                                        placeholder="0"
                                    />
                                </Field>
                            </div>

                            <dl className="space-y-4 text-sm">
                                <SummaryRow label="Subtotal" value={formatCurrency(preview.subtotal)} />
                                <SummaryRow label="Tax Amount" value={formatCurrency(preview.tax)} />
                                <div className="border-t border-dashed border-slate-300 pt-3">
                                    <SummaryRow
                                        label="Grand Total"
                                        value={formatCurrency(preview.grandTotal)}
                                        strong
                                    />
                                </div>
                            </dl>
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="mt-8 flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:bg-slate-400"
                        >
                            {form.processing ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                'Save Quotation'
                            )}
                        </button>
                    </section>

                </div>
            </form>
        </AppLayout>
    );
}

// ... [Sisa fungsi pembantu (Field, FieldError, SummaryRow, calculatePreview, dll) tidak ada perubahan dan sama persis dengan sebelumnya] ...

function Field({
    label,
    error,
    required = false,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            {children}
            <FieldError error={error} />
        </label>
    );
}

function FieldError({ error }: { error?: string }) {
    if (!error) {
        return null;
    }

    return <span className="text-xs font-medium text-red-500">{error}</span>;
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between ${
                strong ? 'text-xl font-bold text-slate-900' : 'font-medium text-slate-600'
            }`}
        >
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function emptyItem(): ProjectQuotationItemForm {
    return {
        unit: 'mandays',
        description: '',
        qty: '',
        unit_price: '',
        discount: '0',
        amount: '',
    };
}

function calculatePreview(items: ProjectQuotationItemForm[], taxPercent: string | number) {
    const subtotal = items.reduce((total, item) => total + itemAmount(item), 0);
    const tax = round(subtotal * parseNumber(taxPercent) / 100);

    return {
        subtotal: round(subtotal),
        tax,
        grandTotal: round(subtotal + tax),
    };
}

function itemAmount(item: ProjectQuotationItemForm) {
    const qty = nullableNumber(item.qty);
    const unitPrice = nullableNumber(item.unit_price);
    const discount = parseNumber(item.discount);

    if (qty !== null && unitPrice !== null) {
        const base = qty * unitPrice;

        return round(base - base * discount / 100);
    }

    return round(parseNumber(item.amount));
}

function nullableNumber(value: string | number | null) {
    if (value === null || value === '') {
        return null;
    }

    return parseNumber(value);
}

function parseNumber(value: string | number | null) {
    if (value === null || value === '') {
        return 0;
    }

    return Number(String(value).replace('%', '').replace(',', '.')) || 0;
}

function round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

function errorFor(errors: Record<string, string | undefined>, key: string) {
    return errors[key];
}
