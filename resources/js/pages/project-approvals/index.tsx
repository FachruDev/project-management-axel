import { Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    approve,
    reject,
} from '@/actions/App/Http/Controllers/ProjectApprovalController';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { ProjectApprovalSummary, ProjectApprovalsProps } from '@/types';

type RejectPayload = {
    rejection_notes: string;
};

export default function ProjectApprovalIndex({ projects }: ProjectApprovalsProps) {
    const [rejecting, setRejecting] = useState<ProjectApprovalSummary | null>(null);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<RejectPayload>({ rejection_notes: '' });

    function approveProject(project: ProjectApprovalSummary) {
        router.post(approve.url(project.id), {}, { preserveScroll: true });
    }

    function openReject(project: ProjectApprovalSummary) {
        form.clearErrors();
        form.setData('rejection_notes', '');
        setRejecting(project);
    }

    function submitReject(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!rejecting) {
            return;
        }

        form.post(reject.url(rejecting.id), {
            preserveScroll: true,
            onSuccess: () => setRejecting(null),
        });
    }

    return (
        <AppLayout title="Project Approvals">
            <PageHeader
                eyebrow="Approval"
                title="Project Approvals"
                description="Review submitted projects before they enter planning."
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">PM</th>
                                <th className="px-4 py-3">Requested</th>
                                <th className="px-4 py-3">Completeness</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projects.data.map((project) => (
                                <tr key={project.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={projectShow.url(project.id)}
                                            className="font-medium text-slate-950 hover:text-primary"
                                        >
                                            {project.name}
                                        </Link>
                                        <div className="text-xs text-slate-500">
                                            {project.project_date ?? '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {project.customers[0]?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {project.pm?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div>{project.requester?.name ?? '-'}</div>
                                        <div className="text-xs text-slate-500">
                                            {project.approval_requested_at ?? '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-pastel-green px-2 py-1 text-xs font-medium text-emerald-700">
                                                {project.members_count} member
                                            </span>
                                            <span className="rounded-full bg-pastel-blue px-2 py-1 text-xs font-medium text-primary">
                                                {project.tasks_count} task
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={preparationShow.url(project.id)}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                Review
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => openReject(project)}
                                                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-pastel-red"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => approveProject(project)}
                                                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {projects.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No project awaiting approval.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={projects} />
            </section>

            <Modal
                open={Boolean(rejecting)}
                title="Reject Project"
                onClose={() => setRejecting(null)}
            >
                <form onSubmit={submitReject} className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Add notes for {rejecting?.name}. The project will remain editable
                        for correction and resubmission.
                    </p>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-700">
                            Reject Notes <span className="text-red-600">*</span>
                        </span>
                        <textarea
                            value={form.data.rejection_notes}
                            onChange={(event) =>
                                form.setData('rejection_notes', event.target.value)
                            }
                            className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                        {form.errors.rejection_notes && (
                            <span className="text-xs text-red-600">
                                {form.errors.rejection_notes}
                            </span>
                        )}
                    </label>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={() => setRejecting(null)}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-slate-400"
                        >
                            {form.processing ? 'Saving...' : 'Reject'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}

function Alert({
    tone,
    children,
}: {
    tone: 'success' | 'danger';
    children: ReactNode;
}) {
    return (
        <div
            className={`rounded-lg border px-4 py-3 text-sm ${
                tone === 'success'
                    ? 'border-emerald-200 bg-pastel-green text-emerald-800'
                    : 'border-red-200 bg-pastel-red text-red-700'
            }`}
        >
            {children}
        </div>
    );
}
