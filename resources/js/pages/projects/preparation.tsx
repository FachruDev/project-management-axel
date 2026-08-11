import { Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { index as projectIndex, show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { update } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import updateTaskStatus from '@/actions/App/Http/Controllers/ProjectTaskStatusController';
import { KanbanBoard, KanbanCard, KanbanLane } from '@/components/kanban';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    PreparationAccessRule,
    PreparationMember,
    PreparationTask,
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

    const memberUserIds = form.data.members
        .map((member) => String(member.user_id))
        .filter(Boolean);
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
                <Panel title="Preparation Data">
                    <div className="grid gap-4 md:grid-cols-2">
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
                    <div className="mt-4">
                        <Field
                            label="Request Evidence"
                            error={form.errors.request_evidence}
                        >
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
                    </div>
                </Panel>

                {(showUat || showBast) && (
                    <Panel title="UAT & BAST">
                        <div className="grid gap-4 md:grid-cols-2">
                            {showUat && (
                                <>
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
                                </>
                            )}
                            {showBast && (
                                <>
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
                                </>
                            )}
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
                    title="Tasks"
                    action={
                        <button
                            type="button"
                            onClick={() =>
                                form.setData('tasks', [...form.data.tasks, blankTask()])
                            }
                            className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                        >
                            Add Task
                        </button>
                    }
                >
                    <KanbanBoard>
                        {taskColumns.map((column) => (
                            <KanbanLane
                                key={column.value}
                                title={column.label}
                                count={column.tasks.length}
                                tone={taskTone[column.value]}
                            >
                                {column.tasks.map((task) => {
                                    const indexKey = form.data.tasks.indexOf(task);

                                    return (
                                        <KanbanCard key={`task-${task.id ?? indexKey}`}>
                                            <div className="space-y-3">
                                                <input
                                                    value={task.name}
                                                    onChange={(event) =>
                                                        setTask(indexKey, {
                                                            ...task,
                                                            name: event.target.value,
                                                        })
                                                    }
                                                    placeholder="Task name *"
                                                    className={inputClass}
                                                />
                                                <div className="grid gap-2">
                                                    <select
                                                        value={task.task_type_id ?? ''}
                                                        onChange={(event) =>
                                                            setTask(indexKey, {
                                                                ...task,
                                                                task_type_id:
                                                                    event.target.value,
                                                            })
                                                        }
                                                        className={inputClass}
                                                    >
                                                        <option value="">Task type</option>
                                                        {options.task_types.map((type) => (
                                                            <option
                                                                key={type.id}
                                                                value={type.id}
                                                            >
                                                                {type.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={task.pic_user_id ?? ''}
                                                        onChange={(event) =>
                                                            setTask(indexKey, {
                                                                ...task,
                                                                pic_user_id:
                                                                    event.target.value,
                                                            })
                                                        }
                                                        className={inputClass}
                                                    >
                                                        <option value="">PIC</option>
                                                        {options.users
                                                            .filter((user) =>
                                                                memberUserIds.includes(
                                                                    String(user.id),
                                                                ),
                                                            )
                                                            .map((user) => (
                                                                <option
                                                                    key={user.id}
                                                                    value={user.id}
                                                                >
                                                                    {user.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                                                        <span>
                                                            Plan Start{' '}
                                                            <span className="text-red-600">*</span>
                                                        </span>
                                                        <input
                                                            type="date"
                                                            value={task.plan_start_date}
                                                            onChange={(event) =>
                                                                setTask(indexKey, {
                                                                    ...task,
                                                                    plan_start_date:
                                                                        event.target.value,
                                                                })
                                                            }
                                                            className={inputClass}
                                                        />
                                                    </label>
                                                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                                                        <span>
                                                            Plan End{' '}
                                                            <span className="text-red-600">*</span>
                                                        </span>
                                                        <input
                                                            type="date"
                                                            value={task.plan_end_date}
                                                            onChange={(event) =>
                                                                setTask(indexKey, {
                                                                    ...task,
                                                                    plan_end_date:
                                                                        event.target.value,
                                                                })
                                                            }
                                                            className={inputClass}
                                                        />
                                                    </label>
                                                </div>
                                                <textarea
                                                    value={task.description ?? ''}
                                                    onChange={(event) =>
                                                        setTask(indexKey, {
                                                            ...task,
                                                            description: event.target.value,
                                                        })
                                                    }
                                                    placeholder="Description"
                                                    className={`${inputClass} min-h-20`}
                                                />
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={(event) =>
                                                        setTask(indexKey, {
                                                            ...task,
                                                            attachments: Array.from(
                                                                event.target.files ?? [],
                                                            ),
                                                        })
                                                    }
                                                    className={inputClass}
                                                />
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
                                                        onClick={() =>
                                                            form.setData(
                                                                'tasks',
                                                                form.data.tasks.filter(
                                                                    (_, taskIndex) =>
                                                                        taskIndex !== indexKey,
                                                                ),
                                                            )
                                                        }
                                                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-pastel-red"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </KanbanCard>
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

function blankTask(): PreparationTask {
    const today = new Date().toISOString().slice(0, 10);

    return {
        id: null,
        name: '',
        task_type_id: '',
        pic_user_id: '',
        status: 'todo',
        description: '',
        plan_start_date: today,
        plan_end_date: today,
        attachments: [],
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
