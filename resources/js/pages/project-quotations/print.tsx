import { Head, Link } from '@inertiajs/react';
import { edit, index } from '@/actions/App/Http/Controllers/ProjectQuotationController';
import type { ProjectQuotationPrintProps } from '@/types';

export default function ProjectQuotationPrint({ quotation }: ProjectQuotationPrintProps) {
    return (
        <>
            <Head title={`Print ${quotation.quotation_no}`} />
            <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
                <div className="mx-auto mb-4 flex max-w-[210mm] justify-between gap-3 print:hidden">
                    <div className="flex gap-2">
                        <Link
                            href={index.url()}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Back
                        </Link>
                        <Link
                            href={edit.url(quotation.id)}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Edit
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        Print
                    </button>
                </div>

                <main className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-10 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
                    <header className="border-b-2 border-slate-900 pb-4">
                        <div className="flex items-start justify-between gap-8">
                            <div>
                                <h1 className="text-2xl font-bold tracking-normal">
                                    PT Axel Teknologi Indonesia
                                </h1>
                                <p className="mt-1 text-sm text-slate-600">
                                    Information Technology Solution & Services
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold">QUOTATION</div>
                                <div className="mt-1 text-sm font-semibold text-slate-700">
                                    {quotation.quotation_no}
                                </div>
                            </div>
                        </div>
                    </header>

                    <section className="mt-6 grid grid-cols-[1fr_220px] gap-8 text-sm">
                        <div>
                            <div className="text-xs font-semibold uppercase text-slate-500">
                                Customer
                            </div>
                            <div className="mt-2 font-semibold">{quotation.customer_name}</div>
                            {quotation.customer_identifier && (
                                <div className="text-slate-600">
                                    {quotation.customer_identifier}
                                </div>
                            )}
                            <div className="mt-2 whitespace-pre-line text-slate-600">
                                {quotation.customer_address ?? '-'}
                            </div>
                            {quotation.cc && (
                                <div className="mt-2 text-slate-600">CC: {quotation.cc}</div>
                            )}
                        </div>
                        <dl className="space-y-2">
                            <MetaRow label="Date" value={quotation.quotation_date ?? '-'} />
                            <MetaRow label="Type" value={quotation.quotation_type_label} />
                            <MetaRow
                                label="Payment"
                                value={quotation.term_of_payment_date ?? '-'}
                            />
                            <MetaRow label="Valid Until" value={quotation.valid_until_date ?? '-'} />
                            <MetaRow label="Status" value={quotation.status_label} />
                        </dl>
                    </section>

                    {quotation.description && (
                        <section className="mt-6 rounded-md border border-slate-200 p-4 text-sm">
                            <div className="text-xs font-semibold uppercase text-slate-500">
                                Description
                            </div>
                            <div className="mt-2 whitespace-pre-line text-slate-700">
                                {quotation.description}
                            </div>
                        </section>
                    )}

                    <section className="mt-6">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-900 text-left text-xs font-semibold uppercase text-white">
                                    <th className="border border-slate-900 px-3 py-2">No</th>
                                    <th className="border border-slate-900 px-3 py-2">
                                        Description
                                    </th>
                                    <th className="border border-slate-900 px-3 py-2">Unit</th>
                                    <th className="border border-slate-900 px-3 py-2 text-right">
                                        Qty
                                    </th>
                                    <th className="border border-slate-900 px-3 py-2 text-right">
                                        Unit Price
                                    </th>
                                    <th className="border border-slate-900 px-3 py-2 text-right">
                                        Disc %
                                    </th>
                                    <th className="border border-slate-900 px-3 py-2 text-right">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((item) => (
                                    <tr key={item.id} className="align-top">
                                        <td className="border border-slate-300 px-3 py-2">
                                            {item.sort_order}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-2">
                                            <div className="whitespace-pre-line">
                                                {item.description}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {item.category}
                                            </div>
                                        </td>
                                        <td className="border border-slate-300 px-3 py-2">
                                            {item.unit}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-2 text-right">
                                            {formatDecimal(item.qty)}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-2 text-right">
                                            {formatCurrency(item.unit_price)}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-2 text-right">
                                            {formatDecimal(item.discount_percent)}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section className="mt-6 grid grid-cols-[1fr_280px] gap-8">
                        <div className="text-sm">
                            <div className="text-xs font-semibold uppercase text-slate-500">
                                Note
                            </div>
                            <div className="mt-2 min-h-20 whitespace-pre-line text-slate-700">
                                {quotation.note ?? '-'}
                            </div>
                            {quotation.qr_code_url && (
                                <div className="mt-6 flex items-center gap-3">
                                    <img
                                        src={quotation.qr_code_url}
                                        alt="Quotation QR"
                                        className="h-20 w-20"
                                    />
                                    <div className="text-xs text-slate-500">
                                        {quotation.qr_target_url}
                                    </div>
                                </div>
                            )}
                        </div>
                        <dl className="space-y-2 text-sm">
                            <TotalRow label="Subtotal" value={formatCurrency(quotation.subtotal)} />
                            <TotalRow
                                label={`PPN/PPH ${formatDecimal(quotation.ppn_pph_percent)}%`}
                                value={formatCurrency(quotation.tax_amount)}
                            />
                            <TotalRow
                                label="Grand Total"
                                value={formatCurrency(quotation.grand_total)}
                                strong
                            />
                        </dl>
                    </section>

                    <section className="mt-12 grid grid-cols-2 gap-10 text-center text-sm">
                        <Signature title="Prepared By" name={quotation.prepared_by_name} />
                        <Signature title="Approved By" name={quotation.approved_by_name} />
                    </section>
                </main>
            </div>
        </>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 border-b border-slate-100 pb-1">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-800">{value}</dd>
        </div>
    );
}

function TotalRow({
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
            className={`flex justify-between gap-4 border-b border-slate-200 pb-2 ${
                strong ? 'text-base font-bold text-slate-950' : 'text-slate-700'
            }`}
        >
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function Signature({ title, name }: { title: string; name: string | null }) {
    return (
        <div>
            <div className="font-medium">{title}</div>
            <div className="mt-20 border-t border-slate-400 pt-2 font-semibold">
                {name ?? ''}
            </div>
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

function formatDecimal(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    return new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 4,
    }).format(Number(value));
}
