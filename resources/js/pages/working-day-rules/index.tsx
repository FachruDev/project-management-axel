import { router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/WorkingDayRuleController';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type {
    MasterDataFilters,
    SelectOption,
    WorkingDayRuleSummary,
} from '@/types';

type Props = {
    working_day_rules: WorkingDayRuleSummary[];
    filters: MasterDataFilters;
    day_options: Array<SelectOption<number>>;
};

type WorkingDayPayload = {
    day_of_week: string;
    is_working: boolean;
    description: string;
};

const blankWorkingDay: WorkingDayPayload = {
    day_of_week: '',
    is_working: true,
    description: '',
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

export default function WorkingDayRulesIndex({
    working_day_rules,
    filters,
    day_options,
}: Props) {
    const [status, setStatus] = useState(filters.status ?? '');
    const [editing, setEditing] = useState<WorkingDayRuleSummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const form = useForm<WorkingDayPayload>(blankWorkingDay);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({ query: { status } }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function openCreate() {
        setEditing(null);
        form.clearErrors();
        form.setData(blankWorkingDay);
        setModalOpen(true);
    }

    function openEdit(rule: WorkingDayRuleSummary) {
        setEditing(rule);
        form.clearErrors();
        form.setData({
            day_of_week: String(rule.day_of_week),
            is_working: rule.is_working,
            description: rule.description ?? '',
        });
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        form.clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeModal,
        };

        if (editing) {
            form.put(update.url(editing.id), options);

            return;
        }

        form.post(store.url(), options);
    }

    function deleteRule(rule: WorkingDayRuleSummary) {
        if (!window.confirm('Delete this working day rule?')) {
            return;
        }

        router.delete(destroy.url(rule.id), {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout title="Work Days">
            <PageHeader
                eyebrow="Master Data"
                title="Work Days"
                description="Kelola hari kerja default yang dipakai perhitungan SLA delivery."
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        New Work Day
                    </button>
                }
            />

            {flash?.success && (
                <div className="rounded-lg border border-emerald-200 bg-pastel-green px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[180px_auto]"
            >
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Status</option>
                    <option value="working">Working</option>
                    <option value="non_working">Non-working</option>
                </select>
                <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-pastel-blue"
                >
                    Apply
                </button>
            </form>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Day</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {working_day_rules.map((rule) => (
                                <tr key={rule.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {rule.day_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Day {rule.day_of_week}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {rule.description ?? '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge active={rule.is_working} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(rule)}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteRule(rule)}
                                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {working_day_rules.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No working day rules found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Work Day' : 'New Work Day'}
                onClose={closeModal}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Day" error={form.errors.day_of_week} required>
                        <select
                            value={form.data.day_of_week}
                            onChange={(event) =>
                                form.setData('day_of_week', event.target.value)
                            }
                            className={inputClass}
                        >
                            <option value="">Select day</option>
                            {day_options.map((day) => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.is_working}
                            onChange={(event) =>
                                form.setData('is_working', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Working day *
                    </label>
                    <Field label="Description" error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            className={`${inputClass} min-h-24`}
                        />
                    </Field>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-slate-400"
                        >
                            {form.processing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
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

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                active
                    ? 'border-emerald-200 bg-pastel-green text-emerald-700'
                    : 'border-slate-200 bg-pastel-slate text-slate-600'
            }`}
        >
            {active ? 'working' : 'non-working'}
        </span>
    );
}
