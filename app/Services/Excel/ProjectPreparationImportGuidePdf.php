<?php

namespace App\Services\Excel;

use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\TaskType;
use App\Models\User;
use Illuminate\Support\Collection;

class ProjectPreparationImportGuidePdf
{
    /**
     * @return array<int, string>
     */
    public function importRules(): array
    {
        return [
            'Use the latest Project Preparation Excel template. Do not rename sheets or header columns.',
            'Attachments are not imported. Upload URS/UAT/BAST/task attachments manually inside the application after import.',
            'Imported projects stay in draft/preparation status. The import does not submit projects to pending approval.',
            'Project upsert key: project_id when filled; otherwise name + project_date.',
            'Task upsert key: task_id when filled; otherwise project reference + task name.',
            'Date format recommendation: YYYY-MM-DD. Boolean fields accept 1/0, true/false, yes/no, y/n, active/inactive, aktif.',
        ];
    }

    /**
     * @return array<int, string>
     */
    public function allowedValues(): array
    {
        return [
            'Project status: no status column in the template. Imported or updated preparation projects remain '.ProjectStatus::Draft->value.' unless existing lifecycle rules later move them.',
            'Task status values: '.implode(', ', array_map(fn (TaskStatus $status): string => $status->value, TaskStatus::cases())).'.',
            'Access Rules permission values: view, edit, manage_tasks.',
            'Project Customers is_primary: use 1 or true for the primary customer. If several rows are primary, the first one is used.',
            'Members is_support: use 1/true/yes/y/active/aktif for support member; use 0/false/no/n/inactive or leave blank for non-support.',
        ];
    }

    /**
     * @return array<string, array<int, array<int, mixed>>>
     */
    public function data(): array
    {
        $profiles = IncentiveProfile::query()
            ->with(['projectRoleRules', 'picLevelRules'])
            ->where('status', IncentiveProfileStatus::Active->value)
            ->orderBy('code')
            ->orderBy('version')
            ->get();

        return [
            'profiles' => $profiles
                ->map(fn (IncentiveProfile $profile): array => [$profile->code, $profile->version, $profile->name, $profile->status->value])
                ->all(),
            'project_roles' => $profiles
                ->flatMap(fn (IncentiveProfile $profile): Collection => $profile->projectRoleRules
                    ->sortBy('role_code')
                    ->map(fn ($rule): array => [$profile->code.' v'.$profile->version, $rule->role_code, $rule->role_name, $rule->is_support ? '1' : '0']))
                ->values()
                ->all(),
            'pic_levels' => $profiles
                ->flatMap(fn (IncentiveProfile $profile): Collection => $profile->picLevelRules
                    ->sortBy('level_code')
                    ->map(fn ($rule): array => [$profile->code.' v'.$profile->version, $rule->level_code, $rule->level_name]))
                ->values()
                ->all(),
            'users' => User::query()
                ->with(['department', 'roles'])
                ->where('is_active', true)
                ->orderBy('name')
                ->limit(100)
                ->get()
                ->map(fn (User $user): array => [$user->email, $user->name, $user->department?->code ?? '-', $user->roles->pluck('name')->implode(',')])
                ->all(),
            'customers' => Customer::query()
                ->where('is_active', true)
                ->orderBy('company_name')
                ->limit(100)
                ->get(['email', 'name', 'company_name'])
                ->map(fn (Customer $customer): array => [$customer->email ?? '-', $customer->name, $customer->company_name])
                ->all(),
            'task_types' => TaskType::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->limit(100)
                ->get(['id', 'project_id', 'name'])
                ->map(fn (TaskType $taskType): array => [$taskType->name, $taskType->project_id === null ? 'global' : 'project', $taskType->project_id ?? '-'])
                ->all(),
        ];
    }

    /**
     * @return array<int, array<int, string>>
     */
    public function requiredColumns(): array
    {
        return [
            ['Projects', 'name, project_date, mandays, incentive_profile_code, incentive_profile_version, pm_email, location, urs_date, urs_number, plan_start_date, plan_end_date'],
            ['Project Customers', 'project_id or project_name + project_date, customer_email or customer_company_name, is_primary'],
            ['Members', 'project_id or project_name + project_date, user_email, project_role_code, is_support'],
            ['Access Rules', 'project_id or project_name + project_date, user_email, permission'],
            ['Tasks', 'project_id or project_name + project_date, name, status, plan_start_date, plan_end_date'],
        ];
    }
}
