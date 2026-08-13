import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import {
    Search,
    Filter,
    Plus,
    Trash2,
    Calendar,
    FolderKanban,
    Info,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { create as createProjectTasks } from '@/actions/App/Http/Controllers/ProjectBulkTaskController';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import bulkDeleteTasks from '@/actions/App/Http/Controllers/ProjectTaskBulkDeleteController';
import { update as updateTask } from '@/actions/App/Http/Controllers/ProjectTaskController';
import deleteTask from '@/actions/App/Http/Controllers/ProjectTaskDeleteController';
import updateTaskStatus from '@/actions/App/Http/Controllers/ProjectTaskStatusController';
import taskBoardIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import {
    DraggableKanbanCard,
    KanbanBoard,
    KanbanLane,
} from '@/components/kanban';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { SlideOver } from '@/components/slide-over';
import { AppLayout } from '@/layouts/app-layout';
import type {
    Auth,
    ProjectTaskStatus,
    TaskBoardProps,
    TaskKanbanCard,
} from '@/types';

const inputClass =
    'h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const taskTone: Record<ProjectTaskStatus, string> = {
    todo: 'border-slate-200 bg-slate-100/70 text-slate-700',
    assigned: 'border-sky-200 bg-sky-50/60 text-sky-800',
    inprogress: 'border-amber-200 bg-amber-50/60 text-amber-800',
    done: 'border-emerald-200 bg-emerald-50/60 text-emerald-800',
    cancelled: 'border-red-200 bg-red-50/60 text-red-700',
};

type PendingMove = {
    task: TaskKanbanCard;
    status: ProjectTaskStatus;
};

type BoardChangedEvent = {
    action?: string;
    actor_id?: number | null;
    new_status?: ProjectTaskStatus | null;
    old_status?: ProjectTaskStatus | null;
    task?: TaskKanbanCard | null;
    task_id?: number | null;
};

type TaskFormPayload = {
    name: string;
    task_type_id: string;
    pic_user_id: string;
    status: ProjectTaskStatus;
    description: string;
    plan_start_date: string;
    plan_end_date: string;
    reason: string;
};

const taskStatusRank: Record<ProjectTaskStatus, number> = {
    todo: 1,
    assigned: 2,
    inprogress: 3,
    done: 4,
    cancelled: 5,
};

const taskForwardTargets: Record<ProjectTaskStatus, ProjectTaskStatus[]> = {
    todo: ['assigned', 'cancelled'],
    assigned: ['todo', 'inprogress', 'cancelled'],
    inprogress: ['assigned', 'done', 'cancelled'],
    done: ['inprogress'],
    cancelled: [],
};

export default function TaskBoard({ columns, filters, options }: TaskBoardProps) {
    const [search, setSearch] = useState(filters.search);
    const [projectId, setProjectId] = useState(filters.project_id);
    const [picUserId, setPicUserId] = useState(filters.pic_user_id);
    const [taskTypeId, setTaskTypeId] = useState(filters.task_type_id);
    const [due, setDue] = useState(filters.due);
    const [boardColumns, setBoardColumns] = useState(columns);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [moveReason, setMoveReason] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [detailTask, setDetailTask] = useState<TaskKanbanCard | null>(null);
    const [moveError, setMoveError] = useState<string | null>(null);

    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const { auth } = usePage().props as unknown as { auth: Auth };
    const canManageTasks = auth.user?.permissions.includes('manage_tasks') ?? false;

    useEffect(() => {
        setBoardColumns(columns);
    }, [columns]);

    useEcho(
        'task-board',
        ['.task.board.changed'],
        (event: BoardChangedEvent) => {
            if (event.actor_id === auth.user?.id) return;

            applyTaskBoardEvent(event);
        },
        [auth.user?.id, due],
    );

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get(
            taskBoardIndex.url(),
            { search, project_id: projectId, pic_user_id: picUserId, task_type_id: taskTypeId, due },
            { preserveScroll: true, preserveState: true }
        );
    }

    function requestStatus(task: TaskKanbanCard, status: ProjectTaskStatus) {
        if (task.status === status) return;

        if (isBackwardTaskStatus(task.status, status)) {
            setPendingMove({ task, status });
            setMoveReason('');

            return;
        }

        performMove(task, status);
    }

    function submitRollbackMove(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!pendingMove) return;

        performMove(pendingMove.task, pendingMove.status, moveReason);
    }

    function performMove(task: TaskKanbanCard, status: ProjectTaskStatus, reason = '') {
        const previousColumns = boardColumns;

        setMoveError(null);
        setBoardColumns(moveTaskForCurrentFilter(previousColumns, task.id, status, due));

        router.patch(
            updateTaskStatus.url(task.id),
            { status, reason },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['flash'],
                onError: (errors) => {
                    setBoardColumns(previousColumns);
                    setMoveError(firstError(errors) ?? 'Task status could not be updated.');
                },
                onSuccess: () => setPendingMove(null),
            },
        );
    }

    function handleDrop(taskId: string, laneStatus: string) {
        const task = boardColumns
            .flatMap((column) => column.tasks)
            .find((item) => String(item.id) === taskId);
        const status = laneStatus as ProjectTaskStatus;

        if (!task || task.status === status) return;

        requestStatus(task, status);
    }

    function applyTaskBoardEvent(event: BoardChangedEvent) {
        if (!event.task_id) return;

        if (event.action === 'task_deleted') {
            setBoardColumns((current) => removeTaskFromColumns(current, event.task_id as number));

            return;
        }

        if (event.action === 'task_updated' && event.task) {
            setBoardColumns((current) => upsertTaskForCurrentFilter(current, event.task as TaskKanbanCard, due));

            return;
        }

        if (!event.new_status) return;

        setBoardColumns((current) =>
            moveTaskForCurrentFilter(current, event.task_id as number, event.new_status as ProjectTaskStatus, due)
        );
    }

    function toggleTaskSelection(taskId: number) {
        setSelectedTaskIds((current) =>
            current.includes(taskId)
                ? current.filter((id) => id !== taskId)
                : [...current, taskId],
        );
    }

    function removeTask(task: TaskKanbanCard) {
        if (!window.confirm(`Delete task "${task.name}"?`)) return;

        router.delete(deleteTask.url(task.id), { preserveScroll: true });
    }

    function updateBoardTask(task: TaskKanbanCard) {
        setBoardColumns((current) => upsertTaskForCurrentFilter(current, task, due));
        setDetailTask(task);
    }

    function bulkRemoveTasks() {
        if (selectedTaskIds.length === 0) return;

        if (!window.confirm(`Delete ${selectedTaskIds.length} selected task(s)?`)) return;

        router.delete(bulkDeleteTasks.url(), {
            data: { task_ids: selectedTaskIds },
            preserveScroll: true,
            onSuccess: () => setSelectedTaskIds([]),
        });
    }

    return (
        <AppLayout title="Tasks">
            <div className="space-y-6">

                {/* Header */}
                <PageHeader
                    eyebrow="Task Kanban"
                    title="Tasks Board"
                    description="Kelola dan pantau progress task lintas project secara visual."
                    actions={
                        projectId ? (
                            <Link
                                href={createProjectTasks.url(Number(projectId))}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-primary/90 active:scale-95"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Bulk Add Tasks</span>
                            </Link>
                        ) : undefined
                    }
                />

                {/* Alerts */}
                {flash?.success && <Alert tone="success">{flash.success}</Alert>}
                {errors?.status && <Alert tone="danger">{errors.status}</Alert>}
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
                            placeholder="Search tasks..."
                            className={`${inputClass} w-full pl-8`}
                        />
                    </div>

                    <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass}>
                        <option value="">All Projects</option>
                        {options.projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>

                    <select value={picUserId} onChange={(event) => setPicUserId(event.target.value)} className={inputClass}>
                        <option value="">All PICs</option>
                        {options.users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>

                    <select value={taskTypeId} onChange={(event) => setTaskTypeId(event.target.value)} className={inputClass}>
                        <option value="">All Types</option>
                        {options.task_types.map((type) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>

                    <select value={due} onChange={(event) => setDue(event.target.value)} className={inputClass}>
                        {options.due_filters.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
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
                {canManageTasks && selectedTaskIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-2 text-xs font-semibold text-indigo-900 shadow-xs">
                        <span>{selectedTaskIds.length} task(s) selected</span>
                        <button
                            type="button"
                            onClick={bulkRemoveTasks}
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
                            count={column.tasks.length}
                            tone={taskTone[column.status]}
                        >
                            {column.tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    selected={selectedTaskIds.includes(task.id)}
                                    canManageTasks={canManageTasks}
                                    onToggleSelected={toggleTaskSelection}
                                    onDelete={removeTask}
                                    onShowDetail={setDetailTask}
                                />
                            ))}
                            {column.tasks.length === 0 && (
                                <EmptyLane>No tasks in this lane</EmptyLane>
                            )}
                        </KanbanLane>
                    ))}
                </KanbanBoard>

                {/* Rollback Modal */}
                <Modal open={pendingMove !== null} title="Rollback Task Status" onClose={() => setPendingMove(null)}>
                    <form onSubmit={submitRollbackMove} className="space-y-4 pt-2">
                        <p className="text-xs leading-relaxed text-slate-600">
                            Task akan dipindahkan mundur dari status{' '}
                            <span className="font-bold text-slate-900">{pendingMove?.task.status}</span> ke{' '}
                            <span className="font-bold text-slate-900">{pendingMove?.status}</span>.
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

                <SlideOver
                    open={detailTask !== null}
                    title={detailTask?.name ?? 'Task Detail'}
                    onClose={() => setDetailTask(null)}
                >
                    {detailTask && (
                        <TaskDetailPanel
                            task={detailTask}
                            canManageTasks={canManageTasks}
                            options={options}
                            onUpdated={updateBoardTask}
                        />
                    )}
                </SlideOver>

            </div>
        </AppLayout>
    );
}

{/* Jira-Style Task Card Component - Disamakan 100% dengan ProjectCard */}
function TaskCard({
    task,
    selected,
    canManageTasks,
    onToggleSelected,
    onDelete,
    onShowDetail,
}: {
    task: TaskKanbanCard;
    selected: boolean;
    canManageTasks: boolean;
    onToggleSelected: (taskId: number) => void;
    onDelete: (task: TaskKanbanCard) => void;
    onShowDetail: (task: TaskKanbanCard) => void;
}) {
    return (
        <DraggableKanbanCard id={String(task.id)} selected={selected}>
            <div className="group relative z-10 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:z-20 hover:border-slate-300 hover:shadow-md active:z-50 active:scale-[1.02] active:shadow-xl">
                {/* Card Header */}
                <div className="ml-8 mt-1 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {canManageTasks && (
                            <input
                                type="checkbox"
                                checked={selected}
                                onPointerDown={(e) => e.stopPropagation()}
                                onChange={() => onToggleSelected(task.id)}
                                className="h-3.5 w-3.5 cursor-pointer rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                                aria-label={`Select ${task.name}`}
                            />
                        )}

                        {/* Project Badge */}
                        {task.project ? (
                            <Link
                                href={projectShow.url(task.project.id)}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-primary hover:text-white"
                            >
                                <FolderKanban className="h-3 w-3" />
                                <span className="max-w-[100px] truncate">{task.project.name}</span>
                            </Link>
                        ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                No Project
                            </span>
                        )}
                    </div>

                    {/* Action Buttons (Top Right) */}
                    <div
                        className="flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            title="Task Detail"
                            onClick={() => onShowDetail(task)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <Info className="h-3.5 w-3.5" />
                        </button>
                        {canManageTasks && (
                            <button
                                type="button"
                                title="Delete Task"
                                onClick={() => onDelete(task)}
                                className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Task Title */}
                <div className="mt-2.5 block text-xs font-bold text-slate-900 line-clamp-2">
                    {task.name}
                </div>

                {/* Metadata (Task Type & Deadline) */}
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            {task.task_type ? (
                                <>
                                    <span
                                        className="h-2 w-2 rounded-full shadow-xs"
                                        style={{ backgroundColor: task.task_type.color }}
                                    ></span>
                                    <span className="max-w-[120px] truncate font-semibold">
                                        {task.task_type.name}
                                    </span>
                                </>
                            ) : (
                                <span className="font-medium text-slate-400">No Type</span>
                            )}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {task.plan_end_date ?? '-'}
                        </span>
                    </div>
                </div>

                {/* Footer Jira Style: PIC Avatar */}
                <div className="mt-3 flex items-center justify-end border-t border-slate-50 pt-2">
                    {/* PIC Avatar */}
                    <div
                        title={`PIC: ${task.pic?.name ?? task.project?.pm?.name ?? 'Unassigned'}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 ring-2 ring-white shadow-xs"
                    >
                        {(task.pic?.name ?? task.project?.pm?.name ?? '?').charAt(0)}
                    </div>
                </div>

            </div>
        </DraggableKanbanCard>
    );
}

function TaskDetailPanel({
    task,
    canManageTasks,
    options,
    onUpdated,
}: {
    task: TaskKanbanCard;
    canManageTasks: boolean;
    options: TaskBoardProps['options'];
    onUpdated: (task: TaskKanbanCard) => void;
}) {
    const form = useForm<TaskFormPayload>(taskFormPayload(task));
    const projectId = task.project?.id ?? null;
    const projectMembers = options.project_members.filter((member) => member.project_id === projectId);
    const taskTypes = options.task_types.filter((taskType) => taskType.project_id == null || taskType.project_id === projectId);
    const selectedTaskType = taskTypes.find((taskType) => String(taskType.id) === form.data.task_type_id);
    const selectedPic = options.users.find((user) => String(user.id) === form.data.pic_user_id) ?? null;
    const isBackwardMove = isBackwardTaskStatus(task.status, form.data.status);

    useEffect(() => {
        form.clearErrors();
        form.setData(taskFormPayload(task));
    }, [task.id]);

    function submitTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextTask: TaskKanbanCard = normalizeEditedTask(task, {
            ...form.data,
            reason: isBackwardMove ? form.data.reason : '',
        }, selectedTaskType ?? null, selectedPic);

        form.transform((data) => ({
            ...data,
            reason: isBackwardMove ? data.reason : '',
        }));
        form.patch(updateTask.url(task.id), {
            preserveScroll: true,
            preserveState: true,
            only: ['flash'],
            onSuccess: () => {
                form.clearErrors();
                onUpdated(nextTask);
            },
        });
    }

    return (
        <div className="space-y-5 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">
                    Status
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">
                    {task.status}
                </div>
            </div>

            {canManageTasks ? (
                <form onSubmit={submitTask} className="space-y-4">
                    <div className="grid gap-3">
                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            Task Name
                            <input
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                className={inputClass}
                            />
                            {form.errors.name && <span className="text-[11px] text-red-600">{form.errors.name}</span>}
                        </label>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                Task Type
                                <select
                                    value={form.data.task_type_id}
                                    onChange={(event) => form.setData('task_type_id', event.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">No Type</option>
                                    {taskTypes.map((taskType) => (
                                        <option key={taskType.id} value={taskType.id}>
                                            {taskType.name}
                                        </option>
                                    ))}
                                </select>
                                {form.errors.task_type_id && <span className="text-[11px] text-red-600">{form.errors.task_type_id}</span>}
                            </label>

                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                PIC
                                <select
                                    value={form.data.pic_user_id}
                                    onChange={(event) => form.setData('pic_user_id', event.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Unassigned</option>
                                    {projectMembers.map((member) => (
                                        <option key={member.user_id} value={member.user_id}>
                                            {member.name}
                                        </option>
                                    ))}
                                </select>
                                {form.errors.pic_user_id && <span className="text-[11px] text-red-600">{form.errors.pic_user_id}</span>}
                            </label>
                        </div>

                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            Status
                            <select
                                value={form.data.status}
                                onChange={(event) => form.setData('status', event.target.value as ProjectTaskStatus)}
                                className={inputClass}
                            >
                                {options.statuses.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            {form.errors.status && <span className="text-[11px] text-red-600">{form.errors.status}</span>}
                        </label>

                        {isBackwardMove && (
                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                Reason
                                <textarea
                                    value={form.data.reason}
                                    onChange={(event) => form.setData('reason', event.target.value)}
                                    placeholder="Opsional untuk rollback status"
                                    className={`${inputClass} min-h-[88px] py-2`}
                                />
                                {form.errors.reason && <span className="text-[11px] text-red-600">{form.errors.reason}</span>}
                            </label>
                        )}

                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            Description
                            <textarea
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                                className={`${inputClass} min-h-[96px] py-2`}
                            />
                            {form.errors.description && <span className="text-[11px] text-red-600">{form.errors.description}</span>}
                        </label>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                Plan Start
                                <input
                                    type="date"
                                    value={form.data.plan_start_date}
                                    onChange={(event) => form.setData('plan_start_date', event.target.value)}
                                    className={inputClass}
                                />
                                {form.errors.plan_start_date && <span className="text-[11px] text-red-600">{form.errors.plan_start_date}</span>}
                            </label>

                            <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                Plan End
                                <input
                                    type="date"
                                    value={form.data.plan_end_date}
                                    onChange={(event) => form.setData('plan_end_date', event.target.value)}
                                    className={inputClass}
                                />
                                {form.errors.plan_end_date && <span className="text-[11px] text-red-600">{form.errors.plan_end_date}</span>}
                            </label>
                        </div>
                    </div>

                    <DetailGrid
                        rows={[
                            ['Project', task.project?.name ?? '-'],
                            ['Customer', task.project?.customer ?? '-'],
                            ['Project Status', task.project?.status ?? '-'],
                            ['PM', task.project?.pm?.name ?? '-'],
                            ['Actual Start', task.actual_start_date ?? '-'],
                            ['Actual End', task.actual_end_date ?? '-'],
                            ['Attachments', `${task.attachments_count} file(s)`],
                        ]}
                    />

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing ? 'Saving...' : 'Save Task'}
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <DetailGrid
                        rows={[
                            ['Project', task.project?.name ?? '-'],
                            ['Customer', task.project?.customer ?? '-'],
                            ['Project Status', task.project?.status ?? '-'],
                            ['Task Type', task.task_type?.name ?? '-'],
                            ['PIC', task.pic?.name ?? task.project?.pm?.name ?? '-'],
                            ['PM', task.project?.pm?.name ?? '-'],
                            ['Plan Start', task.plan_start_date ?? '-'],
                            ['Plan End', task.plan_end_date ?? '-'],
                            ['Actual Start', task.actual_start_date ?? '-'],
                            ['Actual End', task.actual_end_date ?? '-'],
                            ['Attachments', `${task.attachments_count} file(s)`],
                        ]}
                    />

                    <div>
                        <div className="text-xs font-semibold uppercase text-slate-500">
                            Description
                        </div>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700">
                            {task.description || 'No description.'}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
    return (
        <dl className="grid gap-3">
            {rows.map(([label, value]) => (
                <div
                    key={label}
                    className="grid gap-1 rounded-lg border border-slate-200 bg-white p-3"
                >
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                        {label}
                    </dt>
                    <dd className="text-sm font-medium text-slate-900">
                        {value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function taskFormPayload(task: TaskKanbanCard): TaskFormPayload {
    return {
        name: task.name,
        task_type_id: task.task_type?.id ? String(task.task_type.id) : '',
        pic_user_id: task.pic?.id ? String(task.pic.id) : '',
        status: task.status,
        description: task.description ?? '',
        plan_start_date: task.plan_start_date ?? '',
        plan_end_date: task.plan_end_date ?? '',
        reason: '',
    };
}

function normalizeEditedTask(
    task: TaskKanbanCard,
    data: TaskFormPayload,
    taskType: TaskBoardProps['options']['task_types'][number] | null,
    pic: TaskKanbanCard['pic'],
): TaskKanbanCard {
    return {
        ...task,
        name: data.name,
        status: data.status,
        description: data.description || null,
        plan_start_date: data.plan_start_date || null,
        plan_end_date: data.plan_end_date || null,
        actual_start_date: optimisticActualStartDate(task, data.status),
        actual_end_date: optimisticActualEndDate(task, data.status),
        pic,
        task_type: taskType
            ? {
                  id: taskType.id,
                  name: taskType.name,
                  color: taskType.color,
              }
            : null,
        allowed_statuses: taskAllowedStatuses(data.status),
    };
}

function optimisticActualStartDate(task: TaskKanbanCard, status: ProjectTaskStatus) {
    if (status === 'todo' || status === 'assigned') {
        return null;
    }

    if (status === 'inprogress' || status === 'done') {
        return task.actual_start_date ?? todayString();
    }

    return task.actual_start_date;
}

function optimisticActualEndDate(task: TaskKanbanCard, status: ProjectTaskStatus) {
    if (status === 'done') {
        return task.actual_end_date ?? todayString();
    }

    return null;
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

// Helper Functions
function moveTask(columns: TaskBoardProps['columns'], taskId: number, targetStatus: ProjectTaskStatus) {
    let movedTask: TaskKanbanCard | null = null;
    const nextColumns = columns.map((column) => {
        const tasks = column.tasks.filter((task) => {
            if (task.id !== taskId) return true;

            movedTask = {
                ...task,
                status: targetStatus,
                allowed_statuses: taskAllowedStatuses(targetStatus),
            };

            return false;
        });

        return { ...column, tasks };
    });

    if (!movedTask) return columns;

    const moved = movedTask;

    return nextColumns.map((column) =>
        column.status === targetStatus ? { ...column, tasks: [moved, ...column.tasks] } : column,
    );
}

function moveTaskForCurrentFilter(columns: TaskBoardProps['columns'], taskId: number, targetStatus: ProjectTaskStatus, dueFilter: string) {
    if ((dueFilter === 'overdue' || dueFilter === 'week') && (targetStatus === 'done' || targetStatus === 'cancelled')) {
        return removeTaskFromColumns(columns, taskId);
    }
    
    return moveTask(columns, taskId, targetStatus);
}

function upsertTaskForCurrentFilter(columns: TaskBoardProps['columns'], task: TaskKanbanCard, dueFilter: string) {
    const existsOnBoard = columns.some((column) => column.tasks.some((item) => item.id === task.id));

    if (!existsOnBoard) {
        return columns;
    }

    if ((dueFilter === 'overdue' || dueFilter === 'week') && (task.status === 'done' || task.status === 'cancelled')) {
        return removeTaskFromColumns(columns, task.id);
    }

    const withoutTask = removeTaskFromColumns(columns, task.id);

    return withoutTask.map((column) =>
        column.status === task.status ? { ...column, tasks: [task, ...column.tasks] } : column,
    );
}

function removeTaskFromColumns(columns: TaskBoardProps['columns'], taskId: number) {
    return columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
    }));
}

function isBackwardTaskStatus(currentStatus: ProjectTaskStatus, targetStatus: ProjectTaskStatus) {
    return taskStatusRank[targetStatus] < taskStatusRank[currentStatus];
}

function taskAllowedStatuses(status: ProjectTaskStatus) {
    return taskForwardTargets[status];
}

function firstError(errors: Record<string, string>) {
    return Object.values(errors)[0] ?? null;
}

function todayString() {
    return new Date().toISOString().slice(0, 10);
}
