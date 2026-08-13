import { Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    AlertCircle
} from 'lucide-react';
import type { FormEvent } from 'react';

import { store as bulkStoreTasks } from '@/actions/App/Http/Controllers/ProjectBulkTaskController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
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
    attachments: File[];
};

type BulkTaskPayload = {
    tasks: BulkTaskRow[];
};

// Styling seragam untuk input di dalam tabel
const inputClass =
    'h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm hover:border-slate-300';

const textareaClass =
    'w-full min-h-[36px] resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm hover:border-slate-300';

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
            forceFormData: true,
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

    function addRow() {
        form.setData('tasks', [...form.data.tasks, blankTaskRow()]);
    }

    function removeRow(indexToRemove: number) {
        form.setData(
            'tasks',
            form.data.tasks.filter((_, index) => index !== indexToRemove),
        );
    }

    return (
        <AppLayout title={`Add Tasks - ${project.name}`}>
            <div className="space-y-6">

                {/* Header Section */}
                <PageHeader
                    eyebrow="Bulk Data Entry"
                    title={`Add Tasks: ${project.name}`}
                    description="Tambahkan beberapa task sekaligus secara cepat menggunakan format spreadsheet."
                    actions={
                        <Link
                            href={preparationShow.url(project.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Back to Preparation</span>
                        </Link>
                    }
                />

                <form onSubmit={submit} className="space-y-5">

                    {/* Error Alert */}
                    {form.errors.tasks && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200/80 bg-red-50/80 p-4 text-xs font-medium text-red-800 shadow-sm">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                            <div>{form.errors.tasks}</div>
                        </div>
                    )}

                    {/* Table Container */}
                    <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-[1240px] w-full divide-y divide-slate-200 text-left text-xs">
                                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="w-12 px-3 py-3 text-center">#</th>
                                        <th className="px-3 py-3 min-w-[200px]">Task Name <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 w-40">Task Type</th>
                                        <th className="px-3 py-3 w-44">PIC</th>
                                        <th className="px-3 py-3 w-36">Plan Start <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 w-36">Plan End <span className="text-red-500">*</span></th>
                                        <th className="px-3 py-3 min-w-[200px]">Description</th>
                                        <th className="px-3 py-3 min-w-[220px]">Attachment</th>
                                        <th className="w-14 px-3 py-3 text-center">Act</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {form.data.tasks.map((task, indexKey) => (
                                        <tr
                                            key={`task-row-${indexKey}`}
                                            className="group align-top transition-colors hover:bg-slate-50/50"
                                        >
                                            {/* Row Number */}
                                            <td className="px-3 py-3.5 text-center font-medium text-slate-400">
                                                {indexKey + 1}
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <input
                                                    placeholder="Enter task name"
                                                    value={task.name}
                                                    onChange={(event) =>
                                                        setTask(indexKey, { ...task, name: event.target.value })
                                                    }
                                                    className={inputClass}
                                                />
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <select
                                                    value={task.task_type_id}
                                                    onChange={(event) =>
                                                        setTask(indexKey, { ...task, task_type_id: event.target.value })
                                                    }
                                                    className={inputClass}
                                                >
                                                    <option value="" className="text-slate-400">Select Type...</option>
                                                    {options.task_types.map((type) => (
                                                        <option key={type.id} value={type.id}>
                                                            {type.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <select
                                                    value={task.pic_user_id}
                                                    onChange={(event) =>
                                                        setTask(indexKey, { ...task, pic_user_id: event.target.value })
                                                    }
                                                    className={inputClass}
                                                >
                                                    <option value="" className="text-slate-400">Unassigned</option>
                                                    {options.members.map((member) => (
                                                        <option key={member.id} value={member.user_id}>
                                                            {member.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="date"
                                                    value={task.plan_start_date}
                                                    onChange={(event) =>
                                                        setTask(indexKey, { ...task, plan_start_date: event.target.value })
                                                    }
                                                    className={inputClass}
                                                />
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="date"
                                                    value={task.plan_end_date}
                                                    onChange={(event) =>
                                                        setTask(indexKey, { ...task, plan_end_date: event.target.value })
                                                    }
                                                    className={inputClass}
                                                />
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <textarea
                                                    placeholder="Optional description"
                                                    value={task.description}
                                                    onChange={(event) =>
                                                        setTask(indexKey, { ...task, description: event.target.value })
                                                    }
                                                    className={textareaClass}
                                                    rows={1}
                                                />
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={(event) =>
                                                        setTask(indexKey, {
                                                            ...task,
                                                            attachments: Array.from(event.target.files ?? []),
                                                        })
                                                    }
                                                    className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
                                                />
                                            </td>

                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    title="Remove row"
                                                    onClick={() => removeRow(indexKey)}
                                                    disabled={form.data.tasks.length === 1}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Inline Add Row Button at the bottom of the table */}
                        <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                            <button
                                type="button"
                                onClick={addRow}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-white px-4 py-2 text-xs font-semibold text-primary transition-all hover:border-primary hover:bg-primary/5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add New Row</span>
                            </button>
                        </div>
                    </section>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            <Save className="h-4 w-4" />
                            <span>{form.processing ? 'Saving Tasks...' : 'Save All Tasks'}</span>
                        </button>
                    </div>

                </form>
            </div>
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
        attachments: [],
    };
}
