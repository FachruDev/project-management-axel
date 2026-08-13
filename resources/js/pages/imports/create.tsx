import { Link } from '@inertiajs/react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { ImportUploadPanel } from '@/components/import-preview';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';

type Props = {
    domain: string;
    title: string;
    preview_url: string;
    template_url: string;
    guide_url?: string | null;
    back_url: string;
};

const linkClass =
    'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50';

export default function ImportCreate({
    title,
    preview_url,
    template_url,
    guide_url,
    back_url,
}: Props) {
    return (
        <AppLayout title={`Import ${title}`}>
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Import Preview"
                    title={`Import ${title}`}
                    description="Upload an Excel file to validate rows before committing them to the database."
                    actions={
                        <>
                            <a href={template_url} className={linkClass}>
                                <FileSpreadsheet className="size-4" />
                                Download Template
                            </a>
                            {guide_url && (
                                <a href={guide_url} className={linkClass}>
                                    <Download className="size-4" />
                                    Guide PDF
                                </a>
                            )}
                            <Link href={back_url} className={linkClass}>
                                Back
                            </Link>
                        </>
                    }
                />
                <ImportUploadPanel previewUrl={preview_url} />
            </div>
        </AppLayout>
    );
}
