import { router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/UserController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SlideOver } from '@/components/slide-over';
import { AppLayout } from '@/layouts/app-layout';
import type {
    DepartmentOption,
    MasterDataFilters,
    Paginated,
    RoleOption,
    UserSummary,
} from '@/types';

type Props = {
    users: Paginated<UserSummary>;
    filters: MasterDataFilters;
    departments: DepartmentOption[];
    roles: RoleOption[];
};

type UserPayload = {
    name: string;
    email: string;
    external_id: string;
    department_id: string;
    password: string;
    is_active: boolean;
    roles: string[];
};

const blankUser: UserPayload = {
    name: '',
    email: '',
    external_id: '',
    department_id: '',
    password: '',
    is_active: true,
    roles: [],
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function UserIndex({ users, filters, departments, roles }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [departmentId, setDepartmentId] = useState(filters.department_id ?? '');
    const [editing, setEditing] = useState<UserSummary | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<UserPayload>(blankUser);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    status,
                    department_id: departmentId,
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
        form.setData(blankUser);
        setPanelOpen(true);
    }

    function openEdit(user: UserSummary) {
        setEditing(user);
        form.clearErrors();
        form.setData({
            name: user.name,
            email: user.email,
            external_id: user.external_id ?? '',
            department_id: user.department_id ? String(user.department_id) : '',
            password: '',
            is_active: user.is_active,
            roles: user.roles,
        });
        setPanelOpen(true);
    }

    function closePanel() {
        setPanelOpen(false);
        form.clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closePanel,
        };

        if (editing) {
            form.put(update.url(editing.id), options);

            return;
        }

        form.post(store.url(), options);
    }

    function deleteUser(user: UserSummary) {
        if (!window.confirm('Delete this user?')) {
            return;
        }

        router.delete(destroy.url(user.id), {
            preserveScroll: true,
        });
    }

    function toggleRole(roleName: string) {
        form.setData(
            'roles',
            form.data.roles.includes(roleName)
                ? form.data.roles.filter((name) => name !== roleName)
                : [...form.data.roles, roleName],
        );
    }

    return (
        <AppLayout title="Users">
            <PageHeader
                eyebrow="Administration"
                title="Users"
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        New User
                    </button>
                }
            />

            {flash?.success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {errors?.user && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.user}
                </div>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_220px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, user id"
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
                <select
                    value={departmentId}
                    onChange={(event) => setDepartmentId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Departments</option>
                    {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                            {department.name}
                        </option>
                    ))}
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
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Roles</th>
                                <th className="px-4 py-3">Project Use</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.data.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {user.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {user.email}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {user.external_id ?? '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {user.department?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.roles.length > 0
                                                ? user.roles.map((role) => (
                                                      <Pill key={role}>{role}</Pill>
                                                  ))
                                                : '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {user.project_memberships_count} member /{' '}
                                        {user.project_access_rules_count} access
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge active={user.is_active} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(user)}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteUser(user)}
                                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={users} />
            </section>

            <SlideOver
                open={panelOpen}
                title={editing ? 'Edit User' : 'New User'}
                onClose={closePanel}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Name" error={form.errors.name} required>
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Email" error={form.errors.email} required>
                        <input
                            type="email"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="User ID" error={form.errors.external_id}>
                        <input
                            value={form.data.external_id}
                            onChange={(event) => form.setData('external_id', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Department" error={form.errors.department_id}>
                        <select
                            value={form.data.department_id}
                            onChange={(event) => form.setData('department_id', event.target.value)}
                            className={inputClass}
                        >
                            <option value="">No Department</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label={editing ? 'New Password' : 'Password'}
                        error={form.errors.password}
                        required={!editing}
                    >
                        <input
                            type="password"
                            value={form.data.password}
                            onChange={(event) => form.setData('password', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData('is_active', event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Active *
                    </label>
                    <div className="rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-medium text-slate-700">
                                Roles <span className="text-red-600">*</span>
                            </div>
                        {form.errors.roles && (
                            <div className="mt-1 text-xs text-red-600">
                                {form.errors.roles}
                            </div>
                        )}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {roles.map((role) => (
                                <label
                                    key={role.id}
                                    className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.data.roles.includes(role.name)}
                                        onChange={() => toggleRole(role.name)}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    {role.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={closePanel}
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
            </SlideOver>
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

function Pill({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {children}
        </span>
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
