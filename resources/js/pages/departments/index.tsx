import { router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/DepartmentController';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type { DepartmentSummary, MasterDataFilters, Paginated } from '@/types';

type Props = {
    departments: Paginated<DepartmentSummary>;
    filters: MasterDataFilters;
};

type DepartmentPayload = {
    code: string;
    name: string;
    description: string;
    is_active: boolean;
};

const blankDepartment: DepartmentPayload = {
    code: '',
    name: '',
    description: '',
    is_active: true,
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function DepartmentIndex({ departments, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [editing, setEditing] = useState<DepartmentSummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<DepartmentPayload>(blankDepartment);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    status,
                },
            }),
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
        form.setData(blankDepartment);
        setModalOpen(true);
    }

    function openEdit(department: DepartmentSummary) {
        setEditing(department);
        form.clearErrors();
        form.setData({
            code: department.code,
            name: department.name,
            description: department.description ?? '',
            is_active: department.is_active,
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

    function deleteDepartment(department: DepartmentSummary) {
        if (!window.confirm('Delete this department?')) {
            return;
        }

        router.delete(destroy.url(department.id), {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout title="Departments">
            <PageHeader
                eyebrow="Master Data"
                title="Departments"
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        New Department
                    </button>
                }
            />

            {flash?.success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {errors?.department && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.department}
                </div>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code or name"
                    className={inputClass}
                />
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
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                    Apply
                </button>
            </form>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Users</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {departments.data.map((department) => (
                                <tr key={department.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {department.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {department.code}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {department.description ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {department.users_count}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge active={department.is_active} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(department)}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteDepartment(department)}
                                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {departments.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No departments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={departments} />
            </section>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Department' : 'New Department'}
                onClose={closeModal}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Code" error={form.errors.code}>
                        <input
                            value={form.data.code}
                            onChange={(event) => form.setData('code', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Name" error={form.errors.name}>
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Description" error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            className={`${inputClass} min-h-24`}
                        />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData('is_active', event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Active
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
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
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
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{label}</span>
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
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
        >
            {active ? 'active' : 'inactive'}
        </span>
    );
}
