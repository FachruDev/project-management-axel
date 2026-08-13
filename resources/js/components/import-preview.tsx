import { Link, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, FileUp, RotateCcw } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

export type ImportPreviewRow = {
    row: number;
    action: string;
    status: 'valid' | 'error' | string;
    key?: string | null;
    values: Record<string, unknown>;
    errors: string[];
};

export type ImportPreviewSheet = {
    name: string;
    columns: string[];
    rows: ImportPreviewRow[];
};

export type ImportPreviewPayload = {
    kind: 'table' | 'workbook';
    sheets: ImportPreviewSheet[];
};

export type ImportSummary = {
    total?: number;
    valid?: number;
    errors?: number;
    creates?: number;
    updates?: number;
    skips?: number;
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export function ImportUploadPanel({
    previewUrl,
}: {
    previewUrl: string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!file) {
            return;
        }

        setProcessing(true);
        router.post(
            previewUrl,
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <form
            onSubmit={submit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <label className="flex flex-1 flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-700">
                        Excel file
                    </span>
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(event) =>
                            setFile(event.target.files?.[0] ?? null)
                        }
                        className={inputClass}
                    />
                    <span className="text-xs text-slate-500">
                        Upload the latest template format. The data will be
                        previewed first and will not be saved yet.
                    </span>
                </label>
                <button
                    type="submit"
                    disabled={!file || processing}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    <FileUp className="size-4" />
                    {processing ? 'Checking...' : 'Preview Import'}
                </button>
            </div>
        </form>
    );
}

export function ImportSummaryCards({ summary }: { summary: ImportSummary }) {
    const items = [
        ['Rows', summary.total ?? 0],
        ['Valid', summary.valid ?? 0],
        ['Errors', summary.errors ?? 0],
        ['Create', summary.creates ?? 0],
        ['Update', summary.updates ?? 0],
        ['Sync/Skip', summary.skips ?? 0],
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {items.map(([label, value]) => (
                <div
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
                >
                    <div className="text-xs font-medium uppercase text-slate-500">
                        {label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-slate-950">
                        {value}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ValidationAlertList({ errors }: { errors: string[] }) {
    if (errors.length === 0) {
        return (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>No validation errors found. You can confirm the import.</span>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                Validation errors
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.slice(0, 30).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                ))}
            </ul>
            {errors.length > 30 && (
                <p className="mt-2 text-xs">
                    Showing 30 of {errors.length} errors. Fix the file and
                    upload it again.
                </p>
            )}
        </div>
    );
}

export function PreviewTable({ sheet }: { sheet: ImportPreviewSheet }) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                        <tr>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Action</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Key</th>
                            {sheet.columns.slice(0, 8).map((column) => (
                                <th key={column} className="px-3 py-2 text-left">
                                    {column}
                                </th>
                            ))}
                            <th className="px-3 py-2 text-left">Errors</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sheet.rows.map((row) => (
                            <tr key={`${sheet.name}-${row.row}`}>
                                <td className="px-3 py-2 text-slate-700">
                                    {row.row}
                                </td>
                                <td className="px-3 py-2">
                                    <Badge>{row.action}</Badge>
                                </td>
                                <td className="px-3 py-2">
                                    <StatusBadge status={row.status} />
                                </td>
                                <td className="max-w-52 truncate px-3 py-2 text-slate-700">
                                    {row.key ?? '-'}
                                </td>
                                {sheet.columns.slice(0, 8).map((column) => (
                                    <td
                                        key={`${row.row}-${column}`}
                                        className="max-w-52 truncate px-3 py-2 text-slate-600"
                                    >
                                        {formatCell(row.values[column])}
                                    </td>
                                ))}
                                <td className="min-w-72 px-3 py-2 text-xs text-red-700">
                                    {row.errors.length > 0
                                        ? row.errors.join(' ')
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                        {sheet.rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={sheet.columns.length + 5}
                                    className="px-3 py-8 text-center text-slate-500"
                                >
                                    No rows found in this sheet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function ConfirmFooter({
    confirmUrl,
    backUrl,
    disabled,
    imported,
}: {
    confirmUrl: string;
    backUrl: string;
    disabled: boolean;
    imported: boolean;
}) {
    const [processing, setProcessing] = useState(false);

    function confirm() {
        setProcessing(true);
        router.post(
            confirmUrl,
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/95 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
                href={backUrl}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                <RotateCcw className="size-4" />
                Back
            </Link>
            <button
                type="button"
                onClick={confirm}
                disabled={disabled || imported || processing}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
                {imported
                    ? 'Imported'
                    : processing
                      ? 'Importing...'
                      : 'Confirm Import'}
            </button>
        </div>
    );
}

function Badge({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
            {children}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const valid = status === 'valid';

    return (
        <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            {status}
        </span>
    );
}

function formatCell(value: unknown) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    return String(value);
}
