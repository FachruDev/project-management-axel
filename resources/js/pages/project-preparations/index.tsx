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
import {
    exportMethod as exportProjectPreparations,
    importMethod as importProjectPreparations,
    template as projectPreparationTemplate,
} from '@/actions/App/Http/Controllers/ProjectPreparationExcelController';
import { show as preparationShow } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import preparationIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import { ExcelTransferActions } from '@/components/excel-transfer-actions';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    CustomerProjectOption,
    IncentiveProfileOption,
    ProjectPreparationIndexProps,
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

export default function ProjectPreparationIndex({
    projects,
    filters,
    options,
}: ProjectPreparationIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [customerId, setCustomerId] = useState(filters.customer_id);
    const [pmUserId, setPmUserId] = useState(filters.pm_user_id);
    const [editing, setEditing] = useState<ProjectSummary | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const flash = usePage().props.flash as
        | {
              success?: string | null;
              excel_error_title?: string | null;
              excel_errors?: string[] | null;
          }
        | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const form = useForm<ProjectPayload>(blankProject);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            preparationIndex.url(),
            { search, status, customer_id: customerId, pm_user_id: pmUserId },
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
        setCustomerSearch('');
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
        setCustomerSearch('');
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
                    <>
                        <ExcelTransferActions
                            exportUrl={exportProjectPreparations.url()}
                            templateUrl={projectPreparationTemplate.url()}
                            importUrl={importProjectPreparations.url()}
                        />
                        <button
                            type="button"
                            onClick={openCreate}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                            New Draft
                        </button>
                    </>
                }
            />

            {flash?.success && <Alert tone="success">{flash.success}</Alert>}
            {errors?.project && <Alert tone="danger">{errors.project}</Alert>}
            {flash?.excel_errors && (
                <Alert tone="danger">
                    <p className="font-medium">
                        {flash.excel_error_title ?? 'Excel process failed'}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {flash.excel_errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </Alert>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 xl:grid-cols-[1fr_180px_220px_220px_auto]"
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
                        <thead className="bg-pastel-slate text-left text-xs font-semibold uppercase text-slate-600">
                            <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">PM</th>
                                <th className="px-4 py-3">Incentive</th>
                                <th className="px-4 py-3">Team</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projects.map((project) => (
                                <tr key={project.id} className="align-top hover:bg-slate-50">
                                    <td className="px-4 py-4">
                                        <Link
                                            href={preparationShow.url(project.id)}
                                            className="font-semibold text-slate-950 hover:text-primary"
                                        >
                                            {project.name}
                                        </Link>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {project.project_date} / {project.mandays} MD
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {project.customers[0]?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <ProjectStatusBadge status={project.status} />
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {project.pm?.name ?? '-'}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {project.incentive_profile
                                            ? `${project.incentive_profile.code} v${project.incentive_profile.version}`
                                            : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {project.members_count} member / {project.tasks_count}{' '}
                                        task
                                    </td>
                                    <td className="px-4 py-4">
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
                                                        postAction(
                                                            submitApproval.url(project.id),
                                                        )
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
                                    </td>
                                </tr>
                            ))}
                            {projects.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-10 text-center text-sm text-slate-500"
                                    >
                                        No preparation project found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <Modal
                open={modalOpen}
                title={editing ? 'Edit Draft' : 'New Draft Project'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={submitForm} className="flex flex-col gap-4">
                    <Field label="Project Name" error={form.errors.name} required>
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Project Date" error={form.errors.project_date} required>
                        <input
                            type="date"
                            value={form.data.project_date}
                            onChange={(event) =>
                                form.setData('project_date', event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Customers" error={form.errors.customer_ids} required>
                        <CustomerMultiSelect
                            customers={options.customers}
                            selectedIds={form.data.customer_ids}
                            search={customerSearch}
                            onSearchChange={setCustomerSearch}
                            onToggle={toggleCustomer}
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Mandays" error={form.errors.mandays} required>
                            <input
                                type="text"
                                inputMode="decimal"
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
                            required
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

function CustomerMultiSelect({
    customers,
    selectedIds,
    search,
    onSearchChange,
    onToggle,
}: {
    customers: CustomerProjectOption[];
    selectedIds: string[];
    search: string;
    onSearchChange: (search: string) => void;
    onToggle: (customer: CustomerProjectOption) => void;
}) {
    const query = search.trim().toLowerCase();
    const selectedCustomers = customers.filter((customer) =>
        selectedIds.includes(String(customer.id)),
    );
    const filteredCustomers = customers.filter((customer) => {
        if (query === '') {
            return true;
        }

        return [
            customer.name,
            customer.company_name ?? '',
            customer.email ?? '',
        ].some((value) => value.toLowerCase().includes(query));
    });

    return (
        <div className="rounded-md border border-slate-200 p-2">
            <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search customer, company, or email"
                className={`${inputClass} w-full`}
            />
            {selectedCustomers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCustomers.map((customer) => (
                        <button
                            key={customer.id}
                            type="button"
                            onClick={() => onToggle(customer)}
                            className="rounded-full border border-primary/20 bg-pastel-blue px-2.5 py-1 text-xs font-medium text-primary"
                        >
                            {customer.name} x
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-2 max-h-48 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                    <label
                        key={customer.id}
                        className="flex items-start gap-2 rounded px-2 py-2 text-sm hover:bg-slate-50"
                    >
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(String(customer.id))}
                            onChange={() => onToggle(customer)}
                            className="mt-1"
                        />
                        <span>
                            <span className="block font-medium text-slate-800">
                                {customer.name}
                            </span>
                            <span className="block text-xs text-slate-500">
                                {[customer.company_name, customer.email]
                                    .filter(Boolean)
                                    .join(' - ') || 'No company detail'}
                            </span>
                        </span>
                    </label>
                ))}
                {filteredCustomers.length === 0 && (
                    <p className="px-2 py-4 text-sm text-slate-500">
                        No customers found.
                    </p>
                )}
            </div>
        </div>
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
