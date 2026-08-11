import { index as customersIndex } from '@/actions/App/Http/Controllers/CustomerController';
import { index as departmentsIndex } from '@/actions/App/Http/Controllers/DepartmentController';
import { index as incentiveProfilesIndex } from '@/actions/App/Http/Controllers/IncentiveProfileController';
import { index as projectApprovalsIndex } from '@/actions/App/Http/Controllers/ProjectApprovalController';
import { index as projectsIndex } from '@/actions/App/Http/Controllers/ProjectController';
import { index as rolesIndex } from '@/actions/App/Http/Controllers/RoleController';
import projectPreparationsIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import tasksIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/UserController';
import { home } from '@/routes';

export type SidebarItem = {
    label: string;
    section: string;
    href?: string;
    permission?: string;
    status: 'ready' | 'planned';
};

export const sidebarItems: SidebarItem[] = [
    {
        label: 'Dashboard',
        section: 'Workspace',
        href: home.url(),
        status: 'ready',
    },
    {
        label: 'Projects',
        section: 'Project',
        href: projectsIndex.url(),
        permission: 'view_projects',
        status: 'ready',
    },
    {
        label: 'Project Preparation',
        section: 'Project',
        href: projectPreparationsIndex.url(),
        permission: 'manage_projects',
        status: 'ready',
    },
    {
        label: 'Project Approvals',
        section: 'Project',
        href: projectApprovalsIndex.url(),
        permission: 'approve_projects',
        status: 'ready',
    },
    {
        label: 'Tasks',
        section: 'Project',
        href: tasksIndex.url(),
        permission: 'view_tasks',
        status: 'ready',
    },
    {
        label: 'Incentive Profiles',
        section: 'Master Data',
        href: incentiveProfilesIndex.url(),
        permission: 'manage_incentive_profiles',
        status: 'ready',
    },
    {
        label: 'Customers',
        section: 'Master Data',
        href: customersIndex.url(),
        permission: 'manage_customers',
        status: 'ready',
    },
    {
        label: 'Departments',
        section: 'Master Data',
        href: departmentsIndex.url(),
        permission: 'manage_departments',
        status: 'ready',
    },
    {
        label: 'Users',
        section: 'Administration',
        href: usersIndex.url(),
        permission: 'manage_users',
        status: 'ready',
    },
    {
        label: 'Roles',
        section: 'Administration',
        href: rolesIndex.url(),
        permission: 'manage_roles',
        status: 'ready',
    },
];
