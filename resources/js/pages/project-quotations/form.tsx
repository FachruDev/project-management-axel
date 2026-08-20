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

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700 disabled:bg-slate-100 disabled:text-slate-500';

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
                    <>
                        <Link
                            href={index.url()}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                        >
                            Back
                        </Link>
                        {isEdit && quotation.id !== null && (
                            <Link
                                href={printQuotation.url(quotation.id)}
                                target="_blank"
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                            >
                                Print
                            </Link>
                        )}
                    </>
                }
            />

            {flash?.success && (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {flash.success}
                </section>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-semibold text-slate-950">
                            Header Information
                        </h2>
                        {quotation.quotation_no && (
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                                {quotation.quotation_no}
                            </span>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                        <Field
                            label="Type"
                            error={errorFor(form.errors, 'quotation_type')}
                            required
                        >
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
                        <Field
                            label="Quotation Date"
                            error={errorFor(form.errors, 'quotation_date')}
                            required
                        >
                            <input
                                type="date"
                                value={form.data.quotation_date ?? ''}
                                onChange={(event) =>
                                    form.setData('quotation_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Status" error={errorFor(form.errors, 'status')} required>
                            <select
                                value={form.data.status}
                                onChange={(event) =>
                                    form.setData(
                                        'status',
                                        event.target.value as ProjectQuotationFormPayload['status'],
                                    )
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
                        <Field
                            label="Customer"
                            error={errorFor(form.errors, 'customer_name')}
                            required
                        >
                            <input
                                value={form.data.customer_name}
                                onChange={(event) =>
                                    form.setData('customer_name', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Customer Identifier" error={errorFor(form.errors, 'customer_identifier')}>
                            <input
                                value={form.data.customer_identifier}
                                onChange={(event) =>
                                    form.setData('customer_identifier', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Term Of Payment" error={errorFor(form.errors, 'term_of_payment_date')}>
                            <input
                                type="date"
                                value={form.data.term_of_payment_date ?? ''}
                                onChange={(event) =>
                                    form.setData('term_of_payment_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Valid Until" error={errorFor(form.errors, 'valid_until_date')}>
                            <input
                                type="date"
                                value={form.data.valid_until_date ?? ''}
                                onChange={(event) =>
                                    form.setData('valid_until_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <Field
                            label="Customer Address"
                            error={errorFor(form.errors, 'customer_address')}
                        >
                            <textarea
                                value={form.data.customer_address}
                                onChange={(event) =>
                                    form.setData('customer_address', event.target.value)
                                }
                                className={`${inputClass} min-h-24`}
                            />
                        </Field>
                        <div className="grid gap-4">
                            <Field label="CC" error={errorFor(form.errors, 'cc')}>
                                <input
                                    value={form.data.cc}
                                    onChange={(event) => form.setData('cc', event.target.value)}
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="QR Target URL" error={errorFor(form.errors, 'qr_target_url')}>
                                <input
                                    value={form.data.qr_target_url}
                                    onChange={(event) =>
                                        form.setData('qr_target_url', event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-950">
                                Quotation Items
                            </h2>
                            <p className="text-xs text-slate-500">Category: {category}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => addItems(1)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            >
                                Add Item
                            </button>
                            <button
                                type="button"
                                onClick={() => addItems(5)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            >
                                Add 5 Items
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">Description</th>
                                    <th className="w-32 px-3 py-2">Unit</th>
                                    <th className="w-28 px-3 py-2">Qty</th>
                                    <th className="w-40 px-3 py-2">Unit Price</th>
                                    <th className="w-28 px-3 py-2">Disc %</th>
                                    <th className="w-40 px-3 py-2">Manual Amount</th>
                                    <th className="w-24 px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {form.data.items.map((item, itemIndex) => (
                                    <tr key={itemIndex}>
                                        <td className="px-3 py-3 align-top">
                                            <textarea
                                                value={item.description}
                                                onChange={(event) =>
                                                    updateItem(
                                                        itemIndex,
                                                        'description',
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${inputClass} min-h-20 w-full`}
                                            />
                                            <FieldError error={errorFor(form.errors, `items.${itemIndex}.description`)} />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <select
                                                value={item.unit}
                                                onChange={(event) =>
                                                    updateItem(itemIndex, 'unit', event.target.value)
                                                }
                                                className={`${inputClass} w-full`}
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
                                                onChange={(event) =>
                                                    updateItem(itemIndex, 'qty', event.target.value)
                                                }
                                                className={`${inputClass} w-full`}
                                                inputMode="decimal"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.unit_price ?? ''}
                                                onChange={(event) =>
                                                    updateItem(
                                                        itemIndex,
                                                        'unit_price',
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${inputClass} w-full`}
                                                inputMode="decimal"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.discount ?? ''}
                                                onChange={(event) =>
                                                    updateItem(
                                                        itemIndex,
                                                        'discount',
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${inputClass} w-full`}
                                                inputMode="decimal"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input
                                                value={item.amount ?? ''}
                                                onChange={(event) =>
                                                    updateItem(
                                                        itemIndex,
                                                        'amount',
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${inputClass} w-full`}
                                                inputMode="decimal"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(itemIndex)}
                                                disabled={form.data.items.length === 1}
                                                className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-300"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <FieldError error={errorFor(form.errors, 'items')} />
                </section>

                <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h2 className="mb-4 text-base font-semibold text-slate-950">
                            Notes And Signature
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Prepared By" error={errorFor(form.errors, 'prepared_by_name')}>
                                <input
                                    value={form.data.prepared_by_name}
                                    onChange={(event) =>
                                        form.setData('prepared_by_name', event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Approved By" error={errorFor(form.errors, 'approved_by_name')}>
                                <input
                                    value={form.data.approved_by_name}
                                    onChange={(event) =>
                                        form.setData('approved_by_name', event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                        <div className="mt-4 grid gap-4">
                            <Field label="Description" error={errorFor(form.errors, 'description')}>
                                <textarea
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData('description', event.target.value)
                                    }
                                    className={`${inputClass} min-h-24`}
                                />
                            </Field>
                            <Field label="Note" error={errorFor(form.errors, 'note')}>
                                <textarea
                                    value={form.data.note}
                                    onChange={(event) => form.setData('note', event.target.value)}
                                    className={`${inputClass} min-h-24`}
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h2 className="mb-4 text-base font-semibold text-slate-950">
                            Summary Preview
                        </h2>
                        <Field label="PPN/PPH Percent" error={errorFor(form.errors, 'ppn_pph_percent')}>
                            <input
                                value={form.data.ppn_pph_percent}
                                onChange={(event) =>
                                    form.setData('ppn_pph_percent', event.target.value)
                                }
                                className={inputClass}
                                inputMode="decimal"
                            />
                        </Field>
                        <dl className="mt-4 space-y-3 text-sm">
                            <SummaryRow label="Subtotal" value={formatCurrency(preview.subtotal)} />
                            <SummaryRow label="Tax" value={formatCurrency(preview.tax)} />
                            <SummaryRow
                                label="Grand Total"
                                value={formatCurrency(preview.grandTotal)}
                                strong
                            />
                        </dl>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
                        >
                            {form.processing ? 'Saving...' : 'Save Quotation'}
                        </button>
                    </div>
                </section>
            </form>
        </AppLayout>
    );
}

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
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            <span>
                {label}
                {required && <span className="text-red-600"> *</span>}
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

    return <span className="text-xs font-medium text-red-600">{error}</span>;
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
            className={`flex items-center justify-between border-t border-slate-100 pt-3 ${
                strong ? 'font-semibold text-slate-950' : 'text-slate-600'
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
