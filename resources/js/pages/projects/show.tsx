import { Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import {
    close,
    index,
    refreshStatus,
    resubmit,
    start,
    submitApproval,
} from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type { ProjectDetail, ProjectTaskStatus } from '@/types';

type Props = {
    project: ProjectDetail;
};

const taskTone: Record<ProjectTaskStatus, string> = {
    todo: 'bg-pastel-slate text-slate-700',
    assigned: 'bg-pastel-blue text-primary',
    inprogress: 'bg-pastel-amber text-amber-800',
    done: 'bg-pastel-green text-emerald-700',
    cancelled: 'bg-pastel-red text-red-700',
};

export default function ProjectShow({ project }: Props) {
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const doneTasks = project.tasks.filter((task) => task.status === 'done').length;
    const progress =
        project.tasks.length > 0
            ? Math.round((doneTasks / project.tasks.length) * 100)
            : 0;

    function postAction(url: string) {
        router.post(url, {}, { preserveScroll: true });
    }

    return (
        <AppLayout title={project.name}>
            <PageHeader
                eyebrow="Project Detail"
                title={project.name}
                description={`${project.customers.map((customer) => customer.name).join(', ') || 'No customer'} / ${project.mandays} mandays`}
                actions={
                    <>
                        <Link
                            href={index.url()}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Back
                        </Link>
                        {project.actions.can_prepare && (
                            <Link
                                href={preparationShow.url(project.id)}
                                className="rounded-md border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-pastel-blue"
                            >
                                Preparation
                            </Link>
                        )}
                        {project.actions.can_submit && (
                            <ActionButton
                                onClick={() => postAction(submitApproval.url(project.id))}
                            >
                                Submit Approval
                            </ActionButton>
                        )}
                        {project.actions.can_resubmit && (
                            <ActionButton
                                onClick={() => postAction(resubmit.url(project.id))}
                            >
                                Resubmit
                            </ActionButton>
                        )}
                        {project.actions.can_start && (
                            <ActionButton onClick={() => postAction(start.url(project.id))}>
                                Start
                            </ActionButton>
                        )}
                        {project.actions.can_refresh && (
                            <button
                                type="button"
                                onClick={() => postAction(refreshStatus.url(project.id))}
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                            >
                                Refresh Status
                            </button>
                        )}
                        {project.actions.can_close && (
                            <ActionButton onClick={() => postAction(close.url(project.id))}>
                                Close
                            </ActionButton>
                        )}
                    </>
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-slate-500">Status</p>
                                <div className="mt-2">
                                    <ProjectStatusBadge status={project.status} />
                                </div>
                            </div>
                            <div className="min-w-48">
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Task Progress</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-slate-100">
                                    <div
                                        className="h-2 rounded-full bg-primary"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Panel title="Project Dates">
                        <InfoGrid>
                            <Info label="Project Date" value={project.project_date} />
                            <Info label="Plan Start" value={project.plan_start_date} />
                            <Info label="Plan End" value={project.plan_end_date} />
                            <Info label="Actual Start" value={project.actual_start_date} />
                            <Info label="Actual End" value={project.actual_end_date} />
                            <Info label="UAT Date" value={project.uat_date} />
                            <Info label="BAST Date" value={project.bast_date} />
                            <Info label="URS Date" value={project.urs_date} />
                        </InfoGrid>
                    </Panel>

                    <Panel title="Tasks">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="text-left text-xs font-semibold uppercase text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Task</th>
                                        <th className="px-3 py-2">PIC</th>
                                        <th className="px-3 py-2">Plan</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {project.tasks.map((task) => (
                                        <tr key={task.id}>
                                            <td className="px-3 py-3 font-medium text-slate-900">
                                                {task.name}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600">
                                                {task.pic?.name ?? '-'}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600">
                                                {task.plan_start_date ?? '-'} /{' '}
                                                {task.plan_end_date ?? '-'}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-medium ${taskTone[task.status]}`}
                                                >
                                                    {task.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {project.tasks.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-10 text-center text-slate-500"
                                            >
                                                No tasks yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>

                <aside className="space-y-4">
                    <Panel title="Preparation Summary">
                        <InfoGrid>
                            <Info label="PM" value={project.pm?.name} />
                            <Info label="Requester" value={project.requester?.name} />
                            <Info label="Location" value={project.location} />
                            <Info label="URS Number" value={project.urs_number} />
                            <Info
                                label="Incentive Profile"
                                value={
                                    project.incentive_profile
                                        ? `${project.incentive_profile.code} v${project.incentive_profile.version}`
                                        : null
                                }
                            />
                        </InfoGrid>
                    </Panel>

                    {project.rejection_notes && (
                        <div className="rounded-lg border border-red-200 bg-pastel-red p-4 text-sm text-red-800">
                            <div className="font-semibold">Reject Notes</div>
                            <p className="mt-1">{project.rejection_notes}</p>
                        </div>
                    )}

                    <Panel title="Members">
                        <div className="space-y-3">
                            {project.members.map((member) => (
                                <div
                                    key={member.id}
                                    className="rounded-md border border-slate-200 p-3"
                                >
                                    <div className="font-medium text-slate-900">
                                        {member.user?.name ?? '-'}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {member.project_role_name ?? '-'} /{' '}
                                        {member.pic_level_name ?? 'No PIC level'}
                                    </div>
                                    {member.is_support && (
                                        <span className="mt-2 inline-flex rounded-full bg-pastel-green px-2 py-1 text-xs font-medium text-emerald-700">
                                            Support
                                        </span>
                                    )}
                                </div>
                            ))}
                            {project.members.length === 0 && (
                                <p className="text-sm text-slate-500">No members.</p>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Attachments">
                        <div className="space-y-2">
                            {project.attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex justify-between rounded-md bg-pastel-slate px-3 py-2 text-sm"
                                >
                                    <span>{attachment.original_name}</span>
                                    <span className="text-xs text-slate-500">
                                        {attachment.collection.replaceAll('_', ' ')}
                                    </span>
                                </div>
                            ))}
                            {project.attachments.length === 0 && (
                                <p className="text-sm text-slate-500">No files uploaded.</p>
                            )}
                        </div>
                    </Panel>
                </aside>
            </section>
        </AppLayout>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function InfoGrid({ children }: { children: ReactNode }) {
    return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">{value || '-'}</dd>
        </div>
    );
}

function ActionButton({
    children,
    onClick,
}: {
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
            {children}
        </button>
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
