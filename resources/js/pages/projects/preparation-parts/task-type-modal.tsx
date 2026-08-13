import type { FormEvent } from 'react';

import { Modal } from '@/components/modal';
import type { ProjectTaskTypeOption } from '@/types';

import type { TaskTypeForm } from './types';
import { Field, inputClass } from './ui';

export function TaskTypeModal({
    open,
    editingTaskType,
    taskTypes,
    form,
    onClose,
    onEdit,
    onDelete,
    onSubmit,
}: {
    open: boolean;
    editingTaskType: ProjectTaskTypeOption | null;
    taskTypes: ProjectTaskTypeOption[];
    form: TaskTypeForm;
    onClose: () => void;
    onEdit: (taskType: ProjectTaskTypeOption) => void;
    onDelete: (taskType: ProjectTaskTypeOption) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <Modal
            open={open}
            title={editingTaskType ? 'Edit Task Type' : 'Manage Task Types'}
            onClose={onClose}
        >
            {!editingTaskType && (
                <div className="mb-5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Existing Types
                    </div>
                    <div className="grid max-h-48 gap-2 overflow-y-auto">
                        {taskTypes.map((type) => (
                            <div
                                key={type.id}
                                className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs shadow-xs"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{
                                                backgroundColor: type.color,
                                            }}
                                        />
                                        <span className="truncate font-bold text-slate-800">
                                            {type.name}
                                        </span>
                                        {type.is_global && (
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                                                Global
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                                        {type.description ?? 'No description'}
                                    </div>
                                </div>
                                {!type.is_global && (
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(type)}
                                            className="rounded-md px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(type)}
                                            className="rounded-md px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {taskTypes.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-white py-4 text-center text-xs font-semibold text-slate-400">
                                No task types yet.
                            </div>
                        )}
                    </div>
                </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4 pt-2">
                <Field label="Type Name" error={form.errors.name} required>
                    <input
                        placeholder="e.g. Bug, Feature, Review"
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        className={inputClass}
                    />
                </Field>
                <Field
                    label="Indicator Color"
                    error={form.errors.color}
                    required
                >
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={form.data.color}
                            onChange={(event) =>
                                form.setData('color', event.target.value)
                            }
                            className="h-9 w-14 cursor-pointer rounded-lg border border-slate-200 shadow-sm"
                        />
                        <input
                            value={form.data.color}
                            onChange={(event) =>
                                form.setData('color', event.target.value)
                            }
                            className={inputClass}
                        />
                    </div>
                </Field>
                <Field label="Description" error={form.errors.description}>
                    <textarea
                        placeholder="Optional notes"
                        value={form.data.description}
                        onChange={(event) =>
                            form.setData('description', event.target.value)
                        }
                        className={`${inputClass} min-h-[80px] resize-y py-2`}
                    />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(event) =>
                            form.setData('is_active', event.target.checked)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                    />
                    Active Status <span className="text-red-500">*</span>
                </label>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                        {form.processing ? 'Saving...' : 'Save Type'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
