import { Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    index,
    show,
    store,
    update,
} from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    CustomerProjectOption,
    IncentiveProfileOption,
    ProjectIndexProps,
    ProjectStatus,
    ProjectSummary,
} from '@/types';

type ProjectPayload = {
    name: string;
    project_date: string;
    customer_ids: string[];
    primary_customer_id: string;
    mandays: string;
    incentive_profile_id: string;
};

const blankProject: ProjectPayload = {
    name: '',
    project_date: new Date().toISOString().slice(0, 10),
    customer_ids: [],
    primary_customer_id: '',
    mandays: '',
    incentive_profile_id: '',
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const statusTone: Record<ProjectStatus, string> = {
    draft: 'border-slate-200 bg-pastel-slate text-slate-700',
    pending_approval: 'border-amber-200 bg-pastel-amber text-amber-800',
    rejected: 'border-red-200 bg-pastel-red text-red-700',
    planning: 'border-blue-200 bg-pastel-blue text-primary',
    ongoing: 'border-emerald-200 bg-pastel-green text-emerald-700',
    awaiting_bast: 'border-purple-200 bg-pastel-purple text-purple-700',
    ready_to_close: 'border-blue-200 bg-pastel-blue text-primary',
    closed: 'border-slate-300 bg-white text-slate-700',
};

export default function ProjectIndex({
    projects,
    metrics,
    filters,
    options,
}: ProjectIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [customerId, setCustomerId] = useState(filters.customer_id);
    const [pmUserId, setPmUserId] = useState(filters.pm_user_id);
    const [editing, setEditing] = useState<ProjectSummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<ProjectPayload>(blankProject);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    status,
                    customer_id: customerId,
                    pm_user_id: pmUserId,
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
        form.setData(blankProject);
        setModalOpen(true);
    }

    function openEdit(project: ProjectSummary) {
        const customerIds = project.customers.map((customer) =>
            String(customer.id),
        );
        const primaryCustomer = project.customers.find(
            (customer) => customer.is_primary,
        );

        setEditing(project);
        form.clearErrors();
        form.setData({
            name: project.name,
            project_date: project.project_date,
            customer_ids: customerIds,
            primary_customer_id: String(primaryCustomer?.id ?? customerIds[0] ?? ''),
            mandays: project.mandays,
            incentive_profile_id: String(project.incentive_profile?.id ?? ''),
        });
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        form.clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const submitOptions = {
            preserveScroll: true,
            onSuccess: closeModal,
        };

        if (editing) {
            form.put(update.url(editing.id), submitOptions);

            return;
        }

        form.post(store.url(), submitOptions);
    }

    function toggleCustomer(customer: CustomerProjectOption) {
        const id = String(customer.id);
        const customerIds = form.data.customer_ids.includes(id)
            ? form.data.customer_ids.filter((customerId) => customerId !== id)
            : [...form.data.customer_ids, id];

        form.setData({
            ...form.data,
            customer_ids: customerIds,
            primary_customer_id: customerIds.includes(form.data.primary_customer_id)
                ? form.data.primary_customer_id
                : (customerIds[0] ?? ''),
        });
    }

    return (
        <AppLayout title="Projects">
            <PageHeader
                eyebrow="Project"
                title="Projects"
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        New Project
                    </button>
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {options.statuses.map((item) => (
                    <div
                        key={item.value}
                        className={`rounded-lg border p-4 ${statusTone[item.value]}`}
                    >
                        <div className="text-xs font-semibold uppercase">
                            {item.label}
                        </div>
                        <div className="mt-3 text-2xl font-semibold">
                            {metrics[item.value] ?? 0}
                        </div>
                    </div>
                ))}
            </section>

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_220px_220px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search project"
                    className={inputClass}
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Status</option>
                    {options.statuses.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
                <select
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Customers</option>
                    {options.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                            {customer.name}
                        </option>
                    ))}
                </select>
                <select
                    value={pmUserId}
                    onChange={(event) => setPmUserId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All PM</option>
                    {options.users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
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
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">PM</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projects.data.map((project) => (
                                <tr key={project.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={show.url(project.id)}
                                            className="font-medium text-slate-950 hover:text-primary"
                                        >
                                            {project.name}
                                        </Link>
                                        <div className="text-xs text-slate-500">
                                            {project.project_date} / {project.mandays} MD
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {project.customers[0]?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {project.pm?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {project.members_count} member /{' '}
                                        {project.tasks_count} task
                                    </td>
                                    <td className="px-4 py-3">
                                        <ProjectStatusBadge status={project.status} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {project.actions.can_edit_basic && (
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(project)}
                                                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {project.actions.can_prepare && (
                                                <Link
                                                    href={preparationShow.url(project.id)}
                                                    className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                                                >
                                                    Preparation
                                                </Link>
                                            )}
                                            <Link
                                                href={show.url(project.id)}
                                                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                                            >
                                                View
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {projects.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No projects found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={projects} />
            </section>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Project' : 'New Project'}
                onClose={closeModal}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Project Name" error={form.errors.name}>
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Project Date" error={form.errors.project_date}>
                        <input
                            type="date"
                            value={form.data.project_date}
                            onChange={(event) => form.setData('project_date', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Customers" error={form.errors.customer_ids}>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
                            {options.customers.map((customer) => (
                                <label
                                    key={customer.id}
                                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.data.customer_ids.includes(String(customer.id))}
                                        onChange={() => toggleCustomer(customer)}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    {customer.name}
                                </label>
                            ))}
                        </div>
                    </Field>
                    <Field
                        label="Primary Customer"
                        error={form.errors.primary_customer_id}
                    >
                        <select
                            value={form.data.primary_customer_id}
                            onChange={(event) => form.setData('primary_customer_id', event.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select primary</option>
                            {options.customers
                                .filter((customer) =>
                                    form.data.customer_ids.includes(String(customer.id)),
                                )
                                .map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </option>
                                ))}
                        </select>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Mandays" error={form.errors.mandays}>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.data.mandays}
                                onChange={(event) => form.setData('mandays', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field
                            label="Incentive Profile"
                            error={form.errors.incentive_profile_id}
                        >
                            <select
                                value={form.data.incentive_profile_id}
                                onChange={(event) => form.setData('incentive_profile_id', event.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select profile</option>
                                {options.incentive_profiles.map(
                                    (profile: IncentiveProfileOption) => (
                                        <option key={profile.id} value={profile.id}>
                                            {profile.code} v{profile.version}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                    </div>
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
