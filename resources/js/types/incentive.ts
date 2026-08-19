import type { Paginated } from './incentive-profile';
import type { CustomerProjectOption, IncentiveProfileOption, UserOption } from './project';

export type IncentiveItem = {
    id: number;
    employee: UserOption;
    employee_name: string;
    project_role: string;
    pic_level: string | null;
    is_support: boolean;
    base_incentive: string;
    delivery_multiplier: string;
    final_incentive: string;
    calculation: {
        id: number | null;
        calculated_at: string | null;
        locked_at: string | null;
        delivery_status: string;
        total_incentive: string | null;
    };
    project: {
        id: number | null;
        name: string | null;
        project_date: string | null;
        customers: CustomerProjectOption[];
        pm: UserOption | null;
    };
    incentive_profile: IncentiveProfileOption | null;
};

export type IncentiveFilters = {
    search: string;
    employee_id: string;
    project_id: string;
    customer_id: string;
    incentive_profile_id: string;
    locked_from: string;
    locked_to: string;
};

export type IncentiveSummary = {
    items_count: number;
    employees_count: number;
    projects_count: number;
    total_incentive: string;
};

export type IncentiveWorkspaceOptions = {
    employees?: UserOption[];
    projects: Array<{ id: number; name: string }>;
    customers: Array<{ id: number; name: string; company_name: string | null }>;
    incentive_profiles: IncentiveProfileOption[];
};

export type MyIncentiveIndexProps = {
    items: Paginated<IncentiveItem>;
    summary: IncentiveSummary;
    filters: IncentiveFilters;
    options: IncentiveWorkspaceOptions;
};

export type AdminIncentiveIndexProps = MyIncentiveIndexProps & {
    options: IncentiveWorkspaceOptions & {
        employees: UserOption[];
    };
};
