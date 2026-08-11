import {
    LayoutDashboard,
    FolderKanban,
    FileSpreadsheet,
    CheckCircle2,
    CheckSquare,
    CircleDollarSign,
    Users,
    Building2,
    CalendarDays,
    CalendarOff,
    UserCog,
    ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { index as customersIndex } from '@/actions/App/Http/Controllers/CustomerController';
import { index as departmentsIndex } from '@/actions/App/Http/Controllers/DepartmentController';
import { index as holidaysIndex } from '@/actions/App/Http/Controllers/HolidayController';
import { index as incentiveProfilesIndex } from '@/actions/App/Http/Controllers/IncentiveProfileController';
import { index as projectApprovalsIndex } from '@/actions/App/Http/Controllers/ProjectApprovalController';
import { index as projectsIndex } from '@/actions/App/Http/Controllers/ProjectController';
import projectPreparationsIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import { index as rolesIndex } from '@/actions/App/Http/Controllers/RoleController';
import tasksIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/UserController';
import { index as workingDayRulesIndex } from '@/actions/App/Http/Controllers/WorkingDayRuleController';
import { home } from '@/routes';

export type SidebarItem = {
    label: string;
    section: string;
    icon: LucideIcon;
    href?: string;
    permission?: string;
    status: 'ready' | 'planned';
};

export const sidebarItems: SidebarItem[] = [
    {
        label: 'Dashboard',
        section: 'Workspace',
        icon: LayoutDashboard,
        href: home.url(),
        status: 'ready',
    },
    {
        label: 'Projects',
        section: 'Project',
        icon: FolderKanban,
        href: projectsIndex.url(),
        permission: 'view_projects',
        status: 'ready',
    },
    {
        label: 'Project Preparation',
        section: 'Project',
        icon: FileSpreadsheet,
        href: projectPreparationsIndex.url(),
        permission: 'manage_projects',
        status: 'ready',
    },
    {
        label: 'Project Approvals',
        section: 'Project',
        icon: CheckCircle2,
        href: projectApprovalsIndex.url(),
        permission: 'approve_projects',
        status: 'ready',
    },
    {
        label: 'Tasks',
        section: 'Project',
        icon: CheckSquare,
        href: tasksIndex.url(),
        permission: 'view_tasks',
        status: 'ready',
    },
    {
        label: 'Incentive Profiles',
        section: 'Master Data',
        icon: CircleDollarSign,
        href: incentiveProfilesIndex.url(),
        permission: 'manage_incentive_profiles',
        status: 'ready',
    },
    {
        label: 'Customers',
        section: 'Master Data',
        icon: Users,
        href: customersIndex.url(),
        permission: 'manage_customers',
        status: 'ready',
    },
    {
        label: 'Departments',
        section: 'Master Data',
        icon: Building2,
        href: departmentsIndex.url(),
        permission: 'manage_departments',
        status: 'ready',
    },
    {
        label: 'Work Days',
        section: 'Master Data',
        icon: CalendarDays,
        href: workingDayRulesIndex.url(),
        permission: 'manage_working_calendar',
        status: 'ready',
    },
    {
        label: 'Holidays',
        section: 'Master Data',
        icon: CalendarOff,
        href: holidaysIndex.url(),
        permission: 'manage_working_calendar',
        status: 'ready',
    },
    {
        label: 'Users',
        section: 'Administration',
        icon: UserCog,
        href: usersIndex.url(),
        permission: 'manage_users',
        status: 'ready',
    },
    {
        label: 'Roles',
        section: 'Administration',
        icon: ShieldCheck,
        href: rolesIndex.url(),
        permission: 'manage_roles',
        status: 'ready',
    },
];
