<?php

namespace App\Services\Projects;

use App\Enums\AttachmentCollection;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Attachment;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectWriteService
{
    public function __construct(
        private readonly ProjectLifecycleService $lifecycleService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): Project
    {
        return DB::transaction(function () use ($data, $actor): Project {
            $project = Project::create([
                'name' => $data['name'],
                'project_date' => $data['project_date'],
                'mandays' => $data['mandays'],
                'incentive_profile_id' => $data['incentive_profile_id'],
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);

            $this->syncCustomers($project, $data);

            return $project->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Project $project, array $data, User $actor): Project
    {
        $this->ensureEditableProject($project);

        return DB::transaction(function () use ($project, $data, $actor): Project {
            $project->update([
                'name' => $data['name'],
                'project_date' => $data['project_date'],
                'mandays' => $data['mandays'],
                'incentive_profile_id' => $data['incentive_profile_id'],
                'updated_by' => $actor->id,
            ]);

            $this->syncCustomers($project, $data);

            return $project->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePreparation(Project $project, array $data, User $actor): Project
    {
        $this->ensurePreparationEditableProject($project);

        return DB::transaction(function () use ($project, $data, $actor): Project {
            $project->update([
                'pm_user_id' => $data['pm_user_id'],
                'request_user_id' => $data['request_user_id'] ?? null,
                'location' => $data['location'],
                'urs_date' => $data['urs_date'],
                'urs_number' => $data['urs_number'],
                'plan_start_date' => $data['plan_start_date'],
                'plan_end_date' => $data['plan_end_date'],
                'uat_date' => $data['uat_date'] ?? null,
                'bast_date' => $data['bast_date'] ?? null,
                'updated_by' => $actor->id,
            ]);

            $this->syncMembers($project, Arr::wrap($data['members'] ?? []));
            $this->syncAccessRules($project, Arr::wrap($data['access_rules'] ?? []), $actor);
            $this->syncTasks($project, Arr::wrap($data['tasks'] ?? []), $actor);
            $this->storeProjectFiles($project, $data, $actor);

            return $this->lifecycleService->refreshAutomaticStatus($project->refresh());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncCustomers(Project $project, array $data): void
    {
        $customerIds = array_values(array_unique(array_map(
            fn (mixed $customerId): int => (int) $customerId,
            Arr::wrap($data['customer_ids'] ?? []),
        )));
        $primaryCustomerId = (int) ($data['primary_customer_id'] ?? ($customerIds[0] ?? 0));
        $syncPayload = [];

        foreach ($customerIds as $customerId) {
            $syncPayload[$customerId] = ['is_primary' => $customerId === $primaryCustomerId];
        }

        $project->customers()->sync($syncPayload);
    }

    /**
     * @param  array<int, array<string, mixed>>  $members
     */
    private function syncMembers(Project $project, array $members): void
    {
        $submittedUserIds = collect($members)
            ->pluck('user_id')
            ->map(fn (mixed $userId): int => (int) $userId)
            ->unique()
            ->values();

        $project->members()
            ->whereNotIn('user_id', $submittedUserIds)
            ->delete();

        foreach ($members as $member) {
            $roleRule = IncentiveProjectRoleRule::query()
                ->where('incentive_profile_id', $project->incentive_profile_id)
                ->findOrFail((int) $member['incentive_project_role_rule_id']);
            $picRule = null;

            if (! empty($member['incentive_pic_level_rule_id'])) {
                $picRule = IncentivePicLevelRule::query()
                    ->where('incentive_profile_id', $project->incentive_profile_id)
                    ->findOrFail((int) $member['incentive_pic_level_rule_id']);
            }

            ProjectMember::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'user_id' => (int) $member['user_id'],
                ],
                [
                    'incentive_project_role_rule_id' => $roleRule->id,
                    'incentive_pic_level_rule_id' => $picRule?->id,
                    'project_role_code' => $roleRule->role_code,
                    'project_role_name' => $roleRule->role_name,
                    'pic_level_code' => $picRule?->level_code,
                    'pic_level_name' => $picRule?->level_name,
                    'is_support' => (bool) $member['is_support'] || $roleRule->is_support,
                ],
            );
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $accessRules
     */
    private function syncAccessRules(Project $project, array $accessRules, User $actor): void
    {
        $project->accessRules()->delete();

        foreach ($accessRules as $accessRule) {
            $project->accessRules()->create([
                'user_id' => (int) $accessRule['user_id'],
                'permission' => (string) $accessRule['permission'],
                'granted_by' => $actor->id,
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     */
    private function syncTasks(Project $project, array $tasks, User $actor): void
    {
        $submittedTaskIds = collect($tasks)
            ->pluck('id')
            ->filter()
            ->map(fn (mixed $taskId): int => (int) $taskId)
            ->values();

        if ($submittedTaskIds->isNotEmpty()) {
            $project->tasks()
                ->whereNotIn('id', $submittedTaskIds)
                ->delete();
        } elseif ($tasks === []) {
            $project->tasks()->delete();
        }

        $membersByUserId = $project->members()->get()->keyBy('user_id');

        foreach ($tasks as $task) {
            $status = TaskStatus::from((string) $task['status']);
            $projectMember = empty($task['pic_user_id'])
                ? null
                : $membersByUserId->get((int) $task['pic_user_id']);
            $payload = [
                'task_type_id' => $this->validatedTaskTypeId($project, $task['task_type_id'] ?? null),
                'project_member_id' => $projectMember?->id,
                'name' => $task['name'],
                'status' => $status,
                'description' => $task['description'] ?? null,
                'plan_start_date' => $task['plan_start_date'],
                'plan_end_date' => $task['plan_end_date'],
                'actual_start_date' => $this->actualStartDateForTask($status, $task),
                'actual_end_date' => $this->actualEndDateForTask($status, $task),
            ];

            if (! empty($task['id'])) {
                $projectTask = $project->tasks()
                    ->whereKey((int) $task['id'])
                    ->firstOrFail();

                $projectTask->update($payload);
                $this->storeTaskFiles($projectTask, Arr::wrap($task['attachments'] ?? []), $actor);

                continue;
            }

            $projectTask = $project->tasks()->create($payload);
            $this->storeTaskFiles($projectTask, Arr::wrap($task['attachments'] ?? []), $actor);
        }
    }

    private function validatedTaskTypeId(Project $project, mixed $taskTypeId): ?int
    {
        if (empty($taskTypeId)) {
            return null;
        }

        $taskType = TaskType::query()
            ->whereKey((int) $taskTypeId)
            ->where(function ($query) use ($project): void {
                $query->whereNull('project_id')
                    ->orWhere('project_id', $project->id);
            })
            ->first();

        if ($taskType instanceof TaskType) {
            return $taskType->id;
        }

        throw ValidationException::withMessages([
            'tasks' => ['Selected task type is not available for this project.'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function storeProjectFiles(Project $project, array $data, User $actor): void
    {
        $this->storeProjectFile($project, $data['urs_file'] ?? null, AttachmentCollection::UrsFile, $actor);
        $this->storeProjectFile($project, $data['uat_file'] ?? null, AttachmentCollection::UatFile, $actor);
        $this->storeProjectFile($project, $data['bast_file'] ?? null, AttachmentCollection::BastFile, $actor);

        foreach (Arr::wrap($data['request_evidence'] ?? []) as $file) {
            $this->storeProjectFile($project, $file, AttachmentCollection::RequestEvidence, $actor);
        }
    }

    private function storeProjectFile(Project $project, mixed $file, AttachmentCollection $collection, User $actor): void
    {
        if (! $file instanceof UploadedFile) {
            return;
        }

        $path = $file->store('project-attachments');

        if ($path === false) {
            throw ValidationException::withMessages([
                $collection->value => ['Project attachment could not be stored.'],
            ]);
        }

        Attachment::create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => $collection,
            'disk' => 'local',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $actor->id,
        ]);
    }

    /**
     * @param  array<int, mixed>  $files
     */
    private function storeTaskFiles(ProjectTask $task, array $files, User $actor): void
    {
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $path = $file->store('project-task-attachments');

            if ($path === false) {
                throw ValidationException::withMessages([
                    'tasks' => ['Task attachment could not be stored.'],
                ]);
            }

            Attachment::create([
                'attachable_type' => ProjectTask::class,
                'attachable_id' => $task->id,
                'collection' => AttachmentCollection::TaskAttachment,
                'disk' => 'local',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by' => $actor->id,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function actualStartDateForTask(TaskStatus $status, array $task): ?string
    {
        if (! in_array($status, [TaskStatus::InProgress, TaskStatus::Done], true)) {
            return null;
        }

        return $task['actual_start_date'] ?? now()->toDateString();
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function actualEndDateForTask(TaskStatus $status, array $task): ?string
    {
        if ($status !== TaskStatus::Done) {
            return null;
        }

        return $task['actual_end_date'] ?? now()->toDateString();
    }

    private function ensureEditableProject(Project $project): void
    {
        if (in_array($project->currentStatus(), [ProjectStatus::Draft, ProjectStatus::Rejected], true)) {
            return;
        }

        throw ValidationException::withMessages([
            'project' => ['Only draft or rejected project can be edited from the basic project form.'],
        ]);
    }

    private function ensurePreparationEditableProject(Project $project): void
    {
        if ($project->currentStatus() !== ProjectStatus::Closed) {
            return;
        }

        throw ValidationException::withMessages([
            'project' => ['Closed project preparation cannot be edited.'],
        ]);
    }
}
