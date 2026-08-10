export type MasterDataFilters = {
    search?: string;
    status?: string;
    department_id?: string;
};

export type CustomerSummary = {
    id: number;
    name: string;
    email: string | null;
    company_name: string | null;
    company_address: string | null;
    is_active: boolean;
    projects_count: number;
};

export type DepartmentSummary = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    users_count: number;
};

export type DepartmentOption = {
    id: number;
    code: string;
    name: string;
    is_active?: boolean;
};

export type RoleOption = {
    id: number;
    name: string;
};

export type UserSummary = {
    id: number;
    name: string;
    email: string;
    external_id: string | null;
    department_id: number | null;
    department: DepartmentOption | null;
    roles: string[];
    is_active: boolean;
    project_memberships_count: number;
    project_access_rules_count: number;
};

export type PermissionOption = {
    id: number;
    name: string;
};

export type PermissionGroup = {
    category: string;
    permissions: PermissionOption[];
};

export type RoleSummary = {
    id: number;
    name: string;
    guard_name: string;
    permissions: string[];
    users_count: number;
};
