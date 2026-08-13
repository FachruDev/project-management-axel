import type { InertiaFormProps } from '@inertiajs/react';

import type { PreparationAccessRule, PreparationMember, PreparationTask } from '@/types';

export type PreparationPayload = {
    name: string;
    project_date: string;
    customer_ids: string[];
    primary_customer_id: string;
    mandays: string;
    incentive_profile_id: string;
    pm_user_id: string;
    request_user_id: string;
    location: string;
    urs_date: string;
    urs_number: string;
    urs_file: File | null;
    request_evidence: File[];
    plan_start_date: string;
    plan_end_date: string;
    uat_date: string;
    uat_file: File | null;
    bast_date: string;
    bast_file: File | null;
    members: PreparationMember[];
    access_rules: PreparationAccessRule[];
    tasks: PreparationTask[];
};

export type TaskTypePayload = {
    name: string;
    color: string;
    description: string;
    is_active: boolean;
};

export type PreparationForm = InertiaFormProps<PreparationPayload>;

export type TaskTypeForm = InertiaFormProps<TaskTypePayload>;

export const blankTaskType: TaskTypePayload = {
    name: '',
    color: '#4f46e5',
    description: '',
    is_active: true,
};

export function blankMember(): PreparationMember {
    return {
        user_id: '',
        incentive_project_role_rule_id: '',
        incentive_pic_level_rule_id: '',
        is_support: false,
    };
}

export function blankTask(): PreparationTask {
    return {
        id: null,
        name: '',
        task_type_id: '',
        pic_user_id: '',
        status: 'todo',
        description: '',
        plan_start_date: '',
        plan_end_date: '',
        attachments: [],
        attachments_count: 0,
        allowed_statuses: [],
        task_type: null,
    };
}
