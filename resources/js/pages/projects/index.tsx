import { Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import bulkDeleteProjects from '@/actions/App/Http/Controllers/ProjectBulkDeleteController';
import {
    destroy,
    index,
    show,
} from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import preparationIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import statusMove from '@/actions/App/Http/Controllers/ProjectStatusMoveController';
import taskBoardIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import {
    DraggableKanbanCard,
    KanbanBoard,
    KanbanLane,
} from '@/components/kanban';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    ProjectIndexProps,
    ProjectStatus,
    ProjectSummary,
    Auth,
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

type PendingMove = {
    project: ProjectSummary;
    targetStatus: ProjectStatus;
};

type BoardChangedEvent = {
    actor_id?: number | null;
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
    const [boardColumns, setBoardColumns] = useState(columns);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [moveReason, setMoveReason] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const { auth } = usePage().props as unknown as { auth: Auth };
    const canManageProjects =
        auth.user?.permissions.includes('manage_projects') ?? false;

    useEffect(() => {
        setBoardColumns(columns);
    }, [columns]);

    useEcho(
        'project-board',
        ['.project.board.changed'],
        (event: BoardChangedEvent) => {
            if (event.actor_id === auth.user?.id) {
                return;
            }

            router.reload({
                only: ['columns', 'metrics'],
            });
        },
        [auth.user?.id],
    );

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

    function handleDrop(projectId: string, laneStatus: string) {
        const project = boardColumns
            .flatMap((column) => column.projects)
            .find((item) => String(item.id) === projectId);
        const targetStatus = laneStatus as ProjectStatus;

        if (! project || project.status === targetStatus) {
            return;
        }

        setPendingMove({ project, targetStatus });
        setMoveReason('');
    }

    function submitMove(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (! pendingMove) {
            return;
        }

        const previousColumns = boardColumns;
        const { project, targetStatus } = pendingMove;

        router.patch(
            statusMove.url(project.id),
            {
                target_status: targetStatus,
                reason: moveReason,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['columns', 'metrics', 'flash'],
                onBefore: () => {
                    setBoardColumns(moveProject(previousColumns, project.id, targetStatus));
                },
                onError: () => {
                    setBoardColumns(previousColumns);
                },
                onSuccess: () => setPendingMove(null),
            },
        );
    }

    function toggleProjectSelection(projectId: number) {
        setSelectedProjectIds((current) =>
            current.includes(projectId)
                ? current.filter((id) => id !== projectId)
                : [...current, projectId],
        );
    }

    function deleteProject(project: ProjectSummary) {
        if (! window.confirm(`Delete project "${project.name}"?`)) {
            return;
        }

        router.delete(destroy.url(project.id), { preserveScroll: true });
    }

    function bulkDeleteSelectedProjects() {
        if (selectedProjectIds.length === 0) {
            return;
        }

        if (! window.confirm(`Delete ${selectedProjectIds.length} selected project(s)?`)) {
            return;
        }

        router.delete(bulkDeleteProjects.url(), {
            data: { project_ids: selectedProjectIds },
            preserveScroll: true,
            onSuccess: () => setSelectedProjectIds([]),
        });
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
            {errors?.target_status && (
                <Alert tone="danger">{errors.target_status}</Alert>
            )}
            {errors?.reason && <Alert tone="danger">{errors.reason}</Alert>}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {boardColumns.map((column) => (
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

            {canManageProjects && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-sm text-slate-600">
                        {selectedProjectIds.length} project selected
                    </div>
                    <button
                        type="button"
                        disabled={selectedProjectIds.length === 0}
                        onClick={bulkDeleteSelectedProjects}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-pastel-red disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Bulk Delete
                    </button>
                </div>
            )}

            <KanbanBoard onDropItem={handleDrop}>
                {boardColumns.map((column) => (
                    <KanbanLane
                        key={column.status}
                        id={column.status}
                        title={column.label}
                        count={column.projects.length}
                        tone={laneTone[column.status]}
                    >
                        {column.projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                selected={selectedProjectIds.includes(project.id)}
                                canManageProjects={canManageProjects}
                                onToggleSelected={toggleProjectSelection}
                                onDelete={deleteProject}
                            />
                        ))}
                        {column.projects.length === 0 && (
                            <EmptyLane>No project in this lane.</EmptyLane>
                        )}
                    </KanbanLane>
                ))}
            </KanbanBoard>

            <Modal
                open={pendingMove !== null}
                title="Status Move Notes"
                onClose={() => setPendingMove(null)}
            >
                <form onSubmit={submitMove} className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Project akan dipindahkan dari{' '}
                        <strong>{pendingMove?.project.status}</strong> ke{' '}
                        <strong>{pendingMove?.targetStatus}</strong>. Notes bersifat
                        opsional dan akan masuk audit log.
                    </p>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        <span>Notes / Reason</span>
                        <textarea
                            value={moveReason}
                            onChange={(event) =>
                                setMoveReason(event.target.value)
                            }
                            className={`${inputClass} min-h-28`}
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPendingMove(null)}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                            Move Status
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}

function moveProject(
    columns: ProjectIndexProps['columns'],
    projectId: number,
    targetStatus: ProjectStatus,
) {
    let movedProject: ProjectSummary | null = null;

    const nextColumns = columns.map((column) => {
        const projects = column.projects.filter((project) => {
            if (project.id !== projectId) {
                return true;
            }

            movedProject = { ...project, status: targetStatus };

            return false;
        });

        return { ...column, projects };
    });

    if (! movedProject) {
        return columns;
    }

    const moved = movedProject;

    return nextColumns.map((column) =>
        column.status === targetStatus
            ? { ...column, projects: [moved, ...column.projects] }
            : column,
    );
}

function ProjectCard({
    project,
    selected,
    canManageProjects,
    onToggleSelected,
    onDelete,
}: {
    project: ProjectSummary;
    selected: boolean;
    canManageProjects: boolean;
    onToggleSelected: (projectId: number) => void;
    onDelete: (project: ProjectSummary) => void;
}) {
    return (
        <DraggableKanbanCard id={String(project.id)} selected={selected}>
            <div className="space-y-4 pr-8">
                <div className="flex items-start gap-3">
                    {canManageProjects && (
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelected(project.id)}
                            className="mt-1"
                            aria-label={`Select ${project.name}`}
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <ProjectStatusBadge status={project.status} />
                        <Link
                            href={show.url(project.id)}
                            className="mt-2 block text-sm font-semibold leading-5 text-slate-950 hover:text-primary"
                        >
                            {project.name}
                        </Link>
                    </div>
                </div>

                <div className="grid gap-2 text-xs text-slate-600">
                    <CompactRow label="PIC PM" value={project.pm?.name ?? '-'} />
                    <CompactRow label="Tasks" value={`${project.tasks_count} task`} />
                    <CompactRow label="Location" value={project.location ?? '-'} />
                    <CompactRow
                        label="Deadline"
                        value={project.plan_end_date ?? '-'}
                    />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <Link
                        href={preparationShow.url(project.id)}
                        className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                    >
                        Edit Project
                    </Link>
                    <Link
                        href={taskBoardIndex.url({
                            query: { project_id: project.id },
                        })}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                        Tasks
                    </Link>
                    {canManageProjects && (
                        <button
                            type="button"
                            onClick={() => onDelete(project)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-pastel-red"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </DraggableKanbanCard>
    );
}

function CompactRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-slate-500">{label}</span>
            <span className="max-w-[180px] truncate text-right font-medium text-slate-800">
                {value}
            </span>
        </div>
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
