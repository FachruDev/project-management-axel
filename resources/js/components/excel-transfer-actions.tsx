import { router } from '@inertiajs/react';
import { Download, FileText, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

type Props = {
    exportUrl: string;
    templateUrl: string;
    importUrl: string;
    guideUrl?: string;
};

const linkClass =
    'inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50';
const buttonClass =
    'inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

export function ExcelTransferActions({
    exportUrl,
    templateUrl,
    importUrl,
    guideUrl,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    function chooseFile() {
        inputRef.current?.click();
    }

    function importFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setImporting(true);

        router.post(
            importUrl,
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setImporting(false);
                    event.target.value = '';
                },
            },
        );
    }

    return (
        <>
            <a href={exportUrl} className={linkClass}>
                <Download className="size-4" />
                Export
            </a>
            <a href={templateUrl} className={linkClass}>
                <FileSpreadsheet className="size-4" />
                Template
            </a>
            {guideUrl && (
                <a href={guideUrl} className={linkClass}>
                    <FileText className="size-4" />
                    Guide PDF
                </a>
            )}
            <button
                type="button"
                onClick={chooseFile}
                disabled={importing}
                className={buttonClass}
            >
                <Upload className="size-4" />
                {importing ? 'Importing' : 'Import'}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={importFile}
                className="hidden"
            />
        </>
    );
}
