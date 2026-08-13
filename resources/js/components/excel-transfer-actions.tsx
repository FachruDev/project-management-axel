import { Link } from '@inertiajs/react';
import { Download, FileText, FileSpreadsheet, Upload } from 'lucide-react';

type Props = {
    exportUrl: string;
    templateUrl: string;
    importUrl: string;
    guideUrl?: string;
};

const linkClass =
    'inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50';

export function ExcelTransferActions({
    exportUrl,
    templateUrl,
    importUrl,
    guideUrl,
}: Props) {
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
            <Link href={importUrl} className={linkClass}>
                <Upload className="size-4" />
                Import
            </Link>
        </>
    );
}
