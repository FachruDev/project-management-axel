import { useForm } from '@inertiajs/react';
import { UploadCloud } from 'lucide-react';
import type { FormEvent } from 'react';

import projectBast from '@/actions/App/Http/Controllers/ProjectBastController';
import { Modal } from '@/components/modal';

type BastProject = {
    id: number;
    name: string;
};

type BastForm = {
    bast_date: string;
    bast_file: File | null;
};

type Props = {
    open: boolean;
    project: BastProject | null;
    onClose: () => void;
};

const inputClass =
    'h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const fileInputClass =
    'block w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-primary/50';

export function ProjectBastModal({ open, project, onClose }: Props) {
    const form = useForm<BastForm>({
        bast_date: '',
        bast_file: null,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!project) {
            return;
        }

        form.transform((data) => ({ ...data, _method: 'PATCH' }));
        form.post(projectBast.url(project.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    }

    return (
        <Modal
            open={open}
            title={project ? `Upload BAST - ${project.name}` : 'Upload BAST'}
            onClose={onClose}
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                        BAST Date
                    </label>
                    <input
                        type="date"
                        value={form.data.bast_date}
                        onChange={(event) =>
                            form.setData('bast_date', event.target.value)
                        }
                        className={`${inputClass} w-full`}
                    />
                    {form.errors.bast_date && (
                        <p className="text-xs font-medium text-red-600">
                            {form.errors.bast_date}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                        BAST File
                    </label>
                    <input
                        type="file"
                        onChange={(event) =>
                            form.setData(
                                'bast_file',
                                event.target.files?.[0] ?? null,
                            )
                        }
                        className={fileInputClass}
                    />
                    {form.errors.bast_file && (
                        <p className="text-xs font-medium text-red-600">
                            {form.errors.bast_file}
                        </p>
                    )}
                </div>

                {(form.errors as Record<string, string | undefined>).project && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        {(form.errors as Record<string, string | undefined>).project}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>{form.processing ? 'Uploading...' : 'Upload BAST'}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}
