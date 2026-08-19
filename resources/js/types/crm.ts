import type { Paginated } from './incentive-profile';
import type { IncentiveProfileOption, ProjectStatus, UserOption } from './project';

export type CrmCustomerRow = {
    id: number;
    name: string;
    email: string | null;
    company_name: string | null;
    is_active: boolean;
    projects_count: number;
    active_projects_count: number;
    closed_projects_count: number;
    last_project_update: string | null;
    locked_incentive_total: string;
};

export type CrmCustomerDetail = {
    id: number;
    name: string;
    email: string | null;
    company_name: string | null;
    company_address: string | null;
    is_active: boolean;
    summary: {
        projects_count: number;
        active_projects_count: number;
        closed_projects_count: number;
        locked_incentive_total: string;
    };
};

export type CrmProjectRow = {
    id: number;
    name: string;
    status: ProjectStatus;
    project_date: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    mandays: string;
    progress: number;
    tasks_count: number;
    done_tasks_count: number;
    members_count: number;
    pm: UserOption | null;
    incentive_profile: IncentiveProfileOption | null;
    calculation: {
        id: number;
        is_locked: boolean;
        total_incentive: string;
        calculated_at: string | null;
        locked_at: string | null;
        delivery_status: string;
    } | null;
    actions: {
        can_view_project: boolean;
        can_view_calculation: boolean;
    };
};

export type CrmIndexProps = {
    customers: Paginated<CrmCustomerRow>;
    filters: {
        search: string;
        status: string;
    };
    options: {
        statuses: Array<{ value: string; label: string }>;
    };
};

export type CrmShowProps = {
    customer: CrmCustomerDetail;
    projects: Paginated<CrmProjectRow>;
    status_distribution: Array<{ status: ProjectStatus; label: string; count: number }>;
    filters: {
        search: string;
        status: string;
    };
    options: {
        statuses: Array<{ value: ProjectStatus; label: string }>;
    };
};
