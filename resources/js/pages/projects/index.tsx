import { Link, router, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    close,
    index,
    refreshStatus,
    show,
    start,
} from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import preparationIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import { KanbanBoard, KanbanCard, KanbanLane } from '@/components/kanban';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    ProjectIndexProps,
    ProjectStatus,
    ProjectSummary,
} from '@/types';

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const laneTone: Record<ProjectStatus, string> = {
    draft: 'border-slate-200 bg-pastel-slate text-slate-700',
    pending_approval: 'border-amber-200 bg-pastel-amber text-amber-800',
    rejected: 'border-red-200 bg-pastel-red text-red-700',
    planning: 'border-blue-200 bg-pastel-blue text-primary',
    ongoing: 'border-emerald-200 bg-pastel-green text-emerald-700',
    awaiting_bast: 'border-purple-200 bg-pastel-purple text-purple-700',
    ready_to_close: 'border-amber-200 bg-pastel-amber text-amber-800',
    closed: 'border-slate-300 bg-white text-slate-700',
};

export default function ProjectIndex({
    columns,
    metrics,
    filters,
    options,
}: ProjectIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [customerId, setCustomerId] = useState(filters.customer_id);
    const [pmUserId, setPmUserId] = useState(filters.pm_user_id);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url(),
            {
                search,
                status,
                customer_id: customerId,
                pm_user_id: pmUserId,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function postAction(url: string) {
        router.post(url, {}, { preserveScroll: true });
    }

    return (
        <AppLayout title="Projects">
            <PageHeader
                eyebrow="Operational Kanban"
                title="Projects"
                description="Planning hingga closed. Draft, pending approval, dan rejected dikelola di Project Preparation."
                actions={
                    <Link
                        href={preparationIndex.url()}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        Project Preparation
                    </Link>
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {columns.map((column) => (
                    <div
                        key={column.status}
                        className={`rounded-lg border p-4 ${laneTone[column.status]}`}
                    >
                        <div className="text-xs font-semibold uppercase">
                            {column.label}
                        </div>
                        <div className="mt-3 text-2xl font-semibold">
                            {metrics[column.status] ?? 0}
                        </div>
                    </div>
                ))}
            </section>

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_220px_220px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search operational project"
                    className={inputClass}
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Status</option>
                    {options.statuses.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
                <select
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Customers</option>
                    {options.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                            {customer.name}
                        </option>
                    ))}
                </select>
                <select
                    value={pmUserId}
                    onChange={(event) => setPmUserId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All PM</option>
                    {options.users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-pastel-blue"
                >
                    Apply
                </button>
            </form>

            <KanbanBoard>
                {columns.map((column) => (
                    <KanbanLane
                        key={column.status}
                        title={column.label}
                        count={column.projects.length}
                        tone={laneTone[column.status]}
                    >
                        {column.projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onAction={postAction}
                            />
                        ))}
                        {column.projects.length === 0 && (
                            <EmptyLane>No project in this lane.</EmptyLane>
                        )}
                    </KanbanLane>
                ))}
            </KanbanBoard>
        </AppLayout>
    );
}

function ProjectCard({
    project,
    onAction,
}: {
    project: ProjectSummary;
    onAction: (url: string) => void;
}) {
    const progress =
        project.tasks_count > 0
            ? Math.round((project.done_tasks_count / project.tasks_count) * 100)
            : 0;

    return (
        <KanbanCard>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <Link
                        href={show.url(project.id)}
                        className="font-semibold text-slate-950 hover:text-primary"
                    >
                        {project.name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                        {project.customers[0]?.name ?? 'No customer'}
                    </div>
                </div>
                <ProjectStatusBadge status={project.status} />
            </div>

            <div className="mt-4 grid gap-3 text-xs text-slate-600">
                <div className="flex justify-between gap-3">
                    <span>PM</span>
                    <span className="font-medium text-slate-800">
                        {project.pm?.name ?? '-'}
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Plan</span>
                    <span className="font-medium text-slate-800">
                        {project.plan_start_date ?? '-'} / {project.plan_end_date ?? '-'}
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Team</span>
                    <span className="font-medium text-slate-800">
                        {project.members_count} member
                    </span>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Task progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Link
                    href={preparationShow.url(project.id)}
                    className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                >
                    Preparation
                </Link>
                {project.actions.can_start && (
                    <button
                        type="button"
                        onClick={() => onAction(start.url(project.id))}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                    >
                        Start
                    </button>
                )}
                {project.actions.can_refresh && (
                    <button
                        type="button"
                        onClick={() => onAction(refreshStatus.url(project.id))}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                        Refresh
                    </button>
                )}
                {project.actions.can_close && (
                    <button
                        type="button"
                        onClick={() => onAction(close.url(project.id))}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                    >
                        Close
                    </button>
                )}
            </div>
        </KanbanCard>
    );
}

function EmptyLane({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500">
            {children}
        </div>
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
