<?php

namespace App\Services\Excel;

use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectAccessRule;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ProjectPreparationExcelService
{
    public function __construct(private readonly ProjectAuditLogger $auditLogger) {}

    /**
     * @return array<int, array<int, string>>
     */
    public function headings(): array
    {
        return [
            ['project_id', 'name', 'project_date', 'mandays', 'incentive_profile_code', 'incentive_profile_version', 'pm_email', 'requester_email', 'location', 'urs_date', 'urs_number', 'plan_start_date', 'plan_end_date', 'uat_date', 'bast_date'],
            ['project_id', 'project_name', 'project_date', 'customer_email', 'customer_company_name', 'is_primary'],
            ['project_id', 'project_name', 'project_date', 'user_email', 'project_role_code', 'pic_level_code', 'is_support'],
            ['project_id', 'project_name', 'project_date', 'user_email', 'permission'],
            ['task_id', 'project_id', 'project_name', 'project_date', 'name', 'task_type_name', 'pic_user_email', 'status', 'description', 'plan_start_date', 'plan_end_date'],
        ];
    }

    public function import(UploadedFile $file, User $actor): ImportSummary
    {
        $sheets = ExcelWorkbook::sheets($file, 'Project preparation import');
        $sheetErrors = $this->sheetErrors($sheets);

        if ($sheetErrors !== []) {
            throw new ExcelImportException($sheetErrors);
        }

        $projectRows = $sheets[0] ?? [];
        $customerRows = $sheets[1] ?? [];
        $memberRows = $sheets[2] ?? [];
        $accessRuleRows = $sheets[3] ?? [];
        $taskRows = $sheets[4] ?? [];
        $errors = [];
        $created = 0;
        $updated = 0;

        return DB::transaction(function () use ($projectRows, $customerRows, $memberRows, $accessRuleRows, $taskRows, $actor, &$errors, &$created, &$updated): ImportSummary {
            $projectsByKey = [];

            foreach ($projectRows as $index => $row) {
                if (ExcelRow::blank($row)) {
                    continue;
                }

                $line = $index + 2;
                $rowErrors = [];
                $name = ExcelRow::string($row, 'name');
                $projectDate = ExcelRow::date($row, 'project_date');
                $mandays = ExcelRow::string($row, 'mandays');
                $profileCode = ExcelRow::string($row, 'incentive_profile_code');
                $profileVersion = ExcelRow::string($row, 'incentive_profile_version');
                $pmEmail = ExcelRow::string($row, 'pm_email');
                $location = ExcelRow::string($row, 'location');
                $ursDate = ExcelRow::date($row, 'urs_date');
                $ursNumber = ExcelRow::string($row, 'urs_number');
                $planStartDate = ExcelRow::date($row, 'plan_start_date');
                $planEndDate = ExcelRow::date($row, 'plan_end_date');

                foreach ([
                    'name' => $name,
                    'project_date' => $projectDate,
                    'mandays' => $mandays,
                    'incentive_profile_code' => $profileCode,
                    'incentive_profile_version' => $profileVersion,
                    'pm_email' => $pmEmail,
                    'location' => $location,
                    'urs_date' => $ursDate,
                    'urs_number' => $ursNumber,
                    'plan_start_date' => $planStartDate,
                    'plan_end_date' => $planEndDate,
                ] as $field => $value) {
                    if ($value === null) {
                        $rowErrors[] = "Projects row {$line}: {$field} is required.";
                    }
                }

                $profile = $profileCode === null || $profileVersion === null ? null : IncentiveProfile::query()
                    ->where('code', $profileCode)
                    ->where('version', (int) $profileVersion)
                    ->first();

                if (! $profile instanceof IncentiveProfile) {
                    $rowErrors[] = "Projects row {$line}: incentive profile {$profileCode} v{$profileVersion} was not found.";
                }

                $pm = $pmEmail === null ? null : User::query()->where('email', $pmEmail)->first();

                if (! $pm instanceof User) {
                    $rowErrors[] = "Projects row {$line}: pm_email {$pmEmail} was not found.";
                }

                $requester = null;
                $requesterEmail = ExcelRow::string($row, 'requester_email');

                if ($requesterEmail !== null) {
                    $requester = User::query()->where('email', $requesterEmail)->first();

                    if (! $requester instanceof User) {
                        $rowErrors[] = "Projects row {$line}: requester_email {$requesterEmail} was not found.";
                    }
                }

                if ($rowErrors !== []) {
                    array_push($errors, ...$rowErrors);

                    continue;
                }

                $project = $this->findProject($row, $name, $projectDate);
                $oldData = $project instanceof Project ? $this->projectSnapshot($project) : null;
                $payload = [
                    'name' => $name,
                    'project_date' => $projectDate,
                    'mandays' => $mandays,
                    'incentive_profile_id' => $profile->id,
                    'pm_user_id' => $pm->id,
                    'request_user_id' => $requester?->id,
                    'location' => $location,
                    'urs_date' => $ursDate,
                    'urs_number' => $ursNumber,
                    'plan_start_date' => $planStartDate,
                    'plan_end_date' => $planEndDate,
                    'uat_date' => ExcelRow::date($row, 'uat_date'),
                    'bast_date' => ExcelRow::date($row, 'bast_date'),
                    'updated_by' => $actor->id,
                ];

                if ($project instanceof Project) {
                    $project->update($payload);
                    $updated++;
                } else {
                    $project = Project::create([
                        ...$payload,
                        'status' => ProjectStatus::Draft,
                        'created_by' => $actor->id,
                    ]);
                    $created++;
                }

                $project->refresh();
                $projectsByKey[$this->projectKey($row, $project)] = $project;

                $this->auditLogger->log(
                    $project,
                    $actor,
                    $oldData === null ? 'project_imported' : 'project_import_updated',
                    $project,
                    $oldData,
                    $this->projectSnapshot($project),
                    null,
                    'excel_import',
                );
            }

            $this->syncProjectCustomers($projectsByKey, $customerRows, $actor, $errors);
            $this->syncMembers($projectsByKey, $memberRows, $actor, $errors);
            $this->syncAccessRules($projectsByKey, $accessRuleRows, $actor, $errors);
            $this->syncTasks($projectsByKey, $taskRows, $actor, $errors);

            if ($errors !== []) {
                throw new ExcelImportException($errors);
            }

            return new ImportSummary($created, $updated);
        });
    }

    /**
     * @return array<int, array<int, array<int, mixed>>>
     */
    public function sampleSheets(): array
    {
        return [
            [
                ['', 'Project Contoh Implementasi', '2026-08-20', 12, 'INCENTIVE', 1, 'pm@example.com', 'requester@example.com', 'Jakarta', '2026-08-19', 'URS-001', '2026-08-21', '2026-08-30', '', ''],
            ],
            [
                ['', 'Project Contoh Implementasi', '2026-08-20', 'customer@example.com', 'PT Contoh Sukses', 1],
            ],
            [
                ['', 'Project Contoh Implementasi', '2026-08-20', 'developer@example.com', 'DEV', 'L1', 0],
            ],
            [
                ['', 'Project Contoh Implementasi', '2026-08-20', 'viewer@example.com', 'view'],
            ],
            [
                ['', '', 'Project Contoh Implementasi', '2026-08-20', 'Prepare URS', 'Analysis', 'developer@example.com', TaskStatus::Todo->value, 'Contoh task tanpa attachment', '2026-08-21', '2026-08-22'],
            ],
        ];
    }

    /**
     * @param  array<int, array<int, array<string, mixed>>>  $sheets
     * @return array<int, string>
     */
    private function sheetErrors(array $sheets): array
    {
        $errors = [];
        $sheetNames = ['Projects', 'Project Customers', 'Members', 'Access Rules', 'Tasks'];
        $headings = $this->headings();

        foreach ($sheetNames as $index => $sheetName) {
            if (! array_key_exists($index, $sheets)) {
                $errors[] = "{$sheetName} sheet is missing. Download the latest project preparation template and keep all five sheets.";

                continue;
            }

            array_push(
                $errors,
                ...ExcelWorkbook::headingErrors($sheets[$index], $headings[$index], "{$sheetName} sheet", $index === 0),
            );
        }

        return $errors;
    }

    /**
     * @param  array<string, Project>  $projectsByKey
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     */
    private function syncProjectCustomers(array $projectsByKey, array $rows, User $actor, array &$errors): void
    {
        $grouped = $this->groupRowsByProject($projectsByKey, $rows, 'Project Customers', $errors);

        foreach ($grouped as $projectKey => $projectRows) {
            $project = $projectsByKey[$projectKey];
            $payload = [];
            $primaryCustomerId = null;

            foreach ($projectRows as [$line, $row]) {
                $customer = $this->findCustomer($row);

                if (! $customer instanceof Customer) {
                    $errors[] = "Project Customers row {$line}: customer_email/customer_company_name was not found.";

                    continue;
                }

                if (ExcelRow::bool($row, 'is_primary', false)) {
                    $primaryCustomerId ??= $customer->id;
                }

                $payload[$customer->id] = ['is_primary' => false];
            }

            if ($payload === []) {
                continue;
            }

            $primaryCustomerId ??= array_key_first($payload);
            $existingPayload = $project->customers()
                ->get()
                ->mapWithKeys(fn (Customer $customer): array => [$customer->id => ['is_primary' => false]])
                ->all();

            foreach (array_keys($payload) as $customerId) {
                $payload[$customerId] = ['is_primary' => $customerId === $primaryCustomerId];
            }

            $project->customers()->syncWithoutDetaching(array_replace($existingPayload, $payload));
            $this->auditLogger->log($project, $actor, 'project_customers_imported', $project, null, ['customer_ids' => array_keys($payload)], null, 'excel_import');
        }
    }

    /**
     * @param  array<string, Project>  $projectsByKey
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     */
    private function syncMembers(array $projectsByKey, array $rows, User $actor, array &$errors): void
    {
        foreach ($this->groupRowsByProject($projectsByKey, $rows, 'Members', $errors) as $projectKey => $projectRows) {
            $project = $projectsByKey[$projectKey];

            foreach ($projectRows as [$line, $row]) {
                $user = $this->findUser($row, 'user_email');
                $roleCode = ExcelRow::string($row, 'project_role_code');

                if (! $user instanceof User) {
                    $errors[] = "Members row {$line}: user_email was not found.";

                    continue;
                }

                $roleRule = $roleCode === null ? null : IncentiveProjectRoleRule::query()
                    ->where('incentive_profile_id', $project->incentive_profile_id)
                    ->where('role_code', $roleCode)
                    ->first();

                if (! $roleRule instanceof IncentiveProjectRoleRule) {
                    $errors[] = "Members row {$line}: project_role_code {$roleCode} was not found for project incentive profile.";

                    continue;
                }

                $picRule = null;
                $picLevelCode = ExcelRow::string($row, 'pic_level_code');

                if ($picLevelCode !== null) {
                    $picRule = IncentivePicLevelRule::query()
                        ->where('incentive_profile_id', $project->incentive_profile_id)
                        ->where('level_code', $picLevelCode)
                        ->first();

                    if (! $picRule instanceof IncentivePicLevelRule) {
                        $errors[] = "Members row {$line}: pic_level_code {$picLevelCode} was not found for project incentive profile.";

                        continue;
                    }
                }

                $member = ProjectMember::query()
                    ->where('project_id', $project->id)
                    ->where('user_id', $user->id)
                    ->first();
                $oldData = $member instanceof ProjectMember ? $this->memberSnapshot($member) : null;
                $member = ProjectMember::updateOrCreate(
                    ['project_id' => $project->id, 'user_id' => $user->id],
                    [
                        'incentive_project_role_rule_id' => $roleRule->id,
                        'incentive_pic_level_rule_id' => $picRule?->id,
                        'project_role_code' => $roleRule->role_code,
                        'project_role_name' => $roleRule->role_name,
                        'pic_level_code' => $picRule?->level_code,
                        'pic_level_name' => $picRule?->level_name,
                        'is_support' => ExcelRow::bool($row, 'is_support', false) || $roleRule->is_support,
                    ],
                );

                $this->auditLogger->log($project, $actor, $oldData === null ? 'member_imported' : 'member_import_updated', $member, $oldData, $this->memberSnapshot($member), null, 'excel_import');
            }
        }
    }

    /**
     * @param  array<string, Project>  $projectsByKey
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     */
    private function syncAccessRules(array $projectsByKey, array $rows, User $actor, array &$errors): void
    {
        foreach ($this->groupRowsByProject($projectsByKey, $rows, 'Access Rules', $errors) as $projectKey => $projectRows) {
            $project = $projectsByKey[$projectKey];

            foreach ($projectRows as [$line, $row]) {
                $user = $this->findUser($row, 'user_email');
                $permission = ExcelRow::string($row, 'permission');

                if (! $user instanceof User) {
                    $errors[] = "Access Rules row {$line}: user_email was not found.";

                    continue;
                }

                if (! in_array($permission, ['view', 'edit', 'manage_tasks'], true)) {
                    $errors[] = "Access Rules row {$line}: permission must be view, edit, or manage_tasks.";

                    continue;
                }

                $accessRule = ProjectAccessRule::query()
                    ->firstOrCreate(
                        ['project_id' => $project->id, 'user_id' => $user->id, 'permission' => $permission],
                        ['granted_by' => $actor->id],
                    );

                $this->auditLogger->log($project, $actor, 'access_rule_imported', $accessRule, null, $this->accessRuleSnapshot($accessRule), null, 'excel_import');
            }
        }
    }

    /**
     * @param  array<string, Project>  $projectsByKey
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     */
    private function syncTasks(array $projectsByKey, array $rows, User $actor, array &$errors): void
    {
        foreach ($this->groupRowsByProject($projectsByKey, $rows, 'Tasks', $errors) as $projectKey => $projectRows) {
            $project = $projectsByKey[$projectKey];
            $membersByEmail = $project->members()->with('user')->get()->keyBy(fn (ProjectMember $member): ?string => $member->user?->email);

            foreach ($projectRows as [$line, $row]) {
                $name = ExcelRow::string($row, 'name');
                $statusValue = ExcelRow::string($row, 'status') ?? TaskStatus::Todo->value;
                $planStartDate = ExcelRow::date($row, 'plan_start_date');
                $planEndDate = ExcelRow::date($row, 'plan_end_date');
                $rowErrors = [];

                if ($name === null) {
                    $rowErrors[] = "Tasks row {$line}: name is required.";
                }

                $status = TaskStatus::tryFrom($statusValue);

                if (! $status instanceof TaskStatus) {
                    $rowErrors[] = "Tasks row {$line}: status {$statusValue} is invalid.";
                }

                if ($planStartDate === null) {
                    $rowErrors[] = "Tasks row {$line}: valid plan_start_date is required.";
                }

                if ($planEndDate === null) {
                    $rowErrors[] = "Tasks row {$line}: valid plan_end_date is required.";
                }

                $taskType = $this->findTaskType($project, ExcelRow::string($row, 'task_type_name'));
                $picEmail = ExcelRow::string($row, 'pic_user_email');
                $projectMember = $picEmail === null ? null : $membersByEmail->get($picEmail);

                if ($picEmail !== null && ! $projectMember instanceof ProjectMember) {
                    $rowErrors[] = "Tasks row {$line}: pic_user_email {$picEmail} is not a project member.";
                }

                if ($rowErrors !== []) {
                    array_push($errors, ...$rowErrors);

                    continue;
                }

                $task = $this->findTask($project, $row, $name);
                $oldData = $task instanceof ProjectTask ? $this->taskSnapshot($task) : null;
                $payload = [
                    'task_type_id' => $taskType?->id,
                    'project_member_id' => $projectMember?->id,
                    'name' => $name,
                    'status' => $status,
                    'description' => ExcelRow::string($row, 'description'),
                    'plan_start_date' => $planStartDate,
                    'plan_end_date' => $planEndDate,
                    'actual_start_date' => $this->actualStartDate($status),
                    'actual_end_date' => $status === TaskStatus::Done ? now()->toDateString() : null,
                ];

                if ($task instanceof ProjectTask) {
                    $task->update($payload);
                } else {
                    $task = $project->tasks()->create($payload);
                }

                $this->auditLogger->log($project, $actor, $oldData === null ? 'task_imported' : 'task_import_updated', $task, $oldData, $this->taskSnapshot($task->refresh()), null, 'excel_import');
            }
        }
    }

    /**
     * @param  array<string, Project>  $projectsByKey
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     * @return array<string, array<int, array{0: int, 1: array<string, mixed>}>>
     */
    private function groupRowsByProject(array $projectsByKey, array $rows, string $sheet, array &$errors): array
    {
        $grouped = [];

        foreach ($rows as $index => $row) {
            if (ExcelRow::blank($row)) {
                continue;
            }

            $line = $index + 2;
            $projectKey = $this->rowProjectKey($row);

            if ($projectKey === null || ! isset($projectsByKey[$projectKey])) {
                $errors[] = "{$sheet} row {$line}: project reference was not found in Projects sheet.";

                continue;
            }

            $grouped[$projectKey][] = [$line, $row];
        }

        return $grouped;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function findProject(array $row, string $name, string $projectDate): ?Project
    {
        $projectId = ExcelRow::string($row, 'project_id');

        if ($projectId !== null) {
            return Project::query()->whereKey((int) $projectId)->first();
        }

        return Project::query()
            ->where('name', $name)
            ->whereDate('project_date', $projectDate)
            ->first();
    }

    private function projectKey(array $row, Project $project): string
    {
        return ExcelRow::string($row, 'project_id') ?? $project->name.'|'.$project->project_date?->toDateString();
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function rowProjectKey(array $row): ?string
    {
        $projectId = ExcelRow::string($row, 'project_id');

        if ($projectId !== null) {
            return $projectId;
        }

        $name = ExcelRow::string($row, 'project_name');
        $date = ExcelRow::date($row, 'project_date');

        return $name !== null && $date !== null ? $name.'|'.$date : null;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function findCustomer(array $row): ?Customer
    {
        $email = ExcelRow::string($row, 'customer_email');

        if ($email !== null) {
            return Customer::query()->where('email', $email)->first();
        }

        $companyName = ExcelRow::string($row, 'customer_company_name');

        return $companyName === null ? null : Customer::query()->where('company_name', $companyName)->first();
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function findUser(array $row, string $key): ?User
    {
        $email = ExcelRow::string($row, $key);

        return $email === null ? null : User::query()->where('email', $email)->first();
    }

    private function findTaskType(Project $project, ?string $name): ?TaskType
    {
        if ($name === null) {
            return null;
        }

        return TaskType::query()
            ->where('name', $name)
            ->where('project_id', $project->id)
            ->first()
            ?? TaskType::query()
                ->where('name', $name)
                ->whereNull('project_id')
                ->first();
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function findTask(Project $project, array $row, string $name): ?ProjectTask
    {
        $taskId = ExcelRow::string($row, 'task_id');

        if ($taskId !== null) {
            return $project->tasks()->whereKey((int) $taskId)->first();
        }

        return $project->tasks()->where('name', $name)->first();
    }

    private function actualStartDate(TaskStatus $status): ?string
    {
        return in_array($status, [TaskStatus::InProgress, TaskStatus::Done], true)
            ? now()->toDateString()
            : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function projectSnapshot(Project $project): array
    {
        return $this->auditLogger->snapshot($project, [
            'name',
            'project_date',
            'status',
            'mandays',
            'incentive_profile_id',
            'pm_user_id',
            'request_user_id',
            'location',
            'urs_date',
            'urs_number',
            'plan_start_date',
            'plan_end_date',
            'uat_date',
            'bast_date',
            'updated_by',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function memberSnapshot(ProjectMember $member): array
    {
        return $this->auditLogger->snapshot($member, [
            'user_id',
            'incentive_project_role_rule_id',
            'incentive_pic_level_rule_id',
            'project_role_code',
            'project_role_name',
            'pic_level_code',
            'pic_level_name',
            'is_support',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function accessRuleSnapshot(ProjectAccessRule $accessRule): array
    {
        return $this->auditLogger->snapshot($accessRule, [
            'user_id',
            'permission',
            'granted_by',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function taskSnapshot(ProjectTask $task): array
    {
        return $this->auditLogger->snapshot($task, [
            'task_type_id',
            'project_member_id',
            'name',
            'status',
            'description',
            'plan_start_date',
            'plan_end_date',
            'actual_start_date',
            'actual_end_date',
        ]);
    }
}
