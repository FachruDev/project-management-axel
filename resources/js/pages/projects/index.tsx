import { Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import {
    Search,
    Pencil,
    CheckSquare,
    Trash2,
    ExternalLink,
    MapPin,
    Calendar,
    CheckCircle2,
    Filter,
    Plus,
    UploadCloud,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import bulkDeleteProjects from '@/actions/App/Http/Controllers/ProjectBulkDeleteController';
import {
    close,
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
import { ProjectBastModal } from '@/components/project-bast-modal';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    ProjectIndexProps,
    ProjectStatus,
    ProjectSummary,
    Auth,
} from '@/types';

const inputClass =
    'h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const laneTone: Record<ProjectStatus, string> = {
    draft: 'border-slate-200 bg-slate-100/70 text-slate-700',
    pending_approval: 'border-amber-200 bg-amber-50/60 text-amber-800',
    rejected: 'border-red-200 bg-red-50/60 text-red-700',
    planning: 'border-sky-200 bg-sky-50/60 text-sky-800',
    ongoing: 'border-emerald-200 bg-emerald-50/60 text-emerald-800',
    awaiting_bast: 'border-purple-200 bg-purple-50/60 text-purple-800',
    ready_to_close: 'border-amber-200 bg-amber-50/60 text-amber-800',
    closed: 'border-slate-200 bg-slate-50 text-slate-600',
};

type PendingMove = {
    project: ProjectSummary;
    targetStatus: ProjectStatus;
};

type BoardChangedEvent = {
    action?: string;
    actor_id?: number | null;
    project_id?: number | null;
    old_status?: ProjectStatus | null;
    new_status?: ProjectStatus | null;
};

const projectStatusRank: Record<ProjectStatus, number> = {
    draft: 0,
    pending_approval: 0,
    rejected: 0,
    planning: 1,
    ongoing: 2,
    awaiting_bast: 3,
    ready_to_close: 4,
    closed: 5,
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
    const [boardMetrics, setBoardMetrics] = useState(metrics);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [moveReason, setMoveReason] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
    const [moveError, setMoveError] = useState<string | null>(null);
    const [bastProject, setBastProject] = useState<ProjectSummary | null>(null);

    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const { auth } = usePage().props as unknown as { auth: Auth };
    const canManageProjects =
        auth.user?.permissions.includes('manage_projects') ?? false;

    useEcho(
        'project-board',
        ['.project.board.changed'],
        (event: BoardChangedEvent) => {
            if (event.actor_id === auth.user?.id) return;
            
            applyProjectBoardEvent(event);
        },
        [auth.user?.id, status],
    );

    useEffect(() => {
        setBoardColumns(columns);
        setBoardMetrics(metrics);
    }, [columns, metrics]);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get(
            index.url(),
            { search, status, customer_id: customerId, pm_user_id: pmUserId },
            { preserveScroll: true, preserveState: true }
        );
    }

    function handleDrop(projectId: string, laneStatus: string) {
        const project = boardColumns
            .flatMap((column) => column.projects)
            .find((item) => String(item.id) === projectId);
        const targetStatus = laneStatus as ProjectStatus;

        if (!project || project.status === targetStatus) return;

        requestMove(project, targetStatus);
    }

    function requestMove(project: ProjectSummary, targetStatus: ProjectStatus) {
        if (isBackwardProjectStatus(project.status, targetStatus)) {
            setPendingMove({ project, targetStatus });
            setMoveReason('');

            return;
        }
        performMove(project, targetStatus);
    }

    function submitRollbackMove(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!pendingMove) return;

        performMove(pendingMove.project, pendingMove.targetStatus, moveReason);
    }

    function performMove(
        project: ProjectSummary,
        targetStatus: ProjectStatus,
        reason = '',
    ) {
        const previousColumns = boardColumns;
        const previousMetrics = boardMetrics;

        setMoveError(null);
        setBoardColumns(moveProject(previousColumns, project.id, targetStatus));
        setBoardMetrics(updateProjectMetrics(previousMetrics, project.status, targetStatus));

        router.patch(
            statusMove.url(project.id),
            { target_status: targetStatus, reason },
            {
                preserveScroll: true,
                preserveState: true,
                onError: (errors) => {
                    setBoardColumns(previousColumns);
                    setBoardMetrics(previousMetrics);
                    setMoveError(firstError(errors) ?? 'Project status could not be updated.');
                },
                onSuccess: () => setPendingMove(null),
            },
        );
    }

    function applyProjectBoardEvent(event: BoardChangedEvent) {
        if (!event.project_id) return;

        if (event.action === 'project_deleted') {
            setBoardColumns((current) => removeProject(current, event.project_id as number));
            setBoardMetrics((current) =>
                event.old_status ? updateProjectMetrics(current, event.old_status, null) : current,
            );

            return;
        }

        if (!event.new_status) return;

        setBoardColumns((current) =>
            moveProjectForCurrentFilter(
                current,
                event.project_id as number,
                event.new_status as ProjectStatus,
                status,
            ),
        );

        setBoardMetrics((current) =>
            updateProjectMetrics(current, event.old_status ?? null, event.new_status ?? null),
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
        if (!window.confirm(`Delete project "${project.name}"?`)) return;

        router.delete(destroy.url(project.id), { preserveScroll: true });
    }

    function closeProject(project: ProjectSummary) {
        router.post(close.url(project.id), {}, { preserveScroll: true });
    }

    function bulkDeleteSelectedProjects() {
        if (selectedProjectIds.length === 0) return;

        if (!window.confirm(`Delete ${selectedProjectIds.length} selected project(s)?`)) return;

        router.delete(bulkDeleteProjects.url(), {
            data: { project_ids: selectedProjectIds },
            preserveScroll: true,
            onSuccess: () => setSelectedProjectIds([]),
        });
    }

    return (
        <AppLayout title="Projects">
            <div className="space-y-6">

                {/* Header */}
                <PageHeader
                    eyebrow="Operational Board"
                    title="Projects Kanban"
                    description="Kelola siklus project dari planning hingga closed bergaya Jira Board."
                    actions={
                        <Link
                            href={preparationIndex.url()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Project Preparation</span>
                        </Link>
                    }
                />

                {/* Alerts */}
                {flash?.success && <Alert tone="success">{flash.success}</Alert>}
                {errors?.project && <Alert tone="danger">{errors.project}</Alert>}
                {errors?.target_status && <Alert tone="danger">{errors.target_status}</Alert>}
                {errors?.reason && <Alert tone="danger">{errors.reason}</Alert>}
                {moveError && <Alert tone="danger">{moveError}</Alert>}

                {/* Filter Toolbar Jira Style */}
                <form
                    onSubmit={submitFilters}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs"
                >
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search project..."
                            className={`${inputClass} w-full pl-8`}
                        />
                    </div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
                        <option value="">All Statuses</option>
                        {options.statuses.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                    <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={inputClass}>
                        <option value="">All Customers</option>
                        {options.customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                    </select>
                    <select value={pmUserId} onChange={(event) => setPmUserId(event.target.value)} className={inputClass}>
                        <option value="">All PMs</option>
                        {options.users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                    >
                        <Filter className="h-3.5 w-3.5" />
                        <span>Filter</span>
                    </button>
                </form>

                {/* Bulk Actions Indicator */}
                {canManageProjects && selectedProjectIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-2 text-xs font-semibold text-indigo-900 shadow-xs">
                        <span>{selectedProjectIds.length} project(s) selected</span>
                        <button
                            type="button"
                            onClick={bulkDeleteSelectedProjects}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-all hover:bg-red-700"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Bulk Delete</span>
                        </button>
                    </div>
                )}

                {/* Kanban Board Container */}
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
                                    onUploadBast={setBastProject}
                                    onCloseProject={closeProject}
                                />
                            ))}
                            {column.projects.length === 0 && (
                                <EmptyLane>No issues in this lane</EmptyLane>
                            )}
                        </KanbanLane>
                    ))}
                </KanbanBoard>

                {/* Rollback Modal */}
                <Modal open={pendingMove !== null} title="Rollback Project Status" onClose={() => setPendingMove(null)}>
                    <form onSubmit={submitRollbackMove} className="space-y-4 pt-2">
                        <p className="text-xs leading-relaxed text-slate-600">
                            Project akan dipindahkan mundur dari status{' '}
                            <span className="font-bold text-slate-900">{pendingMove?.project.status}</span> ke{' '}
                            <span className="font-bold text-slate-900">{pendingMove?.targetStatus}</span>.
                        </p>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Reason / Audit Notes</label>
                            <textarea
                                value={moveReason}
                                onChange={(event) => setMoveReason(event.target.value)}
                                placeholder="Berikan alasan perubahan status..."
                                className={`${inputClass} min-h-[90px] w-full p-2.5`}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setPendingMove(null)}
                                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                            >
                                Confirm Move
                            </button>
                        </div>
                    </form>
                </Modal>

                <ProjectBastModal
                    open={bastProject !== null}
                    project={bastProject}
                    onClose={() => setBastProject(null)}
                />

            </div>
        </AppLayout>
    );
}

{/* Komponen Project Card Internal */}
function ProjectCard({
    project,
    selected,
    canManageProjects,
    onToggleSelected,
    onDelete,
    onUploadBast,
    onCloseProject,
}: {
    project: ProjectSummary;
    selected: boolean;
    canManageProjects: boolean;
    onToggleSelected: (projectId: number) => void;
    onDelete: (project: ProjectSummary) => void;
    onUploadBast: (project: ProjectSummary) => void;
    onCloseProject: (project: ProjectSummary) => void;
}) {
    const isClosed = project.status === 'closed';
    const canSelectProject = canManageProjects && !isClosed;

    return (
        <DraggableKanbanCard id={String(project.id)} selected={selected}>
            {/* onPointerDown={(e) => e.stopPropagation()} SANGAT PENTING untuk mencegah event klik tembus memicu fungsi drag dnd-kit */}

            <div className="ml-8 mt-1 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    {canSelectProject && (
                        <input
                            type="checkbox"
                            checked={selected}
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={() => onToggleSelected(project.id)}
                            className="h-3.5 w-3.5 cursor-pointer rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                            aria-label={`Select ${project.name}`}
                        />
                    )}
                    <ProjectStatusBadge status={project.status} />
                </div>

                {/* Action Buttons (Icon Only) */}
                <div
                    className="flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Link
                        href={show.url(project.id)}
                        title="View Detail"
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {!isClosed && (
                        <Link
                            href={preparationShow.url(project.id)}
                            title="Edit Project"
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Link>
                    )}
                    <Link
                        href={taskBoardIndex.url({ query: { project_id: project.id } })}
                        title="Task Board"
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                    >
                        <CheckSquare className="h-3.5 w-3.5" />
                    </Link>
                    {canManageProjects && !isClosed && (
                        <button
                            type="button"
                            title="Delete Project"
                            onClick={() => onDelete(project)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {canManageProjects && (project.actions.can_upload_bast || project.actions.can_close) && (
                <div
                    className="mt-3 flex flex-wrap gap-1.5"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {project.actions.can_upload_bast && (
                        <button
                            type="button"
                            onClick={() => onUploadBast(project)}
                            className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-800 hover:bg-purple-100"
                        >
                            <UploadCloud className="h-3 w-3" />
                            <span>Upload BAST</span>
                        </button>
                    )}
                    {project.actions.can_close && (
                        <button
                            type="button"
                            onClick={() => onCloseProject(project)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Close</span>
                        </button>
                    )}
                </div>
            )}

            {/* Project Title */}
            <Link
                href={show.url(project.id)}
                onPointerDown={(e) => e.stopPropagation()}
                className="mt-2.5 block text-xs font-bold text-slate-900 line-clamp-2 transition-colors hover:text-primary"
            >
                {project.name}
            </Link>

            {/* Project Metadata */}
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span className="max-w-[100px] truncate">{project.location ?? '-'}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {project.plan_end_date ?? '-'}
                    </span>
                </div>
            </div>

            {/* Card Footer Jira Style (PM Avatar & Tasks Count) */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    <CheckSquare className="h-3 w-3 text-slate-400" />
                    <span>{project.tasks_count} tasks</span>
                </div>

                {/* PM Avatar */}
                <div
                    title={`PM: ${project.pm?.name ?? 'Unassigned'}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 ring-2 ring-white"
                >
                    {project.pm?.name?.charAt(0) ?? '?'}
                </div>
            </div>
        </DraggableKanbanCard>
    );
}

function EmptyLane({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs font-medium text-slate-400">
            {children}
        </div>
    );
}

function Alert({ tone, children }: { tone: 'success' | 'danger'; children: ReactNode }) {
    return (
        <div
            className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium shadow-xs ${
                tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            {children}
        </div>
    );
}

// Helper functions (moveProject, moveProjectForCurrentFilter, dll.)
function moveProject(columns: ProjectIndexProps['columns'], projectId: number, targetStatus: ProjectStatus) {
    let movedProject: ProjectSummary | null = null;
    const nextColumns = columns.map((column) => {
        const projects = column.projects.filter((project) => {
            if (project.id !== projectId) return true;

            movedProject = { ...project, status: targetStatus };

            return false;
        });

        return { ...column, projects };
    });

    if (!movedProject) return columns;

    const moved = movedProject;

    return nextColumns.map((column) =>
        column.status === targetStatus ? { ...column, projects: [moved, ...column.projects] } : column
    );
}

function moveProjectForCurrentFilter(columns: ProjectIndexProps['columns'], projectId: number, targetStatus: ProjectStatus, activeStatusFilter: string) {
    if (activeStatusFilter !== '' && activeStatusFilter !== targetStatus) {
        return removeProject(columns, projectId);
    }

    return moveProject(columns, projectId, targetStatus);
}

function removeProject(columns: ProjectIndexProps['columns'], projectId: number) {
    return columns.map((column) => ({
        ...column,
        projects: column.projects.filter((project) => project.id !== projectId),
    }));
}

function updateProjectMetrics(metrics: ProjectIndexProps['metrics'], oldStatus: ProjectStatus | null, newStatus: ProjectStatus | null) {
    if (oldStatus === newStatus) return metrics;

    return {
        ...metrics,
        ...(oldStatus ? { [oldStatus]: Math.max((metrics[oldStatus] ?? 0) - 1, 0) } : {}),
        ...(newStatus ? { [newStatus]: (metrics[newStatus] ?? 0) + 1 } : {}),
    };
}

function isBackwardProjectStatus(currentStatus: ProjectStatus, targetStatus: ProjectStatus) {
    return projectStatusRank[targetStatus] < projectStatusRank[currentStatus];
}

function firstError(errors: Record<string, string>) {
    return Object.values(errors)[0] ?? null;
}
