import { Link } from '@inertiajs/react';
import {
    Briefcase,
    CalendarDays,
    CheckCircle,
    FileText,
    Info,
    ListTodo,
    MapPin,
    Plus,
    Save,
    Shield,
    Tags,
    Trash2,
    UploadCloud,
    Users,
} from 'lucide-react';

import type { PreparationAccessRule, PreparationMember, PreparationTask, ProjectPreparationProps } from '@/types';

import type { PreparationForm } from './types';
import { Field, fileInputClass, inputClass, LockedSection, Panel } from './ui';

type PreparationOptions = ProjectPreparationProps['options'];

export function BasicInformationSection({ form }: { form: PreparationForm }) {
    return (
        <Panel title="Basic Information" icon={Info}>
            <div className="grid gap-4 md:grid-cols-3">
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
                        onChange={(event) => form.setData('project_date', event.target.value)}
                        className={inputClass}
                    />
                </Field>
                <Field label="Mandays" error={form.errors.mandays} required>
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.data.mandays}
                        onChange={(event) => form.setData('mandays', event.target.value)}
                        className={inputClass}
                    />
                </Field>
            </div>
        </Panel>
    );
}

export function CustomerIncentiveSection({
    form,
    options,
    onCustomerIdsChange,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'customers' | 'incentive_profiles'>;
    onCustomerIdsChange: (customerIds: string[]) => void;
}) {
    const selectedCustomers = options.customers.filter((customer) => form.data.customer_ids.includes(String(customer.id)));

    return (
        <Panel title="Customer & Incentive" icon={Briefcase}>
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <Field label="Customers" error={form.errors.customer_ids} required>
                    <div className="space-y-2">
                        <select
                            multiple
                            value={form.data.customer_ids}
                            onChange={(event) =>
                                onCustomerIdsChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
                            }
                            className={`${inputClass} h-36 py-2`}
                        >
                            {options.customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedCustomers.slice(0, 6).map((customer) => (
                                <span
                                    key={customer.id}
                                    className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
                                >
                                    {customer.name}
                                </span>
                            ))}
                            {selectedCustomers.length > 6 && (
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400">
                                    +{selectedCustomers.length - 6} more
                                </span>
                            )}
                        </div>
                    </div>
                </Field>
                <div className="grid gap-4">
                    <Field label="Primary Customer" error={form.errors.primary_customer_id}>
                        <select
                            value={form.data.primary_customer_id}
                            onChange={(event) => form.setData('primary_customer_id', event.target.value)}
                            className={inputClass}
                        >
                            <option value="">Use first selected customer</option>
                            {selectedCustomers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Incentive Profile" error={form.errors.incentive_profile_id} required>
                        <select
                            value={form.data.incentive_profile_id}
                            onChange={(event) => form.setData('incentive_profile_id', event.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select incentive profile</option>
                            {options.incentive_profiles.map((profile) => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.code} v{profile.version} - {profile.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>
        </Panel>
    );
}

export function PicLocationSection({
    form,
    users,
}: {
    form: PreparationForm;
    users: PreparationOptions['users'];
}) {
    return (
        <Panel title="PIC & Location" icon={MapPin}>
            <div className="grid gap-5 md:grid-cols-3">
                <Field label="PIC PM" error={form.errors.pm_user_id} required>
                    <select
                        value={form.data.pm_user_id}
                        onChange={(event) => form.setData('pm_user_id', event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Select PM</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </Field>
                <Field label="PIC Request" error={form.errors.request_user_id}>
                    <select
                        value={form.data.request_user_id}
                        onChange={(event) => form.setData('request_user_id', event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Select requester</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Location" error={form.errors.location} required>
                    <input
                        placeholder="Site / Office location"
                        value={form.data.location}
                        onChange={(event) => form.setData('location', event.target.value)}
                        className={inputClass}
                    />
                </Field>
            </div>
        </Panel>
    );
}

export function ProjectDocumentSections({
    form,
    showUat,
    showBast,
}: {
    form: PreparationForm;
    showUat: boolean;
    showBast: boolean;
}) {
    return (
        <>
            <Panel title="URS Information" icon={FileText}>
                <div className="grid gap-5 md:grid-cols-3">
                    <Field label="URS Number" error={form.errors.urs_number} required>
                        <input
                            placeholder="Doc. Ref. Number"
                            value={form.data.urs_number}
                            onChange={(event) => form.setData('urs_number', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="URS Date" error={form.errors.urs_date} required>
                        <input
                            type="date"
                            value={form.data.urs_date}
                            onChange={(event) => form.setData('urs_date', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="URS File" error={form.errors.urs_file} required>
                        <input
                            type="file"
                            onChange={(event) => form.setData('urs_file', event.target.files?.[0] ?? null)}
                            className={fileInputClass}
                        />
                    </Field>
                </div>
            </Panel>

            <Panel title="Project Timeline" icon={CalendarDays}>
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Plan Start" error={form.errors.plan_start_date} required>
                        <input
                            type="date"
                            value={form.data.plan_start_date}
                            onChange={(event) => form.setData('plan_start_date', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Plan End" error={form.errors.plan_end_date} required>
                        <input
                            type="date"
                            value={form.data.plan_end_date}
                            onChange={(event) => form.setData('plan_end_date', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                </div>
            </Panel>

            <Panel title="Request Evidence" icon={UploadCloud}>
                <Field label="Upload Evidences" error={form.errors.request_evidence}>
                    <input
                        type="file"
                        multiple
                        onChange={(event) => form.setData('request_evidence', Array.from(event.target.files ?? []))}
                        className={fileInputClass}
                    />
                </Field>
            </Panel>

            {showUat ? (
                <Panel title="UAT Information" icon={CheckCircle}>
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field label="UAT Date" error={form.errors.uat_date} required>
                            <input
                                type="date"
                                value={form.data.uat_date}
                                onChange={(event) => form.setData('uat_date', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="UAT File" error={form.errors.uat_file} required>
                            <input
                                type="file"
                                onChange={(event) => form.setData('uat_file', event.target.files?.[0] ?? null)}
                                className={fileInputClass}
                            />
                        </Field>
                    </div>
                </Panel>
            ) : (
                <LockedSection
                    title="UAT Information"
                    description="Section UAT akan aktif setelah project masuk fase planning atau setelah data UAT mulai tersedia."
                />
            )}

            {showBast ? (
                <Panel title="BAST Information" icon={CheckCircle}>
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field label="BAST Date" error={form.errors.bast_date} required>
                            <input
                                type="date"
                                value={form.data.bast_date}
                                onChange={(event) => form.setData('bast_date', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="BAST File" error={form.errors.bast_file} required>
                            <input
                                type="file"
                                onChange={(event) => form.setData('bast_file', event.target.files?.[0] ?? null)}
                                className={fileInputClass}
                            />
                        </Field>
                    </div>
                </Panel>
            ) : (
                <LockedSection
                    title="BAST Information"
                    description="Section BAST dikunci sampai UAT date atau UAT file tersedia. Lengkapi UAT terlebih dahulu sebelum mengisi BAST."
                />
            )}
        </>
    );
}

export function MembersSection({
    form,
    options,
    onMemberChange,
    onAddMember,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'users' | 'project_role_rules' | 'pic_level_rules'>;
    onMemberChange: (index: number, value: PreparationMember) => void;
    onAddMember: () => void;
}) {
    return (
        <Panel
            title="Project Members"
            icon={Users}
            action={
                <button
                    type="button"
                    onClick={onAddMember}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Member</span>
                </button>
            }
        >
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                {form.data.members.map((member, indexKey) => (
                    <div
                        key={`member-${indexKey}`}
                        className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-primary/30 lg:grid-cols-[1fr_1fr_1fr_100px_auto]"
                    >
                        <select
                            value={member.user_id}
                            onChange={(event) => onMemberChange(indexKey, { ...member, user_id: event.target.value })}
                            className={inputClass}
                        >
                            <option value="">User *</option>
                            {options.users.map((user) => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                        <select
                            value={member.incentive_project_role_rule_id}
                            onChange={(event) => {
                                const selectedRule = options.project_role_rules.find((rule) => String(rule.id) === event.target.value);
                                onMemberChange(indexKey, {
                                    ...member,
                                    incentive_project_role_rule_id: event.target.value,
                                    is_support: selectedRule?.is_support ? true : member.is_support,
                                });
                            }}
                            className={inputClass}
                        >
                            <option value="">Project Role *</option>
                            {options.project_role_rules.map((rule) => (
                                <option key={rule.id} value={rule.id}>
                                    {rule.role_name} {rule.is_support ? ' (Support)' : ''}
                                </option>
                            ))}
                        </select>
                        <select
                            value={member.incentive_pic_level_rule_id ?? ''}
                            onChange={(event) => onMemberChange(indexKey, { ...member, incentive_pic_level_rule_id: event.target.value })}
                            className={inputClass}
                        >
                            <option value="">PIC Level</option>
                            {options.pic_level_rules.map((rule) => (
                                <option key={rule.id} value={rule.id}>{rule.level_name}</option>
                            ))}
                        </select>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                            <input
                                type="checkbox"
                                checked={member.is_support}
                                onChange={(event) => onMemberChange(indexKey, { ...member, is_support: event.target.checked })}
                                className="h-3.5 w-3.5 rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                            />
                            Support *
                        </label>
                        <button
                            type="button"
                            title="Remove Member"
                            onClick={() => form.setData('members', form.data.members.filter((_, index) => index !== indexKey))}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {form.data.members.length === 0 && (
                    <p className="text-center text-xs font-medium text-slate-400">No members assigned.</p>
                )}
            </div>
        </Panel>
    );
}

export function AccessRulesSection({
    form,
    options,
    onAccessRuleChange,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'users' | 'access_permissions'>;
    onAccessRuleChange: (index: number, value: PreparationAccessRule) => void;
}) {
    return (
        <Panel
            title="Access Rules"
            icon={Shield}
            action={
                <button
                    type="button"
                    onClick={() => form.setData('access_rules', [...form.data.access_rules, { user_id: '', permission: 'view' }])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Rule</span>
                </button>
            }
        >
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                {form.data.access_rules.map((rule, indexKey) => (
                    <div
                        key={`access-${indexKey}`}
                        className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-primary/30 md:grid-cols-[1fr_200px_auto]"
                    >
                        <select
                            value={rule.user_id}
                            onChange={(event) => onAccessRuleChange(indexKey, { ...rule, user_id: event.target.value })}
                            className={inputClass}
                        >
                            <option value="">User *</option>
                            {options.users.map((user) => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                        <select
                            value={rule.permission}
                            onChange={(event) => onAccessRuleChange(indexKey, { ...rule, permission: event.target.value })}
                            className={inputClass}
                        >
                            {options.access_permissions.map((permission) => (
                                <option key={permission.value} value={permission.value}>{permission.label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            title="Remove Rule"
                            onClick={() => form.setData('access_rules', form.data.access_rules.filter((_, index) => index !== indexKey))}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {form.data.access_rules.length === 0 && (
                    <p className="text-center text-xs font-medium text-slate-400">No individual access rules defined.</p>
                )}
            </div>
        </Panel>
    );
}

export function TaskTypesSummarySection({
    taskTypes,
    onManage,
}: {
    taskTypes: PreparationOptions['task_types'];
    onManage: () => void;
}) {
    return (
        <Panel
            title="Task Types"
            icon={Tags}
            action={
                <button
                    type="button"
                    onClick={onManage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Manage Types</span>
                </button>
            }
        >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                {taskTypes.slice(0, 8).map((type) => (
                    <span
                        key={type.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs"
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                    </span>
                ))}
                {taskTypes.length > 8 && (
                    <span className="text-xs font-semibold text-slate-400">
                        +{taskTypes.length - 8} more
                    </span>
                )}
                {taskTypes.length === 0 && (
                    <span className="text-xs font-semibold text-slate-400">
                        No task types yet.
                    </span>
                )}
            </div>
        </Panel>
    );
}

export function TasksManagementSection({
    form,
    options,
    bulkTaskUrl,
    onAddTask,
    onTaskChange,
    onRemoveTask,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'users' | 'task_types' | 'task_statuses'>;
    bulkTaskUrl: string;
    onAddTask: () => void;
    onTaskChange: (index: number, value: PreparationTask) => void;
    onRemoveTask: (task: PreparationTask) => void;
}) {
    return (
        <Panel
            title="Tasks Management"
            icon={ListTodo}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onAddTask}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Row</span>
                    </button>
                    <Link
                        href={bulkTaskUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Bulk Add Tasks</span>
                    </Link>
                </div>
            }
        >
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
                <table className="w-full min-w-[1180px] divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="w-12 px-3 py-3 text-center">#</th>
                            <th className="min-w-[190px] px-3 py-3">Task Name</th>
                            <th className="w-40 px-3 py-3">Type</th>
                            <th className="w-44 px-3 py-3">PIC</th>
                            <th className="w-36 px-3 py-3">Status</th>
                            <th className="w-36 px-3 py-3">Plan Start</th>
                            <th className="w-36 px-3 py-3">Plan End</th>
                            <th className="min-w-[210px] px-3 py-3">Attachment</th>
                            <th className="w-14 px-3 py-3 text-center">Act</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {form.data.tasks.map((task, indexKey) => (
                            <tr key={`prep-task-${task.id ?? indexKey}`} className="align-top hover:bg-slate-50/50">
                                <td className="px-3 py-3 text-center font-semibold text-slate-400">
                                    {indexKey + 1}
                                </td>
                                <td className="px-3 py-2.5">
                                    <input
                                        value={task.name}
                                        onChange={(event) => onTaskChange(indexKey, { ...task, name: event.target.value })}
                                        className={inputClass}
                                    />
                                </td>
                                <td className="px-3 py-2.5">
                                    <select
                                        value={task.task_type_id ?? ''}
                                        onChange={(event) => onTaskChange(indexKey, { ...task, task_type_id: event.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">No type</option>
                                        {options.task_types.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2.5">
                                    <select
                                        value={task.pic_user_id ?? ''}
                                        onChange={(event) => onTaskChange(indexKey, { ...task, pic_user_id: event.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">No PIC</option>
                                        {form.data.members.map((member, memberIndex) => {
                                            const user = options.users.find((item) => String(item.id) === String(member.user_id));

                                            return (
                                                <option key={`${member.user_id}-${memberIndex}`} value={member.user_id}>
                                                    {user?.name ?? 'Selected member'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </td>
                                <td className="px-3 py-2.5">
                                    <select
                                        value={task.status}
                                        onChange={(event) =>
                                            onTaskChange(indexKey, {
                                                ...task,
                                                status: event.target.value as PreparationTask['status'],
                                            })
                                        }
                                        className={inputClass}
                                    >
                                        {options.task_statuses.map((statusOption) => (
                                            <option key={statusOption.value} value={statusOption.value}>
                                                {statusOption.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2.5">
                                    <input
                                        type="date"
                                        value={task.plan_start_date}
                                        onChange={(event) => onTaskChange(indexKey, { ...task, plan_start_date: event.target.value })}
                                        className={inputClass}
                                    />
                                </td>
                                <td className="px-3 py-2.5">
                                    <input
                                        type="date"
                                        value={task.plan_end_date}
                                        onChange={(event) => onTaskChange(indexKey, { ...task, plan_end_date: event.target.value })}
                                        className={inputClass}
                                    />
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="grid gap-1.5">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={(event) =>
                                                onTaskChange(indexKey, {
                                                    ...task,
                                                    attachments: Array.from(event.target.files ?? []),
                                                })
                                            }
                                            className={fileInputClass}
                                        />
                                        <span className="text-[10px] font-semibold text-slate-400">
                                            Existing: {task.attachments_count ?? 0} file(s)
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                    <button
                                        type="button"
                                        title="Remove task"
                                        onClick={() => onRemoveTask(task)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {form.data.tasks.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-xs font-semibold text-slate-400">
                                    No tasks yet. Use Add Row or Bulk Add Tasks.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}

export function SaveBar({ processing }: { processing: boolean }) {
    return (
        <div className="fixed right-0 bottom-0 left-0 z-40 flex justify-end gap-3 border-t border-slate-200/80 bg-white/70 px-6 py-4 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all lg:pl-72">
            <button
                type="submit"
                disabled={processing}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
                <Save className="h-4 w-4" />
                <span>{processing ? 'Saving...' : 'Save Preparation'}</span>
            </button>
        </div>
    );
}
