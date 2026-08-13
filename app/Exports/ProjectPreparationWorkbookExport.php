<?php

namespace App\Exports;

use App\Models\Project;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ProjectPreparationWorkbookExport implements WithMultipleSheets
{
    /**
     * @return array<int, ArraySheetExport>
     */
    public function sheets(): array
    {
        $projects = Project::query()
            ->with([
                'accessRules.user',
                'customers',
                'incentiveProfile',
                'members.user',
                'pm',
                'requester',
                'tasks.member.user',
                'tasks.taskType',
            ])
            ->orderBy('project_date')
            ->orderBy('name')
            ->get();

        return [
            new ArraySheetExport('Projects', $this->projectHeadings(), $projects->map(fn (Project $project): array => [
                $project->id,
                $project->name,
                $this->date($project->project_date),
                $project->mandays,
                $project->incentiveProfile?->code,
                $project->incentiveProfile?->version,
                $project->pm?->email,
                $project->requester?->email,
                $project->location,
                $this->date($project->urs_date),
                $project->urs_number,
                $this->date($project->plan_start_date),
                $this->date($project->plan_end_date),
                $this->date($project->uat_date),
                $this->date($project->bast_date),
            ])->all()),
            new ArraySheetExport('Project Customers', $this->projectCustomerHeadings(), $projects->flatMap(fn (Project $project) => $project->customers->map(fn ($customer): array => [
                $project->id,
                $project->name,
                $this->date($project->project_date),
                $customer->email,
                $customer->company_name,
                $customer->pivot->is_primary ? 1 : 0,
            ]))->values()->all()),
            new ArraySheetExport('Members', $this->memberHeadings(), $projects->flatMap(fn (Project $project) => $project->members->map(fn ($member): array => [
                $project->id,
                $project->name,
                $this->date($project->project_date),
                $member->user?->email,
                $member->project_role_code,
                $member->pic_level_code,
                $member->is_support ? 1 : 0,
            ]))->values()->all()),
            new ArraySheetExport('Access Rules', $this->accessRuleHeadings(), $projects->flatMap(fn (Project $project) => $project->accessRules->map(fn ($accessRule): array => [
                $project->id,
                $project->name,
                $this->date($project->project_date),
                $accessRule->user?->email,
                $accessRule->permission,
            ]))->values()->all()),
            new ArraySheetExport('Tasks', $this->taskHeadings(), $projects->flatMap(fn (Project $project) => $project->tasks->map(fn ($task): array => [
                $task->id,
                $project->id,
                $project->name,
                $this->date($project->project_date),
                $task->name,
                $task->taskType?->name,
                $task->member?->user?->email,
                $task->status?->value,
                $task->description,
                $this->date($task->plan_start_date),
                $this->date($task->plan_end_date),
            ]))->values()->all()),
        ];
    }

    /**
     * @return array<int, string>
     */
    public function projectHeadings(): array
    {
        return ['project_id', 'name', 'project_date', 'mandays', 'incentive_profile_code', 'incentive_profile_version', 'pm_email', 'requester_email', 'location', 'urs_date', 'urs_number', 'plan_start_date', 'plan_end_date', 'uat_date', 'bast_date'];
    }

    /**
     * @return array<int, string>
     */
    public function projectCustomerHeadings(): array
    {
        return ['project_id', 'project_name', 'project_date', 'customer_email', 'customer_company_name', 'is_primary'];
    }

    /**
     * @return array<int, string>
     */
    public function memberHeadings(): array
    {
        return ['project_id', 'project_name', 'project_date', 'user_email', 'project_role_code', 'pic_level_code', 'is_support'];
    }

    /**
     * @return array<int, string>
     */
    public function accessRuleHeadings(): array
    {
        return ['project_id', 'project_name', 'project_date', 'user_email', 'permission'];
    }

    /**
     * @return array<int, string>
     */
    public function taskHeadings(): array
    {
        return ['task_id', 'project_id', 'project_name', 'project_date', 'name', 'task_type_name', 'pic_user_email', 'status', 'description', 'plan_start_date', 'plan_end_date'];
    }

    private function date(mixed $value): ?string
    {
        if ($value instanceof Carbon) {
            return $value->toDateString();
        }

        return $value === null ? null : (string) $value;
    }
}
