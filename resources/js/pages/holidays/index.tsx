import { router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/HolidayController';
import {
    exportMethod as exportHolidays,
    importMethod as importHolidays,
    template as holidayTemplate,
} from '@/actions/App/Http/Controllers/HolidayExcelController';
import { ExcelTransferActions } from '@/components/excel-transfer-actions';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type {
    HolidaySummary,
    MasterDataFilters,
    Paginated,
    SelectOption,
} from '@/types';

type Props = {
    holidays: Paginated<HolidaySummary>;
    filters: MasterDataFilters;
    types: SelectOption[];
};

type HolidayPayload = {
    date: string;
    name: string;
    type: string;
    is_working: boolean;
    description: string;
    is_active: boolean;
};

const blankHoliday: HolidayPayload = {
    date: '',
    name: '',
    type: 'national',
    is_working: false,
    description: '',
    is_active: true,
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

export default function HolidaysIndex({ holidays, filters, types }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const [editing, setEditing] = useState<HolidaySummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const flash = usePage().props.flash as
        | { success?: string | null; import_errors?: string[] | null }
        | undefined;
    const form = useForm<HolidayPayload>(blankHoliday);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({ query: { search, status, type } }),
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
        form.setData(blankHoliday);
        setModalOpen(true);
    }

    function openEdit(holiday: HolidaySummary) {
        setEditing(holiday);
        form.clearErrors();
        form.setData({
            date: holiday.date,
            name: holiday.name,
            type: holiday.type,
            is_working: holiday.is_working,
            description: holiday.description ?? '',
            is_active: holiday.is_active,
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

    function deleteHoliday(holiday: HolidaySummary) {
        if (!window.confirm('Delete this holiday?')) {
            return;
        }

        router.delete(destroy.url(holiday.id), {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout title="Holidays">
            <PageHeader
                eyebrow="Master Data"
                title="Holidays"
                description="Kelola hari libur nasional/perusahaan dan override hari masuk kerja untuk SLA."
                actions={
                    <>
                        <ExcelTransferActions
                            exportUrl={exportHolidays.url()}
                            templateUrl={holidayTemplate.url()}
                            importUrl={importHolidays.url()}
                        />
                        <button
                            type="button"
                            onClick={openCreate}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                            New Holiday
                        </button>
                    </>
                }
            />

            {flash?.success && (
                <div className="rounded-lg border border-emerald-200 bg-pastel-green px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {flash?.import_errors && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p className="font-medium">Import failed.</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {flash.import_errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search holiday or description"
                    className={inputClass}
                />
                <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Types</option>
                    {types.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
                                <th className="px-4 py-3">Holiday</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Work Override</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {holidays.data.map((holiday) => (
                                <tr key={holiday.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {holiday.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {holiday.date}
                                        </div>
                                        {holiday.description && (
                                            <div className="mt-1 max-w-md truncate text-xs text-slate-500">
                                                {holiday.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {holiday.type.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <WorkOverrideBadge active={holiday.is_working} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge active={holiday.is_active} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(holiday)}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteHoliday(holiday)}
                                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {holidays.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No holidays found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={holidays} />
            </section>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Holiday' : 'New Holiday'}
                onClose={closeModal}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Date" error={form.errors.date} required>
                        <input
                            type="date"
                            value={form.data.date}
                            onChange={(event) => form.setData('date', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Name" error={form.errors.name} required>
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Type" error={form.errors.type} required>
                        <select
                            value={form.data.type}
                            onChange={(event) => form.setData('type', event.target.value)}
                            className={inputClass}
                        >
                            {types.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Description" error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            className={`${inputClass} min-h-24`}
                        />
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
                        Mark as working day *
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) =>
                                form.setData('is_active', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Active *
                    </label>
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
            {active ? 'active' : 'inactive'}
        </span>
    );
}

function WorkOverrideBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                active
                    ? 'border-blue-200 bg-pastel-blue text-primary'
                    : 'border-red-200 bg-pastel-red text-red-700'
            }`}
        >
            {active ? 'working' : 'holiday'}
        </span>
    );
}
