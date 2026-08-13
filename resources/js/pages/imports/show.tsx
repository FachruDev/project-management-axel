import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmFooter,
    ImportSummaryCards,
    PreviewTable,
    ValidationAlertList,
} from '@/components/import-preview';
import type {
    ImportPreviewPayload,
    ImportPreviewSheet,
    ImportSummary,
} from '@/components/import-preview';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';

type ImportBatch = {
    uuid: string;
    status: string;
    original_filename?: string | null;
    summary: ImportSummary;
    preview_payload: ImportPreviewPayload;
    error_payload: string[];
    created_at?: string | null;
    confirmed_at?: string | null;
    expires_at?: string | null;
};

type Props = {
    title: string;
    batch: ImportBatch;
    confirm_url: string;
    upload_url: string;
    back_url: string;
};

export default function ImportShow({
    title,
    batch,
    confirm_url,
    upload_url,
    back_url,
}: Props) {
    const [activeSheet, setActiveSheet] = useState(
        batch.preview_payload.sheets[0]?.name ?? '',
    );
    const flash = usePage().props.flash as
        | {
              success?: string | null;
              excel_error_title?: string | null;
              excel_errors?: string[] | null;
          }
        | undefined;
    const sheets = batch.preview_payload.sheets ?? [];
    const selectedSheet =
        sheets.find((sheet) => sheet.name === activeSheet) ?? sheets[0];
    const hasErrors =
        (batch.summary.errors ?? 0) > 0 || batch.error_payload.length > 0;
    const imported = batch.status === 'imported';

    return (
        <AppLayout title={`Import Preview - ${title}`}>
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Import Preview"
                    title={title}
                    description={`${batch.original_filename ?? 'Uploaded file'} - status: ${batch.status}`}
                    actions={
                        <Link
                            href={upload_url}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Upload Another File
                        </Link>
                    }
                />

                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {flash?.excel_error_title && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <div className="font-medium">
                            {flash.excel_error_title}
                        </div>
                        {flash.excel_errors && (
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {flash.excel_errors.map((error, index) => (
                                    <li key={`${error}-${index}`}>{error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <ImportSummaryCards summary={batch.summary} />
                <ValidationAlertList errors={batch.error_payload} />

                {sheets.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                        {sheets.map((sheet) => (
                            <button
                                key={sheet.name}
                                type="button"
                                onClick={() => setActiveSheet(sheet.name)}
                                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                                    selectedSheet?.name === sheet.name
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {sheet.name}
                            </button>
                        ))}
                    </div>
                )}

                {selectedSheet ? (
                    <PreviewTable sheet={selectedSheet as ImportPreviewSheet} />
                ) : (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        No preview data found.
                    </div>
                )}

                <ConfirmFooter
                    confirmUrl={confirm_url}
                    backUrl={back_url}
                    disabled={hasErrors}
                    imported={imported}
                />
            </div>
        </AppLayout>
    );
}
