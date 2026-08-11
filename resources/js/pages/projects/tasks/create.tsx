import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import { store as bulkStoreTasks } from '@/actions/App/Http/Controllers/ProjectBulkTaskController';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type { ProjectBulkTaskCreateProps } from '@/types';

type BulkTaskRow = {
    name: string;
    task_type_id: string;
    pic_user_id: string;
    description: string;
    plan_start_date: string;
    plan_end_date: string;
};

type BulkTaskPayload = {
    tasks: BulkTaskRow[];
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

export default function ProjectBulkTaskCreate({
    project,
    options,
}: ProjectBulkTaskCreateProps) {
    const form = useForm<BulkTaskPayload>({
        tasks: [blankTaskRow()],
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.post(bulkStoreTasks.url(project.id), {
            preserveScroll: true,
        });
    }

    function setTask(index: number, value: BulkTaskRow) {
        form.setData(
            'tasks',
            form.data.tasks.map((task, taskIndex) =>
                taskIndex === index ? value : task,
            ),
        );
    }

    return (
        <AppLayout title={`Add Tasks - ${project.name}`}>
            <PageHeader
                eyebrow="Bulk Add Tasks"
                title={project.name}
                description="Tambah beberapa task sekaligus untuk project ini."
                actions={
                    <Link
                        href={preparationShow.url(project.id)}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                        Back to Preparation
                    </Link>
                }
            />

            <form onSubmit={submit} className="space-y-4">
                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                            <thead className="bg-pastel-slate text-left text-xs font-semibold uppercase text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Task Name *</th>
                                    <th className="px-4 py-3">Task Type</th>
                                    <th className="px-4 py-3">PIC</th>
                                    <th className="px-4 py-3">Plan Start *</th>
                                    <th className="px-4 py-3">Plan End *</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {form.data.tasks.map((task, indexKey) => (
                                    <tr key={`task-row-${indexKey}`} className="align-top">
                                        <td className="px-4 py-3">
                                            <input
                                                value={task.name}
                                                onChange={(event) =>
                                                    setTask(indexKey, {
                                                        ...task,
                                                        name: event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={task.task_type_id}
                                                onChange={(event) =>
                                                    setTask(indexKey, {
                                                        ...task,
                                                        task_type_id: event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            >
                                                <option value="">No type</option>
                                                {options.task_types.map((type) => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={task.pic_user_id}
                                                onChange={(event) =>
                                                    setTask(indexKey, {
                                                        ...task,
                                                        pic_user_id: event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            >
                                                <option value="">No PIC</option>
                                                {options.members.map((member) => (
                                                    <option
                                                        key={member.id}
                                                        value={member.user_id}
                                                    >
                                                        {member.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="date"
                                                value={task.plan_start_date}
                                                onChange={(event) =>
                                                    setTask(indexKey, {
                                                        ...task,
                                                        plan_start_date: event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="date"
                                                value={task.plan_end_date}
                                                onChange={(event) =>
                                                    setTask(indexKey, {
                                                        ...task,
                                                        plan_end_date: event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <textarea
                                                value={task.description}
                                                onChange={(event) =>
                                                    setTask(indexKey, {
                                                        ...task,
                                                        description: event.target.value,
                                                    })
                                                }
                                                className={`${inputClass} min-h-20`}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
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
                                                disabled={form.data.tasks.length === 1}
                                                className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-pastel-red disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {form.errors.tasks && (
                    <div className="rounded-lg border border-red-200 bg-pastel-red px-4 py-3 text-sm text-red-700">
                        {form.errors.tasks}
                    </div>
                )}

                <div className="flex flex-wrap justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <button
                        type="button"
                        onClick={() =>
                            form.setData('tasks', [
                                ...form.data.tasks,
                                blankTaskRow(),
                            ])
                        }
                        className="rounded-md border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-pastel-blue"
                    >
                        Add Row
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-slate-400"
                    >
                        {form.processing ? 'Saving...' : 'Save Tasks'}
                    </button>
                </div>
            </form>
        </AppLayout>
    );
}

function blankTaskRow(): BulkTaskRow {
    const today = new Date().toISOString().slice(0, 10);

    return {
        name: '',
        task_type_id: '',
        pic_user_id: '',
        description: '',
        plan_start_date: today,
        plan_end_date: today,
    };
}
