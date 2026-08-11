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
    customers: CustomerProjectOption[];
    pm: UserOption | null;
    incentive_profile: IncentiveProfileOption | null;
    tasks_count: number;
    members_count: number;
    actions: ProjectActions;
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
    projects: Paginated<ProjectSummary>;
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
    status: ProjectStatus;
    incentive_profile_id: number | null;
    pm_user_id: number | null;
    request_user_id: number | null;
    location: string | null;
    urs_date: string | null;
    urs_number: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    uat_date: string | null;
    bast_date: string | null;
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
};

export type ProjectPreparationProps = {
    project: PreparationProject;
    options: {
        users: UserOption[];
        task_types: Array<{ id: number; name: string; color: string }>;
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
    project_date: string | null;
    approval_requested_at: string | null;
    customers: CustomerProjectOption[];
    pm: UserOption | null;
    requester: UserOption | null;
    members_count: number;
    tasks_count: number;
};

export type ProjectApprovalsProps = {
    projects: Paginated<ProjectApprovalSummary>;
};
