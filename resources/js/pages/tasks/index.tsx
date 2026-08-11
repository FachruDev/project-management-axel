import { Link, router, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { create as createProjectTasks } from '@/actions/App/Http/Controllers/ProjectBulkTaskController';
import bulkDeleteTasks from '@/actions/App/Http/Controllers/ProjectTaskBulkDeleteController';
import deleteTask from '@/actions/App/Http/Controllers/ProjectTaskDeleteController';
import updateTaskStatus from '@/actions/App/Http/Controllers/ProjectTaskStatusController';
import taskBoardIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import {
    DraggableKanbanCard,
    KanbanBoard,
    KanbanLane,
} from '@/components/kanban';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type {
    Auth,
    ProjectTaskStatus,
    TaskBoardProps,
    TaskKanbanCard,
} from '@/types';

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const taskTone: Record<ProjectTaskStatus, string> = {
    todo: 'border-slate-200 bg-pastel-slate text-slate-700',
    assigned: 'border-blue-200 bg-pastel-blue text-primary',
    inprogress: 'border-amber-200 bg-pastel-amber text-amber-800',
    done: 'border-emerald-200 bg-pastel-green text-emerald-700',
    cancelled: 'border-red-200 bg-pastel-red text-red-700',
};

export default function TaskBoard({ columns, filters, options }: TaskBoardProps) {
    const [search, setSearch] = useState(filters.search);
    const [projectId, setProjectId] = useState(filters.project_id);
    const [picUserId, setPicUserId] = useState(filters.pic_user_id);
    const [taskTypeId, setTaskTypeId] = useState(filters.task_type_id);
    const [due, setDue] = useState(filters.due);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const { auth } = usePage().props as unknown as { auth: Auth };
    const canManageTasks = auth.user?.permissions.includes('manage_tasks') ?? false;

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            taskBoardIndex.url(),
            {
                search,
                project_id: projectId,
                pic_user_id: picUserId,
                task_type_id: taskTypeId,
                due,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function patchStatus(task: TaskKanbanCard, status: ProjectTaskStatus) {
        router.patch(
            updateTaskStatus.url(task.id),
            { status },
            { preserveScroll: true },
        );
    }

    function handleDrop(taskId: string, laneStatus: string) {
        const task = columns
            .flatMap((column) => column.tasks)
            .find((item) => String(item.id) === taskId);
        const status = laneStatus as ProjectTaskStatus;

        if (! task || task.status === status) {
            return;
        }

        patchStatus(task, status);
    }

    function toggleTaskSelection(taskId: number) {
        setSelectedTaskIds((current) =>
            current.includes(taskId)
                ? current.filter((id) => id !== taskId)
                : [...current, taskId],
        );
    }

    function removeTask(task: TaskKanbanCard) {
        if (! window.confirm(`Delete task "${task.name}"?`)) {
            return;
        }

        router.delete(deleteTask.url(task.id), { preserveScroll: true });
    }

    function bulkRemoveTasks() {
        if (selectedTaskIds.length === 0) {
            return;
        }

        if (! window.confirm(`Delete ${selectedTaskIds.length} selected task(s)?`)) {
            return;
        }

        router.delete(bulkDeleteTasks.url(), {
            data: { task_ids: selectedTaskIds },
            preserveScroll: true,
            onSuccess: () => setSelectedTaskIds([]),
        });
    }

    return (
        <AppLayout title="Tasks">
            <PageHeader
                eyebrow="Task Kanban"
                title="Tasks"
                description="Kanban lintas project dengan status action terkontrol."
                actions={
                    projectId ? (
                        <Link
                            href={createProjectTasks.url(Number(projectId))}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                            Bulk Add Tasks
                        </Link>
                    ) : undefined
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.status && <Alert tone="danger">{errors.status}</Alert>}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 xl:grid-cols-[1fr_220px_220px_180px_180px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search task"
                    className={inputClass}
                />
                <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Projects</option>
                    {options.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>
                <select
                    value={picUserId}
                    onChange={(event) => setPicUserId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All PIC</option>
                    {options.users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <select
                    value={taskTypeId}
                    onChange={(event) => setTaskTypeId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Types</option>
                    {options.task_types.map((type) => (
                        <option key={type.id} value={type.id}>
                            {type.name}
                        </option>
                    ))}
                </select>
                <select
                    value={due}
                    onChange={(event) => setDue(event.target.value)}
                    className={inputClass}
                >
                    {options.due_filters.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
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

            {canManageTasks && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-sm text-slate-600">
                        {selectedTaskIds.length} task selected
                    </div>
                    <button
                        type="button"
                        disabled={selectedTaskIds.length === 0}
                        onClick={bulkRemoveTasks}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-pastel-red disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Bulk Delete
                    </button>
                </div>
            )}

            <KanbanBoard onDropItem={handleDrop}>
                {columns.map((column) => (
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
                                onStatus={patchStatus}
                                selected={selectedTaskIds.includes(task.id)}
                                canManageTasks={canManageTasks}
                                onToggleSelected={toggleTaskSelection}
                                onDelete={removeTask}
                            />
                        ))}
                        {column.tasks.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500">
                                No task in this lane.
                            </div>
                        )}
                    </KanbanLane>
                ))}
            </KanbanBoard>
        </AppLayout>
    );
}

function TaskCard({
    task,
    onStatus,
    selected,
    canManageTasks,
    onToggleSelected,
    onDelete,
}: {
    task: TaskKanbanCard;
    onStatus: (task: TaskKanbanCard, status: ProjectTaskStatus) => void;
    selected: boolean;
    canManageTasks: boolean;
    onToggleSelected: (taskId: number) => void;
    onDelete: (task: TaskKanbanCard) => void;
}) {
    return (
        <DraggableKanbanCard id={String(task.id)} selected={selected}>
            <div className="space-y-4 pr-8">
                <div className="flex items-start gap-3">
                    {canManageTasks && (
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelected(task.id)}
                            className="mt-1"
                            aria-label={`Select ${task.name}`}
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-5 text-slate-950">
                            {task.name}
                        </div>
                        {task.project && (
                            <Link
                                href={projectShow.url(task.project.id)}
                                className="mt-1 block truncate text-xs text-primary hover:underline"
                            >
                                {task.project.name}
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid gap-2 text-xs text-slate-600">
                    <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Task Type</span>
                        {task.task_type ? (
                            <span
                                className="max-w-[160px] truncate rounded-full px-2 py-0.5 font-medium text-white"
                                style={{ backgroundColor: task.task_type.color }}
                            >
                                {task.task_type.name}
                            </span>
                        ) : (
                            <span className="font-medium text-slate-800">-</span>
                        )}
                    </div>
                    <CompactRow label="Deadline" value={task.plan_end_date ?? '-'} />
                    <CompactRow
                        label="PIC"
                        value={task.pic?.name ?? task.project?.pm?.name ?? '-'}
                    />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {task.allowed_statuses.map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => onStatus(task, status)}
                            className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                        >
                            {status.replaceAll('_', ' ')}
                        </button>
                    ))}
                    {canManageTasks && (
                        <button
                            type="button"
                            onClick={() => onDelete(task)}
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
            <span className="max-w-[170px] truncate text-right font-medium text-slate-800">
                {value}
            </span>
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
