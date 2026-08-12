<?php

namespace App\Services\Projects;

use App\Enums\AttachmentCollection;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Attachment;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectAccessRule;
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
        private readonly ProjectAuditLogger $auditLogger,
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
            $oldData = $this->projectPreparationSnapshot($project);

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

            $this->syncMembers($project, Arr::wrap($data['members'] ?? []), $actor);
            $this->syncAccessRules($project, Arr::wrap($data['access_rules'] ?? []), $actor);
            $this->syncTasks($project, Arr::wrap($data['tasks'] ?? []), $actor);
            $this->storeProjectFiles($project, $data, $actor);

            $project = $this->lifecycleService->refreshAutomaticStatus($project->refresh());

            $this->auditLogger->log(
                $project,
                $actor,
                'project_preparation_updated',
                $project,
                $oldData,
                $this->projectPreparationSnapshot($project),
            );

            return $project;
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
    private function syncMembers(Project $project, array $members, User $actor): void
    {
        $submittedUserIds = collect($members)
            ->pluck('user_id')
            ->map(fn (mixed $userId): int => (int) $userId)
            ->unique()
            ->values();

        $project->members()
            ->whereNotIn('user_id', $submittedUserIds)
            ->get()
            ->each(function (ProjectMember $member) use ($project, $actor): void {
                $oldData = $this->memberSnapshot($member);
                $member->delete();
                $this->auditLogger->log($project, $actor, 'member_deleted', $member, $oldData, null, null, 'preparation');
            });

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

            $projectMember = ProjectMember::query()
                ->where('project_id', $project->id)
                ->where('user_id', (int) $member['user_id'])
                ->first();
            $oldData = $projectMember instanceof ProjectMember ? $this->memberSnapshot($projectMember) : null;
            $payload = [
                'incentive_project_role_rule_id' => $roleRule->id,
                'incentive_pic_level_rule_id' => $picRule?->id,
                'project_role_code' => $roleRule->role_code,
                'project_role_name' => $roleRule->role_name,
                'pic_level_code' => $picRule?->level_code,
                'pic_level_name' => $picRule?->level_name,
                'is_support' => (bool) $member['is_support'] || $roleRule->is_support,
            ];

            $projectMember = ProjectMember::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'user_id' => (int) $member['user_id'],
                ],
                $payload,
            );

            $this->auditLogger->log(
                $project,
                $actor,
                $oldData === null ? 'member_created' : 'member_updated',
                $projectMember,
                $oldData,
                $this->memberSnapshot($projectMember),
                null,
                'preparation',
            );
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $accessRules
     */
    private function syncAccessRules(Project $project, array $accessRules, User $actor): void
    {
        $project->accessRules()
            ->get()
            ->each(function (ProjectAccessRule $accessRule) use ($project, $actor): void {
                $oldData = $this->accessRuleSnapshot($accessRule);
                $accessRule->delete();
                $this->auditLogger->log($project, $actor, 'access_rule_deleted', $accessRule, $oldData, null, null, 'preparation');
            });

        foreach ($accessRules as $accessRule) {
            $createdRule = $project->accessRules()->create([
                'user_id' => (int) $accessRule['user_id'],
                'permission' => (string) $accessRule['permission'],
                'granted_by' => $actor->id,
            ]);

            $this->auditLogger->log(
                $project,
                $actor,
                'access_rule_created',
                $createdRule,
                null,
                $this->accessRuleSnapshot($createdRule),
                null,
                'preparation',
            );
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
                ->get()
                ->each(function (ProjectTask $task) use ($project, $actor): void {
                    $oldData = $this->taskSnapshot($task);
                    $task->delete();
                    $this->auditLogger->log($project, $actor, 'task_deleted', $task, $oldData, null, null, 'preparation');
                });
        } elseif ($tasks === []) {
            $project->tasks()
                ->get()
                ->each(function (ProjectTask $task) use ($project, $actor): void {
                    $oldData = $this->taskSnapshot($task);
                    $task->delete();
                    $this->auditLogger->log($project, $actor, 'task_deleted', $task, $oldData, null, null, 'preparation');
                });
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
                $oldData = $this->taskSnapshot($projectTask);

                $projectTask->update($payload);
                $this->auditLogger->log(
                    $project,
                    $actor,
                    'task_updated',
                    $projectTask,
                    $oldData,
                    $this->taskSnapshot($projectTask->refresh()),
                    null,
                    'preparation',
                );
                $this->storeTaskFiles($projectTask, Arr::wrap($task['attachments'] ?? []), $actor);

                continue;
            }

            $projectTask = $project->tasks()->create($payload);
            $this->auditLogger->log(
                $project,
                $actor,
                'task_created',
                $projectTask,
                null,
                $this->taskSnapshot($projectTask),
                null,
                'preparation',
            );
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

        $attachment = Attachment::create([
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

        $this->auditLogger->log(
            $project,
            $actor,
            'attachment_uploaded',
            $attachment,
            null,
            $this->attachmentSnapshot($attachment),
            null,
            'preparation',
        );
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

            $attachment = Attachment::create([
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

            $this->auditLogger->log(
                $task->project,
                $actor,
                'attachment_uploaded',
                $attachment,
                null,
                $this->attachmentSnapshot($attachment),
                null,
                'preparation',
                ['parent_entity_type' => $task->getMorphClass(), 'parent_entity_id' => $task->id],
            );
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

    /**
     * @return array<string, mixed>
     */
    private function projectPreparationSnapshot(Project $project): array
    {
        return $this->auditLogger->snapshot($project, [
            'status',
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
    private function taskSnapshot(ProjectTask $task): array
    {
        return $this->auditLogger->snapshot($task, [
            'project_id',
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

    /**
     * @return array<string, mixed>
     */
    private function attachmentSnapshot(Attachment $attachment): array
    {
        return $this->auditLogger->snapshot($attachment, [
            'attachable_type',
            'attachable_id',
            'collection',
            'disk',
            'path',
            'original_name',
            'mime_type',
            'size',
            'uploaded_by',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function memberSnapshot(ProjectMember $member): array
    {
        return $this->auditLogger->snapshot($member, [
            'project_id',
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
            'project_id',
            'user_id',
            'permission',
            'granted_by',
        ]);
    }
}
