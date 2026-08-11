import type { Paginated } from './incentive-profile';

export type ProjectStatus =
    | 'draft'
    | 'pending_approval'
    | 'rejected'
    | 'planning'
    | 'ongoing'
    | 'awaiting_bast'
    | 'ready_to_close'
    | 'closed';

export type ProjectTaskStatus =
    | 'todo'
    | 'assigned'
    | 'inprogress'
    | 'done'
    | 'cancelled';

export type Option = {
    id: number;
    name: string;
    [key: string]: unknown;
};

export type UserOption = {
    id: number;
    name: string;
    email: string;
    external_id: string | null;
};

export type CustomerProjectOption = {
    id: number;
    name: string;
    email?: string | null;
    company_name: string | null;
    is_primary?: boolean;
};

export type IncentiveProfileOption = {
    id: number;
    code: string;
    name: string;
    version: number;
};

export type ProjectActions = {
    can_edit_basic: boolean;
    can_prepare: boolean;
    can_submit: boolean;
    can_resubmit: boolean;
    can_start: boolean;
    can_refresh: boolean;
    can_close: boolean;
};

export type ProjectSummary = {
    id: number;
    name: string;
    project_date: string;
    status: ProjectStatus;
    mandays: string;
    location: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    customers: CustomerProjectOption[];
    pm: UserOption | null;
    incentive_profile: IncentiveProfileOption | null;
    tasks_count: number;
    done_tasks_count: number;
    members_count: number;
    actions: ProjectActions;
};

export type ProjectKanbanColumn = {
    status: ProjectStatus;
    label: string;
    projects: ProjectSummary[];
};

export type ProjectDetail = ProjectSummary & {
    location: string | null;
    urs_date: string | null;
    urs_number: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    uat_date: string | null;
    bast_date: string | null;
    rejection_notes: string | null;
    requester: UserOption | null;
    members: Array<{
        id: number;
        user: UserOption | null;
        project_role_code: string | null;
        project_role_name: string | null;
        pic_level_code: string | null;
        pic_level_name: string | null;
        is_support: boolean;
    }>;
    tasks: Array<{
        id: number;
        name: string;
        status: ProjectTaskStatus;
        plan_start_date: string | null;
        plan_end_date: string | null;
        pic: UserOption | null;
    }>;
    attachments: Array<{
        id: number;
        collection: string;
        original_name: string;
    }>;
};

export type ProjectIndexProps = {
    columns: ProjectKanbanColumn[];
    metrics: Record<ProjectStatus, number>;
    filters: {
        search: string;
        status: string;
        customer_id: string;
        pm_user_id: string;
    };
    options: {
        statuses: Array<{ value: ProjectStatus; label: string }>;
        customers: CustomerProjectOption[];
        users: UserOption[];
        incentive_profiles: IncentiveProfileOption[];
    };
};

export type PreparationProject = {
    id: number;
    name: string;
    project_date: string;
    status: ProjectStatus;
    mandays: string;
    incentive_profile_id: number | null;
    incentive_profile: IncentiveProfileOption | null;
    pm_user_id: number | null;
    request_user_id: number | null;
    location: string | null;
    urs_date: string | null;
    urs_number: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    uat_date: string | null;
    bast_date: string | null;
    customers: CustomerProjectOption[];
    members: PreparationMember[];
    access_rules: PreparationAccessRule[];
    tasks: PreparationTask[];
    attachments: Record<string, Array<{ id: number; original_name: string }>>;
};

export type PreparationMember = {
    id?: number;
    user_id: number | string;
    incentive_project_role_rule_id: number | string;
    incentive_pic_level_rule_id: number | string | null;
    project_role_name?: string | null;
    pic_level_name?: string | null;
    is_support: boolean;
    user?: UserOption | null;
};

export type PreparationAccessRule = {
    id?: number;
    user_id: number | string;
    permission: string;
    user?: UserOption | null;
};

export type PreparationTask = {
    id?: number | null;
    name: string;
    task_type_id: number | string | null;
    pic_user_id: number | string | null;
    status: ProjectTaskStatus;
    description: string | null;
    plan_start_date: string;
    plan_end_date: string;
    attachments?: File[];
    attachments_count?: number;
    allowed_statuses?: ProjectTaskStatus[];
    task_type?: { id: number; name: string; color: string } | null;
};

export type ProjectTaskTypeOption = {
    id: number;
    project_id: number | null;
    name: string;
    color: string;
    description?: string | null;
    is_active?: boolean;
    is_global?: boolean;
};

export type ProjectPreparationProps = {
    project: PreparationProject;
    options: {
        users: UserOption[];
        task_types: ProjectTaskTypeOption[];
        task_statuses: Array<{ value: ProjectTaskStatus; label: string }>;
        project_role_rules: Array<{
            id: number;
            role_code: string;
            role_name: string;
            is_support: boolean;
        }>;
        pic_level_rules: Array<{
            id: number;
            level_code: string;
            level_name: string;
        }>;
        access_permissions: Array<{ value: string; label: string }>;
    };
};

export type ProjectApprovalSummary = {
    id: number;
    name: string;
    status: ProjectStatus;
    project_date: string | null;
    approval_requested_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_notes: string | null;
    customers: CustomerProjectOption[];
    pm: UserOption | null;
    requester: UserOption | null;
    approver: UserOption | null;
    rejector: UserOption | null;
    members_count: number;
    tasks_count: number;
};

export type ProjectApprovalsProps = {
    projects: Paginated<ProjectApprovalSummary>;
    filters: {
        filter: string;
    };
    filter_options: Array<{ value: string; label: string }>;
};

export type TaskKanbanCard = {
    id: number;
    name: string;
    status: ProjectTaskStatus;
    description: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    attachments_count: number;
    project: {
        id: number;
        name: string;
        status: ProjectStatus;
        customer: string | null;
        pm: UserOption | null;
    } | null;
    pic: UserOption | null;
    task_type: { id: number; name: string; color: string } | null;
    allowed_statuses: ProjectTaskStatus[];
};

export type ProjectBulkTaskCreateProps = {
    project: {
        id: number;
        name: string;
    };
    options: {
        members: Array<{ id: number; user_id: number; name: string }>;
        task_types: Array<{ id: number; name: string; color: string }>;
    };
};

export type TaskKanbanColumn = {
    status: ProjectTaskStatus;
    label: string;
    tasks: TaskKanbanCard[];
};

export type TaskBoardProps = {
    columns: TaskKanbanColumn[];
    filters: {
        search: string;
        project_id: string;
        pic_user_id: string;
        task_type_id: string;
        due: string;
    };
    options: {
        projects: Array<{ id: number; name: string }>;
        users: UserOption[];
        task_types: Array<{ id: number; project_id?: number | null; name: string; color: string }>;
        statuses: Array<{ value: ProjectTaskStatus; label: string }>;
        due_filters: Array<{ value: string; label: string }>;
    };
};

export type ProjectPreparationIndexProps = {
    projects: ProjectSummary[];
    columns: ProjectKanbanColumn[];
    filters: {
        search: string;
        status: string;
        customer_id: string;
        pm_user_id: string;
    };
    options: {
        statuses: Array<{ value: ProjectStatus; label: string }>;
        customers: CustomerProjectOption[];
        users: UserOption[];
        incentive_profiles: IncentiveProfileOption[];
    };
};

export type DashboardProjectCard = {
    id: number;
    name: string;
    status: ProjectStatus;
    customer: string | null;
    pm: string | null;
    plan_end_date: string | null;
};

export type DashboardProps = {
    metrics: {
        active_projects: number;
        awaiting_approval: number;
        overdue_tasks: number;
        due_this_week_tasks: number;
    };
    project_status_distribution: Array<{
        status: ProjectStatus;
        label: string;
        count: number;
    }>;
    task_status_distribution: Array<{
        status: ProjectTaskStatus;
        label: string;
        count: number;
    }>;
    recent_rejected_projects: DashboardProjectCard[];
    ready_to_close_projects: DashboardProjectCard[];
    scope: 'global' | 'assigned';
};
