import { Link, router, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import updateTaskStatus from '@/actions/App/Http/Controllers/ProjectTaskStatusController';
import taskBoardIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import { KanbanBoard, KanbanCard, KanbanLane } from '@/components/kanban';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type { ProjectTaskStatus, TaskBoardProps, TaskKanbanCard } from '@/types';

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
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;

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

    return (
        <AppLayout title="Tasks">
            <PageHeader
                eyebrow="Task Kanban"
                title="Tasks"
                description="Kanban lintas project dengan status action terkontrol."
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

            <KanbanBoard>
                {columns.map((column) => (
                    <KanbanLane
                        key={column.status}
                        title={column.label}
                        count={column.tasks.length}
                        tone={taskTone[column.status]}
                    >
                        {column.tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatus={patchStatus}
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
}: {
    task: TaskKanbanCard;
    onStatus: (task: TaskKanbanCard, status: ProjectTaskStatus) => void;
}) {
    return (
        <KanbanCard>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-semibold text-slate-950">{task.name}</div>
                    {task.project && (
                        <Link
                            href={projectShow.url(task.project.id)}
                            className="mt-1 block text-xs text-primary hover:underline"
                        >
                            {task.project.name}
                        </Link>
                    )}
                </div>
                {task.task_type && (
                    <span
                        className="rounded-full px-2 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: task.task_type.color }}
                    >
                        {task.task_type.name}
                    </span>
                )}
            </div>
            <div className="mt-4 grid gap-2 text-xs text-slate-600">
                <div className="flex justify-between gap-3">
                    <span>Customer</span>
                    <span className="font-medium text-slate-800">
                        {task.project?.customer ?? '-'}
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>PIC</span>
                    <span className="font-medium text-slate-800">
                        {task.pic?.name ?? '-'}
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Plan</span>
                    <span className="font-medium text-slate-800">
                        {task.plan_start_date ?? '-'} / {task.plan_end_date ?? '-'}
                    </span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Files</span>
                    <span className="font-medium text-slate-800">
                        {task.attachments_count}
                    </span>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {task.project && (
                    <Link
                        href={preparationShow.url(task.project.id)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                        Project
                    </Link>
                )}
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
            </div>
        </KanbanCard>
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
