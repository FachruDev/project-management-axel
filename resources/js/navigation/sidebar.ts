import {
    LayoutDashboard,
    FolderKanban,
    FileSpreadsheet,
    FileText,
    Calculator,
    CheckCircle2,
    CheckSquare,
    CircleDollarSign,
    Handshake,
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
import IncentiveController from '@/actions/App/Http/Controllers/IncentiveController';
import MyIncentiveController from '@/actions/App/Http/Controllers/MyIncentiveController';
import { index as projectApprovalsIndex } from '@/actions/App/Http/Controllers/ProjectApprovalController';
import { index as projectCalculationsIndex } from '@/actions/App/Http/Controllers/ProjectCalculationController';
import { index as projectsIndex } from '@/actions/App/Http/Controllers/ProjectController';
import projectPreparationsIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import { index as projectQuotationsIndex } from '@/actions/App/Http/Controllers/ProjectQuotationController';
import { index as rolesIndex } from '@/actions/App/Http/Controllers/RoleController';
import tasksIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/UserController';
import { index as workingDayRulesIndex } from '@/actions/App/Http/Controllers/WorkingDayRuleController';
import { index as crmIndex } from '@/actions/App/Http/Controllers/CrmController';
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
        label: 'Project Calculations',
        section: 'Project',
        icon: Calculator,
        href: projectCalculationsIndex.url(),
        permission: 'view_project_incentives',
        status: 'ready',
    },
    {
        label: 'Project Quotations',
        section: 'Project',
        icon: FileText,
        href: projectQuotationsIndex.url(),
        permission: 'manage_project_quotations',
        status: 'ready',
    },
    {
        label: 'My Incentive',
        section: 'Incentive',
        icon: CircleDollarSign,
        href: MyIncentiveController.url(),
        permission: 'view_my_incentives',
        status: 'ready',
    },
    {
        label: 'Incentives',
        section: 'Incentive',
        icon: Calculator,
        href: IncentiveController.url(),
        permission: 'view_all_incentives',
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
        label: 'CRM',
        section: 'Workspace',
        icon: Handshake,
        href: crmIndex.url(),
        permission: 'view_crm',
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
