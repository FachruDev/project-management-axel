import { router, useForm, usePage } from '@inertiajs/react';
import { Trash2, SquarePen, CirclePlus } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/RoleController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { SlideOver } from '@/components/slide-over';
import { AppLayout } from '@/layouts/app-layout';
import type { Paginated, PermissionGroup, RoleSummary } from '@/types';

type Props = {
    roles: Paginated<RoleSummary>;
    filters: {
        search: string;
    };
    permission_groups: PermissionGroup[];
};

type RolePayload = {
    name: string;
    permissions: string[];
};

const blankRole: RolePayload = {
    name: '',
    permissions: [],
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function RoleIndex({ roles, filters, permission_groups }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<RoleSummary | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<RolePayload>(blankRole);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
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
        form.setData(blankRole);
        setPanelOpen(true);
    }

    function openEdit(role: RoleSummary) {
        setEditing(role);
        form.clearErrors();
        form.setData({
            name: role.name,
            permissions: role.permissions,
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

    function deleteRole(role: RoleSummary) {
        if (!window.confirm('Delete this role?')) {
            return;
        }

        router.delete(destroy.url(role.id), {
            preserveScroll: true,
        });
    }

    function togglePermission(permission: string) {
        form.setData(
            'permissions',
            form.data.permissions.includes(permission)
                ? form.data.permissions.filter((name) => name !== permission)
                : [...form.data.permissions, permission],
        );
    }

    return (
        <AppLayout title="Roles">
            <PageHeader
                eyebrow="Administration"
                title="Roles"
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-md gap-2 inline-flex bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        <CirclePlus className="size-5" /> New Role
                    </button>
                }
            />

            {flash?.success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {errors?.role && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.role}
                </div>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search role"
                    className={inputClass}
                />
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
                            <tr className="text-center">
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Permissions</th>
                                <th className="px-4 py-3">Users</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roles.data.map((role) => (
                                <tr key={role.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {role.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {role.guard_name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex max-w-3xl flex-wrap gap-1.5">
                                            {role.permissions.length > 0
                                                ? role.permissions.map((permission) => (
                                                      <Pill key={permission}>
                                                          {permission}
                                                      </Pill>
                                                  ))
                                                : '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {role.users_count}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(role)}
                                                className="rounded-md border gap-2 inline-flex   border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                <SquarePen className="size-4" /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteRole(role)}
                                                className="rounded-md border gap-2 inline-flex border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="size-4" /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {roles.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No roles found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={roles} />
            </section>

            <SlideOver
                open={panelOpen}
                title={editing ? 'Edit Role' : 'New Role'}
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
                    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4">
                        <div>
                            <div className="text-sm font-medium text-slate-700">
                                Permissions <span className="text-red-600">*</span>
                            </div>
                            {form.errors.permissions && (
                                <div className="mt-1 text-xs text-red-600">
                                    {form.errors.permissions}
                                </div>
                            )}
                        </div>
                        {permission_groups.map((group) => (
                            <div key={group.category}>
                                <div className="text-xs font-semibold uppercase text-slate-400">
                                    {group.category.replace('_', ' ')}
                                </div>
                                <div className="mt-2 grid gap-2">
                                    {group.permissions.map((permission) => (
                                        <label
                                            key={permission.id}
                                            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.data.permissions.includes(permission.name)}
                                                onChange={() => togglePermission(permission.name)}
                                                className="h-4 w-4 rounded border-slate-300"
                                            />
                                            {permission.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
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
