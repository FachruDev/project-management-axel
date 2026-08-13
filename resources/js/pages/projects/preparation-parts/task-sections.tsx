import { Link } from '@inertiajs/react';
import { ListTodo, Plus, Save, Tags, Trash2 } from 'lucide-react';

import type { PreparationTask, ProjectPreparationProps } from '@/types';

import type { PreparationForm } from './types';
import { fileInputClass, inputClass, Panel } from './ui';

type PreparationOptions = ProjectPreparationProps['options'];

export function TaskTypesSummarySection({
    taskTypes,
    onManage,
}: {
    taskTypes: PreparationOptions['task_types'];
    onManage: () => void;
}) {
    return (
        <Panel
            title="Task Types"
            icon={Tags}
            action={
                <button
                    type="button"
                    onClick={onManage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Manage Types</span>
                </button>
            }
        >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                {taskTypes.slice(0, 8).map((type) => (
                    <span
                        key={type.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs"
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                    </span>
                ))}
                {taskTypes.length > 8 && (
                    <span className="text-xs font-semibold text-slate-400">
                        +{taskTypes.length - 8} more
                    </span>
                )}
                {taskTypes.length === 0 && (
                    <span className="text-xs font-semibold text-slate-400">
                        No task types yet.
                    </span>
                )}
            </div>
        </Panel>
    );
}

export function TasksManagementSection({
    form,
    options,
    bulkTaskUrl,
    onAddTask,
    onTaskChange,
    onRemoveTask,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'users' | 'task_types' | 'task_statuses'>;
    bulkTaskUrl: string;
    onAddTask: () => void;
    onTaskChange: (index: number, value: PreparationTask) => void;
    onRemoveTask: (task: PreparationTask) => void;
}) {
    return (
        <Panel
            title="Tasks Management"
            icon={ListTodo}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onAddTask}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Row</span>
                    </button>
                    <Link
                        href={bulkTaskUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Bulk Add Tasks</span>
                    </Link>
                </div>
            }
        >
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
                <table className="w-full min-w-[1180px] divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50/80 font-bold tracking-wider text-slate-500 uppercase">
                        <tr>
                            <th className="w-12 px-3 py-3 text-center">#</th>
                            <th className="min-w-[190px] px-3 py-3">
                                Task Name
                            </th>
                            <th className="w-40 px-3 py-3">Type</th>
                            <th className="w-44 px-3 py-3">PIC</th>
                            <th className="w-36 px-3 py-3">Status</th>
                            <th className="w-36 px-3 py-3">Plan Start</th>
                            <th className="w-36 px-3 py-3">Plan End</th>
                            <th className="min-w-[210px] px-3 py-3">
                                Attachment
                            </th>
                            <th className="w-14 px-3 py-3 text-center">Act</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {form.data.tasks.map((task, indexKey) => (
                            <tr
                                key={`prep-task-${task.id ?? indexKey}`}
                                className="align-top hover:bg-slate-50/50"
                            >
                                <td className="px-3 py-3 text-center font-semibold text-slate-400">
                                    {indexKey + 1}
                                </td>
                                <td className="px-3 py-2.5">
                                    <input
                                        value={task.name}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                name: event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </td>
                                <td className="px-3 py-2.5">
                                    <select
                                        value={task.task_type_id ?? ''}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                task_type_id:
                                                    event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">No type</option>
                                        {options.task_types.map((type) => (
                                            <option
                                                key={type.id}
                                                value={type.id}
                                            >
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2.5">
                                    <select
                                        value={task.pic_user_id ?? ''}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                pic_user_id: event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">No PIC</option>
                                        {form.data.members.map(
                                            (member, memberIndex) => {
                                                const user = options.users.find(
                                                    (item) =>
                                                        String(item.id) ===
                                                        String(member.user_id),
                                                );

                                                return (
                                                    <option
                                                        key={`${member.user_id}-${memberIndex}`}
                                                        value={member.user_id}
                                                    >
                                                        {user?.name ??
                                                            'Selected member'}
                                                    </option>
                                                );
                                            },
                                        )}
                                    </select>
                                </td>
                                <td className="px-3 py-2.5">
                                    <select
                                        value={task.status}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                status: event.target
                                                    .value as PreparationTask['status'],
                                            })
                                        }
                                        className={inputClass}
                                    >
                                        {options.task_statuses.map(
                                            (statusOption) => (
                                                <option
                                                    key={statusOption.value}
                                                    value={statusOption.value}
                                                >
                                                    {statusOption.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </td>
                                <td className="px-3 py-2.5">
                                    <input
                                        type="date"
                                        value={task.plan_start_date}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                plan_start_date:
                                                    event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </td>
                                <td className="px-3 py-2.5">
                                    <input
                                        type="date"
                                        value={task.plan_end_date}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                plan_end_date:
                                                    event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="grid gap-1.5">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={(event) =>
                                                onTaskChange(indexKey, {
                                                    ...task,
                                                    attachments: Array.from(
                                                        event.target.files ??
                                                            [],
                                                    ),
                                                })
                                            }
                                            className={fileInputClass}
                                        />
                                        <span className="text-[10px] font-semibold text-slate-400">
                                            Existing:{' '}
                                            {task.attachments_count ?? 0}{' '}
                                            file(s)
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                    <button
                                        type="button"
                                        title="Remove task"
                                        onClick={() => onRemoveTask(task)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {form.data.tasks.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-8 text-center text-xs font-semibold text-slate-400"
                                >
                                    No tasks yet. Use Add Row or Bulk Add Tasks.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}

export function SaveBar({ processing }: { processing: boolean }) {
    return (
        <div className="fixed right-0 bottom-0 left-0 z-40 flex justify-end gap-3 border-t border-slate-200/80 bg-white/70 px-6 py-4 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all lg:pl-72">
            <button
                type="submit"
                disabled={processing}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
                <Save className="h-4 w-4" />
                <span>{processing ? 'Saving...' : 'Save Preparation'}</span>
            </button>
        </div>
    );
}
