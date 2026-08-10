export type IncentiveProfileStatus =
    'draft' | 'active' | 'inactive' | 'archived';

export type StatusOption = {
    value: IncentiveProfileStatus;
    label: string;
};

export type IncentiveProfileActions = {
    can_edit: boolean;
    can_delete: boolean;
    can_activate: boolean;
    can_inactivate: boolean;
    can_archive: boolean;
    can_version: boolean;
};

export type RuleCounts = {
    manday: number;
    pic_level: number;
    project_role: number;
    delivery: number;
};

export type UsageCounts = {
    projects: number;
    calculations: number;
};

export type IncentiveProfileSummary = {
    id: number;
    code: string;
    name: string;
    version: number;
    status: IncentiveProfileStatus;
    effective_from: string | null;
    effective_to: string | null;
    support_percent: string;
    rule_counts: RuleCounts;
    usage_counts: UsageCounts;
    actions: IncentiveProfileActions;
};

export type MandayRule = {
    id?: number;
    min_mandays: number | string;
    max_mandays: number | string | null;
    base_score: number | string;
};

export type PicLevelRule = {
    id?: number;
    level_code: string;
    level_name: string;
    points: number | string;
};

export type ProjectRoleRule = {
    id?: number;
    role_code: string;
    role_name: string;
    points: number | string;
    is_support: boolean;
};

export type DeliveryRule = {
    id?: number;
    name: string;
    min_difference_days: number | string | null;
    max_difference_days: number | string | null;
    multiplier: number | string;
};

export type IncentiveProfileDetail = IncentiveProfileSummary & {
    description: string | null;
    created_by?: number | null;
    updated_by?: number | null;
    manday_rules: MandayRule[];
    pic_level_rules: PicLevelRule[];
    project_role_rules: ProjectRoleRule[];
    delivery_rules: DeliveryRule[];
};

export type IncentiveProfileFormPayload = {
    code: string;
    name: string;
    description: string | null;
    version: number | string;
    effective_from: string;
    effective_to: string | null;
    support_percent: number | string;
    manday_rules: MandayRule[];
    pic_level_rules: PicLevelRule[];
    project_role_rules: ProjectRoleRule[];
    delivery_rules: DeliveryRule[];
};

export type Paginated<T> = {
    data: T[];
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    total?: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    meta?: {
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
};
