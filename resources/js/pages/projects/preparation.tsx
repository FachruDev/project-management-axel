import { Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { index as projectIndex, show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { create as createProjectTasks } from '@/actions/App/Http/Controllers/ProjectBulkTaskController';
import { update } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import deleteTask from '@/actions/App/Http/Controllers/ProjectTaskDeleteController';
import updateTaskStatus from '@/actions/App/Http/Controllers/ProjectTaskStatusController';
import {
    destroy as destroyTaskType,
    store as storeTaskType,
    update as updateTaskType,
} from '@/actions/App/Http/Controllers/ProjectTaskTypeController';
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
    PreparationAccessRule,
    PreparationMember,
    PreparationTask,
    ProjectTaskTypeOption,
    ProjectPreparationProps,
} from '@/types';

type PreparationPayload = {
    pm_user_id: string;
    request_user_id: string;
    location: string;
    urs_date: string;
    urs_number: string;
    urs_file: File | null;
    request_evidence: File[];
    plan_start_date: string;
    plan_end_date: string;
    uat_date: string;
    uat_file: File | null;
    bast_date: string;
    bast_file: File | null;
    members: PreparationMember[];
    access_rules: PreparationAccessRule[];
    tasks: PreparationTask[];
};

type TaskTypePayload = {
    name: string;
    color: string;
    description: string;
    is_active: boolean;
};

const blankTaskType: TaskTypePayload = {
    name: '',
    color: '#0a57a4',
    description: '',
    is_active: true,
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const taskTone: Record<PreparationTask['status'], string> = {
    todo: 'border-slate-200 bg-pastel-slate text-slate-700',
    assigned: 'border-blue-200 bg-pastel-blue text-primary',
    inprogress: 'border-amber-200 bg-pastel-amber text-amber-800',
    done: 'border-emerald-200 bg-pastel-green text-emerald-700',
    cancelled: 'border-red-200 bg-pastel-red text-red-700',
};

export default function ProjectPreparation({
    project,
    options,
}: ProjectPreparationProps) {
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const [taskTypeModalOpen, setTaskTypeModalOpen] = useState(false);
    const [editingTaskType, setEditingTaskType] =
        useState<ProjectTaskTypeOption | null>(null);
    const form = useForm<PreparationPayload>({
        pm_user_id: String(project.pm_user_id ?? ''),
        request_user_id: String(project.request_user_id ?? ''),
        location: project.location ?? '',
        urs_date: project.urs_date ?? '',
        urs_number: project.urs_number ?? '',
        urs_file: null,
        request_evidence: [],
        plan_start_date: project.plan_start_date ?? '',
        plan_end_date: project.plan_end_date ?? '',
        uat_date: project.uat_date ?? '',
        uat_file: null,
        bast_date: project.bast_date ?? '',
        bast_file: null,
        members:
            project.members.length > 0
                ? project.members.map((member) => ({
                      ...member,
                      user_id: String(member.user_id),
                      incentive_project_role_rule_id: String(
                          member.incentive_project_role_rule_id,
                      ),
                      incentive_pic_level_rule_id:
                          member.incentive_pic_level_rule_id === null
                              ? ''
                              : String(member.incentive_pic_level_rule_id),
                  }))
                : [blankMember()],
        access_rules: project.access_rules.map((rule) => ({
            ...rule,
            user_id: String(rule.user_id),
        })),
        tasks: project.tasks.map((task) => ({
            ...task,
            task_type_id: task.task_type_id === null ? '' : String(task.task_type_id),
            pic_user_id: task.pic_user_id === null ? '' : String(task.pic_user_id),
            attachments: [],
        })),
    });
    const taskTypeForm = useForm<TaskTypePayload>(blankTaskType);

    const showUat =
        ['planning', 'ongoing', 'awaiting_bast', 'ready_to_close', 'closed'].includes(
            project.status,
        ) || Boolean(form.data.uat_date);
    const showBast = Boolean(form.data.uat_date) || Boolean(project.attachments.uat_file?.length);
    const taskColumns = options.task_statuses.map((statusOption) => ({
        ...statusOption,
        tasks: form.data.tasks.filter((task) => task.status === statusOption.value),
    }));

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.transform((data) => ({ ...data, _method: 'PUT' }));
        form.post(update.url(project.id), {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    function setMember(index: number, value: PreparationMember) {
        form.setData(
            'members',
            form.data.members.map((member, memberIndex) =>
                memberIndex === index ? value : member,
            ),
        );
    }

    function setAccessRule(index: number, value: PreparationAccessRule) {
        form.setData(
            'access_rules',
            form.data.access_rules.map((rule, ruleIndex) =>
                ruleIndex === index ? value : rule,
            ),
        );
    }

    function setTask(index: number, value: PreparationTask) {
        form.setData(
            'tasks',
            form.data.tasks.map((task, taskIndex) =>
                taskIndex === index ? value : task,
            ),
        );
    }

    function patchTaskStatus(task: PreparationTask, status: PreparationTask['status']) {
        if (!task.id) {
            const taskIndex = form.data.tasks.indexOf(task);

            if (taskIndex >= 0) {
                setTask(taskIndex, { ...task, status });
            }

            return;
        }

        router.patch(
            updateTaskStatus.url(task.id),
            { status },
            { preserveScroll: true },
        );
    }

    function handleTaskDrop(taskId: string, laneStatus: string) {
        const status = laneStatus as PreparationTask['status'];

        if (taskId.startsWith('new-')) {
            const taskIndex = Number(taskId.replace('new-', ''));
            const task = form.data.tasks[taskIndex];

            if (task) {
                setTask(taskIndex, { ...task, status });
            }

            return;
        }

        const task = form.data.tasks.find((item) => String(item.id) === taskId);

        if (! task || task.status === status) {
            return;
        }

        patchTaskStatus(task, status);
    }

    function openTaskTypeModal(taskType?: ProjectTaskTypeOption) {
        setEditingTaskType(taskType ?? null);
        taskTypeForm.clearErrors();
        taskTypeForm.setData(
            taskType
                ? {
                      name: taskType.name,
                      color: taskType.color,
                      description: taskType.description ?? '',
                      is_active: taskType.is_active ?? true,
                  }
                : blankTaskType,
        );
        setTaskTypeModalOpen(true);
    }

    function submitTaskType(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (editingTaskType) {
            taskTypeForm.patch(
                updateTaskType.url({
                    project: project.id,
                    taskType: editingTaskType.id,
                }),
                {
                    preserveScroll: true,
                    onSuccess: () => setTaskTypeModalOpen(false),
                },
            );

            return;
        }

        taskTypeForm.post(storeTaskType.url(project.id), {
            preserveScroll: true,
            onSuccess: () => setTaskTypeModalOpen(false),
        });
    }

    function removeTaskType(taskType: ProjectTaskTypeOption) {
        router.delete(
            destroyTaskType.url({ project: project.id, taskType: taskType.id }),
            { preserveScroll: true },
        );
    }

    function removeTask(task: PreparationTask) {
        if (! task.id) {
            form.setData(
                'tasks',
                form.data.tasks.filter((item) => item !== task),
            );

            return;
        }

        if (! window.confirm(`Delete task "${task.name}"?`)) {
            return;
        }

        router.delete(deleteTask.url(task.id), { preserveScroll: true });
    }

    return (
        <AppLayout title={`${project.name} Preparation`}>
            <PageHeader
                eyebrow="Project Preparation"
                title={project.name}
                actions={
                    <>
                        <ProjectStatusBadge status={project.status} />
                        <Link
                            href={projectShow.url(project.id)}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Detail
                        </Link>
                        <Link
                            href={projectIndex.url()}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Projects
                        </Link>
                    </>
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

            <form onSubmit={submit} className="space-y-5">
                <Panel title="Basic Information">
                    <div className="grid gap-4 md:grid-cols-3">
                        <ReadonlyItem label="Project Name" value={project.name} required />
                        <ReadonlyItem
                            label="Project Date"
                            value={project.project_date}
                            required
                        />
                        <ReadonlyItem label="Mandays" value={`${project.mandays} MD`} required />
                    </div>
                </Panel>

                <Panel title="Customer & Incentive">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ReadonlyItem
                            label="Customers"
                            value={
                                project.customers
                                    .map((customer) => customer.name)
                                    .join(', ') || '-'
                            }
                            required
                        />
                        <ReadonlyItem
                            label="Incentive Profile"
                            value={
                                project.incentive_profile
                                    ? `${project.incentive_profile.code} v${project.incentive_profile.version} - ${project.incentive_profile.name}`
                                    : '-'
                            }
                            required
                        />
                    </div>
                </Panel>

                <Panel title="PIC & Location">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="PIC PM" error={form.errors.pm_user_id} required>
                            <select
                                value={form.data.pm_user_id}
                                onChange={(event) =>
                                    form.setData('pm_user_id', event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Select PM</option>
                                {options.users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="PIC Request" error={form.errors.request_user_id}>
                            <select
                                value={form.data.request_user_id}
                                onChange={(event) =>
                                    form.setData('request_user_id', event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Select requester</option>
                                {options.users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Location" error={form.errors.location} required>
                            <input
                                value={form.data.location}
                                onChange={(event) =>
                                    form.setData('location', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel title="URS Information">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="URS Number" error={form.errors.urs_number} required>
                            <input
                                value={form.data.urs_number}
                                onChange={(event) =>
                                    form.setData('urs_number', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="URS Date" error={form.errors.urs_date} required>
                            <input
                                type="date"
                                value={form.data.urs_date}
                                onChange={(event) =>
                                    form.setData('urs_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="URS File" error={form.errors.urs_file} required>
                            <input
                                type="file"
                                onChange={(event) =>
                                    form.setData(
                                        'urs_file',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel title="Project Timeline">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Plan Start" error={form.errors.plan_start_date} required>
                            <input
                                type="date"
                                value={form.data.plan_start_date}
                                onChange={(event) =>
                                    form.setData('plan_start_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Plan End" error={form.errors.plan_end_date} required>
                            <input
                                type="date"
                                value={form.data.plan_end_date}
                                onChange={(event) =>
                                    form.setData('plan_end_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel title="Request Evidence">
                    <Field label="Request Evidence" error={form.errors.request_evidence}>
                        <input
                            type="file"
                            multiple
                            onChange={(event) =>
                                form.setData(
                                    'request_evidence',
                                    Array.from(event.target.files ?? []),
                                )
                            }
                            className={inputClass}
                        />
                    </Field>
                </Panel>

                {showUat && (
                    <Panel title="UAT Information">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="UAT Date" error={form.errors.uat_date} required>
                                <input
                                    type="date"
                                    value={form.data.uat_date}
                                    onChange={(event) =>
                                        form.setData('uat_date', event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="UAT File" error={form.errors.uat_file} required>
                                <input
                                    type="file"
                                    onChange={(event) =>
                                        form.setData(
                                            'uat_file',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </Panel>
                )}

                {showBast && (
                    <Panel title="BAST Information">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="BAST Date" error={form.errors.bast_date} required>
                                <input
                                    type="date"
                                    value={form.data.bast_date}
                                    onChange={(event) =>
                                        form.setData('bast_date', event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="BAST File" error={form.errors.bast_file} required>
                                <input
                                    type="file"
                                    onChange={(event) =>
                                        form.setData(
                                            'bast_file',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </Panel>
                )}

                <Panel
                    title="Project Members"
                    action={
                        <button
                            type="button"
                            onClick={() =>
                                form.setData('members', [...form.data.members, blankMember()])
                            }
                            className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                        >
                            Add Member
                        </button>
                    }
                >
                    <div className="space-y-3">
                        {form.data.members.map((member, indexKey) => (
                            <div
                                key={`member-${indexKey}`}
                                className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_1fr_120px_80px]"
                            >
                                <select
                                    value={member.user_id}
                                    onChange={(event) =>
                                        setMember(indexKey, {
                                            ...member,
                                            user_id: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                >
                                    <option value="">User *</option>
                                    {options.users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={member.incentive_project_role_rule_id}
                                    onChange={(event) => {
                                        const selectedRule =
                                            options.project_role_rules.find(
                                                (rule) =>
                                                    String(rule.id) ===
                                                    event.target.value,
                                            );

                                        setMember(indexKey, {
                                            ...member,
                                            incentive_project_role_rule_id:
                                                event.target.value,
                                            is_support: selectedRule?.is_support
                                                ? true
                                                : member.is_support,
                                        });
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">Project role *</option>
                                    {options.project_role_rules.map((rule) => (
                                        <option key={rule.id} value={rule.id}>
                                            {rule.role_name}
                                            {rule.is_support ? ' (Support)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={member.incentive_pic_level_rule_id ?? ''}
                                    onChange={(event) =>
                                        setMember(indexKey, {
                                            ...member,
                                            incentive_pic_level_rule_id:
                                                event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                >
                                    <option value="">PIC level</option>
                                    {options.pic_level_rules.map((rule) => (
                                        <option key={rule.id} value={rule.id}>
                                            {rule.level_name}
                                        </option>
                                    ))}
                                </select>
                                <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={member.is_support}
                                        onChange={(event) =>
                                            setMember(indexKey, {
                                                ...member,
                                                is_support: event.target.checked,
                                            })
                                        }
                                    />
                                    Support *
                                </label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData(
                                            'members',
                                            form.data.members.filter(
                                                (_, memberIndex) =>
                                                    memberIndex !== indexKey,
                                            ),
                                        )
                                    }
                                    className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-pastel-red"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </Panel>

                <Panel
                    title="Access Rules"
                    action={
                        <button
                            type="button"
                            onClick={() =>
                                form.setData('access_rules', [
                                    ...form.data.access_rules,
                                    { user_id: '', permission: 'view' },
                                ])
                            }
                            className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                        >
                            Add Rule
                        </button>
                    }
                >
                    <div className="space-y-3">
                        {form.data.access_rules.map((rule, indexKey) => (
                            <div
                                key={`access-${indexKey}`}
                                className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_180px_80px]"
                            >
                                <select
                                    value={rule.user_id}
                                    onChange={(event) =>
                                        setAccessRule(indexKey, {
                                            ...rule,
                                            user_id: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                >
                                    <option value="">User *</option>
                                    {options.users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={rule.permission}
                                    onChange={(event) =>
                                        setAccessRule(indexKey, {
                                            ...rule,
                                            permission: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                >
                                    {options.access_permissions.map((permission) => (
                                        <option
                                            key={permission.value}
                                            value={permission.value}
                                        >
                                            {permission.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData(
                                            'access_rules',
                                            form.data.access_rules.filter(
                                                (_, ruleIndex) => ruleIndex !== indexKey,
                                            ),
                                        )
                                    }
                                    className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-pastel-red"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        {form.data.access_rules.length === 0 && (
                            <p className="rounded-lg bg-pastel-slate p-4 text-sm text-slate-600">
                                No individual project access rule yet.
                            </p>
                        )}
                    </div>
                </Panel>

                <Panel
                    title="Task Types"
                    action={
                        <button
                            type="button"
                            onClick={() => openTaskTypeModal()}
                            className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                        >
                            Add Task Type
                        </button>
                    }
                >
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-pastel-slate text-left text-xs font-semibold uppercase text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Label</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {options.task_types.map((type) => (
                                    <tr key={type.id}>
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-flex rounded-full px-2 py-1 text-xs font-medium text-white"
                                                style={{ backgroundColor: type.color }}
                                            >
                                                {type.name}
                                            </span>
                                            {type.is_global && (
                                                <span className="ml-2 text-xs text-slate-400">
                                                    Global
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {type.description ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {type.is_active === false ? 'Inactive' : 'Active'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {!type.is_global && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openTaskTypeModal(type)
                                                            }
                                                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTaskType(type)}
                                                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-pastel-red"
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {options.task_types.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-8 text-center text-sm text-slate-500"
                                        >
                                            No task type yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel
                    title="Tasks"
                    action={
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => openTaskTypeModal()}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                            >
                                + Task Type
                            </button>
                            <Link
                                href={createProjectTasks.url(project.id)}
                                className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                            >
                                Bulk Add Tasks
                            </Link>
                        </div>
                    }
                >
                    <KanbanBoard onDropItem={handleTaskDrop}>
                        {taskColumns.map((column) => (
                            <KanbanLane
                                key={column.value}
                                id={column.value}
                                title={column.label}
                                count={column.tasks.length}
                                tone={taskTone[column.value]}
                            >
                                {column.tasks.map((task) => {
                                    return (
                                        <DraggableKanbanCard
                                            key={`task-${task.id ?? task.name}`}
                                            id={
                                                task.id
                                                    ? String(task.id)
                                                    : `new-${form.data.tasks.indexOf(task)}`
                                            }
                                        >
                                            <div className="space-y-4 pr-8">
                                                <div className="text-sm font-semibold leading-5 text-slate-950">
                                                    {task.name}
                                                </div>
                                                <div className="grid gap-2 text-xs text-slate-600">
                                                    <CompactRow
                                                        label="Task Type"
                                                        value={task.task_type?.name ?? '-'}
                                                    />
                                                    <CompactRow
                                                        label="Deadline"
                                                        value={task.plan_end_date}
                                                    />
                                                    <CompactRow
                                                        label="PIC"
                                                        value={
                                                            options.users.find(
                                                                (user) =>
                                                                    String(user.id) ===
                                                                    String(task.pic_user_id),
                                                            )?.name ?? '-'
                                                        }
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                                    {(task.allowed_statuses ?? [])
                                                        .filter(
                                                            (status) =>
                                                                status !== task.status,
                                                        )
                                                        .map((status) => (
                                                            <button
                                                                key={status}
                                                                type="button"
                                                                onClick={() =>
                                                                    patchTaskStatus(task, status)
                                                                }
                                                                className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                                                            >
                                                                {status.replaceAll('_', ' ')}
                                                            </button>
                                                        ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTask(task)}
                                                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-pastel-red"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </DraggableKanbanCard>
                                    );
                                })}
                                {column.tasks.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500">
                                        No task in this lane.
                                    </p>
                                )}
                            </KanbanLane>
                        ))}
                    </KanbanBoard>
                </Panel>

                <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-slate-50/95 py-4">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-slate-400"
                    >
                        {form.processing ? 'Saving...' : 'Save Preparation'}
                    </button>
                </div>
            </form>

            <Modal
                open={taskTypeModalOpen}
                title={editingTaskType ? 'Edit Task Type' : 'Add Task Type'}
                onClose={() => setTaskTypeModalOpen(false)}
            >
                <form onSubmit={submitTaskType} className="space-y-4">
                    <Field label="Name" error={taskTypeForm.errors.name} required>
                        <input
                            value={taskTypeForm.data.name}
                            onChange={(event) =>
                                taskTypeForm.setData('name', event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Color" error={taskTypeForm.errors.color} required>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={taskTypeForm.data.color}
                                onChange={(event) =>
                                    taskTypeForm.setData('color', event.target.value)
                                }
                                className="h-10 w-14 rounded-md border border-slate-300"
                            />
                            <input
                                value={taskTypeForm.data.color}
                                onChange={(event) =>
                                    taskTypeForm.setData('color', event.target.value)
                                }
                                className={inputClass}
                            />
                        </div>
                    </Field>
                    <Field
                        label="Description"
                        error={taskTypeForm.errors.description}
                    >
                        <textarea
                            value={taskTypeForm.data.description}
                            onChange={(event) =>
                                taskTypeForm.setData(
                                    'description',
                                    event.target.value,
                                )
                            }
                            className={`${inputClass} min-h-24`}
                        />
                    </Field>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            checked={taskTypeForm.data.is_active}
                            onChange={(event) =>
                                taskTypeForm.setData('is_active', event.target.checked)
                            }
                        />
                        Active <span className="text-red-600">*</span>
                    </label>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={() => setTaskTypeModalOpen(false)}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={taskTypeForm.processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-slate-400"
                        >
                            {taskTypeForm.processing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}

function blankMember(): PreparationMember {
    return {
        user_id: '',
        incentive_project_role_rule_id: '',
        incentive_pic_level_rule_id: '',
        is_support: false,
    };
}

function Panel({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">{title}</h2>
                {action}
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function ReadonlyItem({
    label,
    value,
    required = false,
}: {
    label: string;
    value: ReactNode;
    required?: boolean;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-medium uppercase text-slate-500">
                {label}
                {required && <span className="text-red-600"> *</span>}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
        </div>
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

function Field({
    label,
    error,
    children,
    required = false,
}: {
    label: string;
    error?: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
                {label}
                {required && <span className="text-red-600"> *</span>}
            </span>
            {children}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </label>
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
