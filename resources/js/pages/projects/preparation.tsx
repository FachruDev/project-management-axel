import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { create as createProjectTasks } from '@/actions/App/Http/Controllers/ProjectBulkTaskController';
import { index as projectIndex, show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import { update } from '@/actions/App/Http/Controllers/ProjectPreparationController';
import deleteTask from '@/actions/App/Http/Controllers/ProjectTaskDeleteController';
import {
    destroy as destroyTaskType,
    store as storeTaskType,
    update as updateTaskType,
} from '@/actions/App/Http/Controllers/ProjectTaskTypeController';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type {
    PreparationAccessRule,
    PreparationMember,
    PreparationTask,
    ProjectPreparationProps,
    ProjectTaskTypeOption,
} from '@/types';

import {
    AccessRulesSection,
    BasicInformationSection,
    CustomerIncentiveSection,
    MembersSection,
    PicLocationSection,
    ProjectDocumentSections,
    SaveBar,
    TasksManagementSection,
    TaskTypesSummarySection,
} from './preparation-parts/sections';
import { TaskTypeModal } from './preparation-parts/task-type-modal';
import {
    blankMember,
    blankTask,
    blankTaskType,
} from './preparation-parts/types';
import type { TaskTypePayload } from './preparation-parts/types';
import type { PreparationPayload } from './preparation-parts/types';
import { Alert } from './preparation-parts/ui';

export default function ProjectPreparation({
    project,
    options,
}: ProjectPreparationProps) {
    const flash = usePage().props.flash as { success?: string | null } | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const [taskTypeModalOpen, setTaskTypeModalOpen] = useState(false);
    const [editingTaskType, setEditingTaskType] = useState<ProjectTaskTypeOption | null>(null);

    const form = useForm<PreparationPayload>({
        name: project.name,
        project_date: project.project_date,
        customer_ids: project.customers.map((customer) => String(customer.id)),
        primary_customer_id:
            String(project.customers.find((customer) => customer.is_primary)?.id ?? project.customers[0]?.id ?? ''),
        mandays: project.mandays,
        incentive_profile_id: String(project.incentive_profile_id ?? ''),
        pm_user_id: String(project.pm_user_id ?? ''),
        request_user_id: String(project.request_user_id ?? ''),
        location: project.location ?? '',
        urs_date: project.urs_date ?? '',
        urs_number: project.urs_number ?? '',
        urs_file: null,
        request_evidence: [],
        plan_start_date: project.plan_start_date ?? '',
        plan_end_date: project.plan_end_date ?? '',
        uat_date: project.uat_date ?? '',
        uat_file: null,
        bast_date: project.bast_date ?? '',
        bast_file: null,
        members:
            project.members.length > 0
                ? project.members.map((member) => ({
                      ...member,
                      user_id: String(member.user_id),
                      incentive_project_role_rule_id: String(member.incentive_project_role_rule_id),
                      incentive_pic_level_rule_id:
                          member.incentive_pic_level_rule_id === null ? '' : String(member.incentive_pic_level_rule_id),
                  }))
                : [blankMember()],
        access_rules: project.access_rules.map((rule) => ({
            ...rule,
            user_id: String(rule.user_id),
        })),
        tasks: project.tasks.map((task) => ({
            ...task,
            task_type_id: task.task_type_id === null ? '' : String(task.task_type_id),
            pic_user_id: task.pic_user_id === null ? '' : String(task.pic_user_id),
            attachments: [],
        })),
    });

    const taskTypeForm = useForm<TaskTypePayload>(blankTaskType);

    const showUat = ['planning', 'ongoing', 'awaiting_bast', 'ready_to_close', 'closed'].includes(project.status) || Boolean(form.data.uat_date);
    const showBast = Boolean(form.data.uat_date) || Boolean(project.attachments.uat_file?.length);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.transform((data) => ({ ...data, _method: 'PUT' }));
        form.post(update.url(project.id), {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    function setCustomerIds(customerIds: string[]) {
        form.setData((data) => ({
            ...data,
            customer_ids: customerIds,
            primary_customer_id: customerIds.includes(data.primary_customer_id)
                ? data.primary_customer_id
                : (customerIds[0] ?? ''),
        }));
    }

    function setMember(index: number, value: PreparationMember) {
        form.setData('members', form.data.members.map((member, i) => (i === index ? value : member)));
    }

    function setAccessRule(index: number, value: PreparationAccessRule) {
        form.setData('access_rules', form.data.access_rules.map((rule, i) => (i === index ? value : rule)));
    }

    function setTask(index: number, value: PreparationTask) {
        form.setData('tasks', form.data.tasks.map((task, i) => (i === index ? value : task)));
    }

    function addTask() {
        form.setData('tasks', [...form.data.tasks, blankTask()]);
    }

    function openTaskTypeModal(taskType?: ProjectTaskTypeOption) {
        setEditingTaskType(taskType ?? null);
        taskTypeForm.clearErrors();
        taskTypeForm.setData(
            taskType
                ? {
                      name: taskType.name,
                      color: taskType.color,
                      description: taskType.description ?? '',
                      is_active: taskType.is_active ?? true,
                  }
                : blankTaskType,
        );
        setTaskTypeModalOpen(true);
    }

    function submitTaskType(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (editingTaskType) {
            taskTypeForm.patch(
                updateTaskType.url({ project: project.id, taskType: editingTaskType.id }),
                { preserveScroll: true, onSuccess: () => setTaskTypeModalOpen(false) },
            );

            return;
        }

        taskTypeForm.post(storeTaskType.url(project.id), {
            preserveScroll: true,
            onSuccess: () => setTaskTypeModalOpen(false),
        });
    }

    function removeTaskType(taskType: ProjectTaskTypeOption) {
        router.delete(destroyTaskType.url({ project: project.id, taskType: taskType.id }), { preserveScroll: true });
    }

    function removeTask(task: PreparationTask) {
        if (!task.id) {
            form.setData('tasks', form.data.tasks.filter((item) => item !== task));

            return;
        }

        if (!window.confirm(`Delete task "${task.name}"?`)) {
            return;
        }

        router.delete(deleteTask.url(task.id), { preserveScroll: true });
    }

    return (
        <AppLayout title={`${project.name} Preparation`}>
            <div className="space-y-6 pb-24">
                <PageHeader
                    eyebrow="Configuration Form"
                    title={`${project.name} Preparation`}
                    description="Kelola informasi inti, anggota tim, regulasi akses, dan task board project."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <ProjectStatusBadge status={project.status} />
                            <Link
                                href={projectShow.url(project.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Detail</span>
                            </Link>
                            <Link
                                href={projectIndex.url()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Projects</span>
                            </Link>
                        </div>
                    }
                />

                {flash?.success && <Alert tone="success">{flash.success}</Alert>}
                {errors?.project && <Alert tone="danger">{errors.project}</Alert>}

                <form onSubmit={submit} className="space-y-6">
                    <BasicInformationSection form={form} />
                    <CustomerIncentiveSection
                        form={form}
                        options={options}
                        onCustomerIdsChange={setCustomerIds}
                    />
                    <PicLocationSection form={form} users={options.users} />
                    <ProjectDocumentSections
                        form={form}
                        showUat={showUat}
                        showBast={showBast}
                    />
                    <MembersSection
                        form={form}
                        options={options}
                        onMemberChange={setMember}
                        onAddMember={() => form.setData('members', [...form.data.members, blankMember()])}
                    />
                    <AccessRulesSection
                        form={form}
                        options={options}
                        onAccessRuleChange={setAccessRule}
                    />
                    <TaskTypesSummarySection
                        taskTypes={options.task_types}
                        onManage={() => openTaskTypeModal()}
                    />
                    <TasksManagementSection
                        form={form}
                        options={options}
                        bulkTaskUrl={createProjectTasks.url(project.id)}
                        onAddTask={addTask}
                        onTaskChange={setTask}
                        onRemoveTask={removeTask}
                    />
                    <SaveBar processing={form.processing} />
                </form>
            </div>

            <TaskTypeModal
                open={taskTypeModalOpen}
                editingTaskType={editingTaskType}
                taskTypes={options.task_types}
                form={taskTypeForm}
                onClose={() => setTaskTypeModalOpen(false)}
                onEdit={openTaskTypeModal}
                onDelete={removeTaskType}
                onSubmit={submitTaskType}
            />
        </AppLayout>
    );
}
