import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    FileText,
    Paperclip,
    RefreshCw,
    Send,
    Play,
    XCircle,
    User,
    MapPin,
    Hash,
    Clock,
    History,
    FileCode,
    Sparkles,
    ExternalLink,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import projectAuditLogs from '@/actions/App/Http/Controllers/ProjectAuditLogController';
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
import type { ProjectAuditEntry, ProjectDetail, ProjectTaskStatus } from '@/types';

type Props = {
    project: ProjectDetail;
};

const taskTone: Record<ProjectTaskStatus, string> = {
    todo: 'bg-slate-100 text-slate-700 border-slate-200',
    assigned: 'bg-sky-50 text-sky-700 border-sky-200',
    inprogress: 'bg-amber-50 text-amber-800 border-amber-200',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function ProjectShow({ project }: Props) {
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const [auditLogs, setAuditLogs] = useState(project.audit_logs);
    const [auditHasMore, setAuditHasMore] = useState(project.audit_logs_has_more);
    const [auditLoading, setAuditLoading] = useState(false);
    const auditExpanded = auditLogs.length > project.audit_logs.length;

    const doneTasks = project.tasks.filter((task) => task.status === 'done').length;
    const progress =
        project.tasks.length > 0
            ? Math.round((doneTasks / project.tasks.length) * 100)
            : 0;

    function postAction(url: string) {
        router.post(url, {}, { preserveScroll: true });
    }

    async function loadMoreAuditLogs() {
        if (auditLoading || !auditHasMore) {
            return;
        }

        setAuditLoading(true);

        try {
            const response = await fetch(
                projectAuditLogs.url(project.id, {
                    query: { limit: 10, offset: auditLogs.length },
                }),
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Audit logs could not be loaded.');
            }

            const payload = (await response.json()) as {
                data: ProjectAuditEntry[];
                has_more: boolean;
            };

            setAuditLogs((current) => [...current, ...payload.data]);
            setAuditHasMore(payload.has_more);
        } finally {
            setAuditLoading(false);
        }
    }

    function collapseAuditLogs() {
        setAuditLogs(project.audit_logs);
        setAuditHasMore(project.audit_logs_has_more);
    }

    return (
        <AppLayout title={project.name}>
            <div className="space-y-6">

                {/* Header Action Bar */}
                <PageHeader
                    eyebrow="Project Overview"
                    title={project.name}
                    description={`${project.customers.map((c) => c.name).join(', ') || 'No Customer'} • ${project.mandays} Mandays`}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={index.url()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Back</span>
                            </Link>

                            {project.actions.can_prepare && (
                                <Link
                                    href={preparationShow.url(project.id)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary shadow-xs hover:bg-primary/10 transition-all"
                                >
                                    <FileCode className="h-3.5 w-3.5" />
                                    <span>Preparation</span>
                                </Link>
                            )}

                            {project.actions.can_submit && (
                                <ActionButton icon={Send} onClick={() => postAction(submitApproval.url(project.id))}>
                                    Submit Approval
                                </ActionButton>
                            )}

                            {project.actions.can_resubmit && (
                                <ActionButton icon={Send} onClick={() => postAction(resubmit.url(project.id))}>
                                    Resubmit
                                </ActionButton>
                            )}

                            {project.actions.can_start && (
                                <ActionButton icon={Play} onClick={() => postAction(start.url(project.id))}>
                                    Start Project
                                </ActionButton>
                            )}

                            {project.actions.can_refresh && (
                                <button
                                    type="button"
                                    onClick={() => postAction(refreshStatus.url(project.id))}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                                >
                                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Refresh Status</span>
                                </button>
                            )}

                            {project.actions.can_close && (
                                <ActionButton icon={CheckCircle2} onClick={() => postAction(close.url(project.id))}>
                                    Close Project
                                </ActionButton>
                            )}
                        </div>
                    }
                />

                {/* Alerts */}
                {flash?.success && <Alert tone="success">{flash.success}</Alert>}
                {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

                {/* Status & Progress Summary Hero Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/30 p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Status</span>
                            <div className="flex items-center gap-3">
                                <ProjectStatusBadge status={project.status} />
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-600">
                                    {project.tasks.length} Total Tasks ({doneTasks} Completed)
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full sm:w-72 space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-700">Project Completion</span>
                                <span className="text-primary">{progress}%</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/60 p-0.5">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out shadow-xs shadow-primary/30"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        {project.actions.can_close && (
                            <ActionButton icon={CheckCircle2} onClick={() => postAction(close.url(project.id))}>
                                Close Project
                            </ActionButton>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <section className="grid gap-6 lg:grid-cols-[1fr_360px]">

                    {/* Left Column (Dates, Tasks, Audit) */}
                    <div className="space-y-6">

                        {/* Project Dates Section */}
                        <Panel title="Project Timeline & Dates" icon={Calendar}>
                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                                <DateCard label="Project Date" value={project.project_date} />
                                <DateCard label="Plan Start" value={project.plan_start_date} />
                                <DateCard label="Plan End" value={project.plan_end_date} />
                                <DateCard label="Actual Start" value={project.actual_start_date} />
                                <DateCard label="Actual End" value={project.actual_end_date} />
                                <DateCard label="UAT Date" value={project.uat_date} />
                                <DateCard label="BAST Date" value={project.bast_date} />
                                <DateCard label="URS Date" value={project.urs_date} />
                            </div>
                        </Panel>

                        {/* Tasks Table Section */}
                        <Panel title={`Project Tasks (${project.tasks.length})`} icon={CheckCircle2}>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                    <thead className="bg-slate-50/80 font-bold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Task Name</th>
                                            <th className="px-4 py-3">PIC</th>
                                            <th className="px-4 py-3">Plan Schedule</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {project.tasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                    {task.name}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                                            {(task.pic?.name ?? '-').charAt(0)}
                                                        </div>
                                                        <span>{task.pic?.name ?? '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {task.plan_start_date ?? '-'} &rarr; {task.plan_end_date ?? '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${taskTone[task.status]}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {project.tasks.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-normal">
                                                    No tasks registered for this project.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>

                        {/* Audit Log Timeline Section */}
                        <Panel title="Audit Trail Log" icon={History}>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                    <thead className="bg-slate-50/80 font-bold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3">Actor</th>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">Changes Summary</th>
                                            <th className="px-4 py-3">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                        {auditLogs.map((log) => (
                                            <tr key={log.id} className="align-top hover:bg-slate-50/50 transition-colors">
                                                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-400">
                                                    {formatDateTime(log.changed_at)}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-800">
                                                    {log.actor?.name ?? 'System'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                                        {log.action.replaceAll('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[11px]">
                                                    <ChangeSummary oldData={log.old} newData={log.new} />
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 italic max-w-[180px]">
                                                    {log.reason ?? '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {auditLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-normal">
                                                    No audit history available yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {(auditHasMore || auditExpanded) && (
                                <div className="mt-3 flex justify-center gap-2">
                                    {auditExpanded && (
                                        <button
                                            type="button"
                                            onClick={collapseAuditLogs}
                                            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Collapse
                                        </button>
                                    )}
                                    {auditHasMore && (
                                        <button
                                            type="button"
                                            onClick={loadMoreAuditLogs}
                                            disabled={auditLoading}
                                            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {auditLoading ? 'Loading...' : 'Load 10 more'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </Panel>

                    </div>

                    {/* Right Column (Preparation Details, Members, Attachments) */}
                    <aside className="space-y-6">

                        {/* Preparation Summary */}
                        <Panel title="Preparation Specs" icon={FileText}>
                            <div className="space-y-3">
                                <MetaItem icon={User} label="Project Manager" value={project.pm?.name} />
                                <MetaItem icon={User} label="Requester" value={project.requester?.name} />
                                <MetaItem icon={MapPin} label="Location" value={project.location} />
                                <MetaItem icon={Hash} label="URS Number" value={project.urs_number} />
                                <MetaItem
                                    icon={Sparkles}
                                    label="Incentive Profile"
                                    value={
                                        project.incentive_profile
                                            ? `${project.incentive_profile.code} v${project.incentive_profile.version}`
                                            : null
                                    }
                                />
                            </div>
                        </Panel>

                        {/* Rejection Notes Banner */}
                        {project.rejection_notes && (
                            <div className="rounded-xl border border-red-200/80 bg-red-50/70 p-4 shadow-xs">
                                <div className="flex items-center gap-2 font-bold text-xs text-red-900 uppercase tracking-wider">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span>Rejection Reason</span>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-red-700 font-medium">
                                    {project.rejection_notes}
                                </p>
                            </div>
                        )}

                        {/* Project Members */}
                        <Panel title={`Team Members (${project.members.length})`} icon={User}>
                            <div className="space-y-2.5">
                                {project.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-primary">
                                                {(member.user?.name ?? 'U').charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-xs font-bold text-slate-800">
                                                    {member.user?.name ?? '-'}
                                                </div>
                                                <div className="truncate text-[10px] text-slate-400">
                                                    {member.project_role_name ?? '-'}
                                                </div>
                                            </div>
                                        </div>

                                        {member.is_support && (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                                Support
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {project.members.length === 0 && (
                                    <p className="py-2 text-center text-xs text-slate-400">No team members assigned.</p>
                                )}
                            </div>
                        </Panel>

                        {/* Attachments Panel */}
                        <Panel title={`Attachments (${project.attachments.length})`} icon={Paperclip}>
                            <div className="space-y-2">
                                {project.attachments.map((attachment) => (
                                    <a
                                        key={attachment.id}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate font-semibold text-slate-700">
                                                {attachment.original_name}
                                            </span>
                                        </div>
                                        <span className="shrink-0 rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                            {attachment.collection.replaceAll('_', ' ')}
                                        </span>
                                        <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    </a>
                                ))}

                                {project.attachments.length === 0 && (
                                    <p className="py-2 text-center text-xs text-slate-400">No attachments uploaded.</p>
                                )}
                            </div>
                        </Panel>

                    </aside>
                </section>

            </div>
        </AppLayout>
    );
}

{/* Micro UI Components */}

function Panel({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon?: React.ElementType;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                {Icon && <Icon className="h-4 w-4 text-primary" />}
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function DateCard({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{label}</span>
            </div>
            <div className="text-xs font-bold text-slate-800">
                {value || '-'}
            </div>
        </div>
    );
}

function MetaItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
}) {
    return (
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </span>
            <span className="font-bold text-slate-800">{value || '-'}</span>
        </div>
    );
}

function ActionButton({
    children,
    onClick,
    icon: Icon,
}: {
    children: ReactNode;
    onClick: () => void;
    icon?: React.ElementType;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-primary/90 active:scale-95"
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{children}</span>
        </button>
    );
}

function ChangeSummary({
    oldData,
    newData,
}: {
    oldData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
}) {
    const keys = Array.from(
        new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]),
    ).slice(0, 4);

    if (keys.length === 0) {
        return <span className="text-slate-400">-</span>;
    }

    return (
        <div className="space-y-1">
            {keys.map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">{key}:</span>
                    <span className="text-slate-700">
                        {stringValue(oldData?.[key])} &rarr; <strong className="text-slate-900">{stringValue(newData?.[key])}</strong>
                    </span>
                </div>
            ))}
        </div>
    );
}

function stringValue(value: unknown) {
    if (value === null || value === undefined || value === '') return '-';

    if (typeof value === 'object') return JSON.stringify(value);

    return String(value);
}

function formatDateTime(value: string | null) {
    if (!value) return '-';

    return value.replace('T', ' ').replace(/\.\d+Z$/, '');
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
            className={`rounded-xl border px-4 py-3 text-xs font-semibold shadow-xs ${
                tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            {children}
        </div>
    );
}
