import type { Paginated } from './incentive-profile';
import type { CustomerProjectOption, IncentiveProfileOption, UserOption } from './project';

export type ProjectCalculationSummary = {
    id: number;
    is_current: boolean;
    is_locked: boolean;
    mandays: string;
    base_score: string;
    support_pool: string;
    technical_pool: string;
    difference_days: number;
    delivery_status: string;
    delivery_multiplier: string;
    total_incentive: string;
    calculated_at: string | null;
    calculated_by: UserOption | null;
    locked_at: string | null;
    locked_by: UserOption | null;
    lock_notes: string | null;
};

export type ProjectCalculationActions = {
    can_view: boolean;
    can_lock: boolean;
    can_unlock: boolean;
};

export type ProjectCalculationProject = {
    id: number;
    name: string;
    project_date: string | null;
    mandays: string;
    customers: CustomerProjectOption[];
    pm: UserOption | null;
    incentive_profile: IncentiveProfileOption | null;
    members_count: number;
    calculation: ProjectCalculationSummary | null;
    actions: ProjectCalculationActions;
};

export type ProjectCalculationFilters = {
    search: string;
    incentive_profile_id: string;
    lock_status: string;
};

export type ProjectCalculationOption = {
    value: string;
    label: string;
};

export type ProjectCalculationIndexProps = {
    projects: Paginated<ProjectCalculationProject>;
    filters: ProjectCalculationFilters;
    options: {
        incentive_profiles: IncentiveProfileOption[];
        lock_statuses: ProjectCalculationOption[];
    };
    actions: {
        can_recalculate: boolean;
    };
};

export type ProjectCalculationItem = {
    id: number;
    employee: UserOption | null;
    employee_name: string;
    project_role: string;
    pic_level: string | null;
    is_support: boolean;
    pic_points: string;
    role_points: string;
    weight_points: string;
    weight_ratio: string;
    base_incentive: string;
    delivery_multiplier: string;
    final_incentive: string;
};

export type ProjectCalculationDetail = ProjectCalculationSummary & {
    project: {
        id: number;
        name: string;
        project_date: string | null;
        customers: CustomerProjectOption[];
        pm: UserOption | null;
    };
    incentive_profile: IncentiveProfileOption | null;
    items: ProjectCalculationItem[];
};

export type ProjectCalculationShowProps = {
    calculation: ProjectCalculationDetail;
    actions: ProjectCalculationActions;
};
