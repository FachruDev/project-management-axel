import { Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import {
    resubmit,
    show,
    store,
    submitApproval,
    update,
} from '@/actions/App/Http/Controllers/ProjectController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import preparationIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import { KanbanBoard, KanbanCard, KanbanLane } from '@/components/kanban';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    CustomerProjectOption,
    IncentiveProfileOption,
    ProjectPreparationIndexProps,
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

const laneTone: Record<ProjectStatus, string> = {
    draft: 'border-slate-200 bg-pastel-slate text-slate-700',
    pending_approval: 'border-amber-200 bg-pastel-amber text-amber-800',
    rejected: 'border-red-200 bg-pastel-red text-red-700',
    planning: 'border-blue-200 bg-pastel-blue text-primary',
    ongoing: 'border-emerald-200 bg-pastel-green text-emerald-700',
    awaiting_bast: 'border-purple-200 bg-pastel-purple text-purple-700',
    ready_to_close: 'border-amber-200 bg-pastel-amber text-amber-800',
    closed: 'border-slate-300 bg-white text-slate-700',
};

export default function ProjectPreparationIndex({
    columns,
    filters,
    options,
}: ProjectPreparationIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [editing, setEditing] = useState<ProjectSummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<ProjectPayload>(blankProject);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            preparationIndex.url(),
            { search, status },
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

        setEditing(project);
        form.clearErrors();
        form.setData({
            name: project.name,
            project_date: project.project_date,
            customer_ids: customerIds,
            primary_customer_id: customerIds[0] ?? '',
            mandays: project.mandays,
            incentive_profile_id: String(project.incentive_profile?.id ?? ''),
        });
        setModalOpen(true);
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (editing) {
            form.put(update.url(editing.id), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });

            return;
        }

        form.post(store.url({ query: { redirect_to: 'preparation' } }), {
            preserveScroll: true,
            onSuccess: () => setModalOpen(false),
        });
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

    function postAction(url: string) {
        router.post(url, {}, { preserveScroll: true });
    }

    return (
        <AppLayout title="Project Preparation">
            <PageHeader
                eyebrow="Preparation Workbench"
                title="Project Preparation"
                description="Draft, pending approval, dan rejected dikelola di sini sebelum masuk operational Kanban."
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        New Draft
                    </button>
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search preparation project"
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
                <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-pastel-blue"
                >
                    Apply
                </button>
            </form>

            <KanbanBoard>
                {columns.map((column) => (
                    <KanbanLane
                        key={column.status}
                        title={column.label}
                        count={column.projects.length}
                        tone={laneTone[column.status]}
                    >
                        {column.projects.map((project) => (
                            <KanbanCard key={project.id}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <Link
                                            href={preparationShow.url(project.id)}
                                            className="font-semibold text-slate-950 hover:text-primary"
                                        >
                                            {project.name}
                                        </Link>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {project.customers[0]?.name ?? 'No customer'} /{' '}
                                            {project.mandays} MD
                                        </div>
                                    </div>
                                    <ProjectStatusBadge status={project.status} />
                                </div>
                                <div className="mt-4 grid gap-2 text-xs text-slate-600">
                                    <div className="flex justify-between gap-3">
                                        <span>PM</span>
                                        <span className="font-medium text-slate-800">
                                            {project.pm?.name ?? '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span>Members</span>
                                        <span className="font-medium text-slate-800">
                                            {project.members_count}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span>Tasks</span>
                                        <span className="font-medium text-slate-800">
                                            {project.tasks_count}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                    {project.actions.can_edit_basic && (
                                        <button
                                            type="button"
                                            onClick={() => openEdit(project)}
                                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <Link
                                        href={show.url(project.id)}
                                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                    >
                                        Detail
                                    </Link>
                                    <Link
                                        href={preparationShow.url(project.id)}
                                        className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-pastel-blue"
                                    >
                                        Prepare
                                    </Link>
                                    {project.actions.can_submit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                postAction(submitApproval.url(project.id))
                                            }
                                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                                        >
                                            Submit
                                        </button>
                                    )}
                                    {project.actions.can_resubmit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                postAction(resubmit.url(project.id))
                                            }
                                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                                        >
                                            Resubmit
                                        </button>
                                    )}
                                </div>
                            </KanbanCard>
                        ))}
                        {column.projects.length === 0 && (
                            <EmptyLane>No project in this lane.</EmptyLane>
                        )}
                    </KanbanLane>
                ))}
            </KanbanBoard>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Draft' : 'New Draft Project'}
                onClose={() => setModalOpen(false)}
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
                            onChange={(event) =>
                                form.setData('project_date', event.target.value)
                            }
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
                                    />
                                    {customer.name}
                                </label>
                            ))}
                        </div>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Mandays" error={form.errors.mandays}>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.data.mandays}
                                onChange={(event) =>
                                    form.setData('mandays', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field
                            label="Incentive Profile"
                            error={form.errors.incentive_profile_id}
                        >
                            <select
                                value={form.data.incentive_profile_id}
                                onChange={(event) =>
                                    form.setData('incentive_profile_id', event.target.value)
                                }
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
                            onClick={() => setModalOpen(false)}
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

function EmptyLane({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500">
            {children}
        </div>
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
