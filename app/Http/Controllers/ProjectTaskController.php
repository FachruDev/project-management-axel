<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Events\TaskBoardChanged;
use App\Http\Requests\UpdateProjectTaskRequest;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use App\Services\Projects\ProjectTaskActualDateService;
use App\Services\Projects\ProjectTaskTransitionService;
use App\Services\Projects\ProjectVisibilityService;
use DateTimeInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
        private readonly ProjectTaskActualDateService $actualDateService,
        private readonly ProjectTaskTransitionService $transitionService,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function update(UpdateProjectTaskRequest $request, ProjectTask $task): RedirectResponse
    {
        $actor = $this->actor($request);

        abort_unless($this->visibility->canAccessTask($task, $actor), 403);

        $validated = $request->validated();

        DB::transaction(function () use ($task, $validated, $actor): void {
            $task->load(['project', 'member', 'taskType']);
            $project = $task->project;
            $targetStatus = TaskStatus::from((string) $validated['status']);
            $currentStatus = $this->taskStatus($task);
            $oldData = $this->taskSnapshot($task);
            $actualDateOverrides = $this->actualDateOverrides($validated, $actor);

            $task->forceFill([
                'task_type_id' => $this->validatedTaskTypeId($project, $validated['task_type_id'] ?? null),
                'project_member_id' => $this->projectMemberId($project, $validated['pic_user_id'] ?? null),
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'plan_start_date' => $validated['plan_start_date'],
                'plan_end_date' => $validated['plan_end_date'],
            ]);

            if ($currentStatus === $targetStatus && $actualDateOverrides !== []) {
                $task->forceFill($this->actualDateService->forStatus($task, $targetStatus, $actualDateOverrides));
            }

            if ($task->isDirty()) {
                $task->save();

                $this->auditLogger->log(
                    $project,
                    $actor,
                    'task_updated',
                    $task,
                    $oldData,
                    $this->taskSnapshot($task->refresh()),
                    null,
                    'task_drawer',
                );
            }

            if ($currentStatus !== $targetStatus) {
                $this->transitionService->updateStatus(
                    $task->refresh(),
                    $targetStatus,
                    $actor,
                    $validated['reason'] ?? null,
                    $actualDateOverrides,
                );
            }

            $freshTask = $task->refresh()
                ->load(['project.customers', 'project.pm', 'member.user', 'taskType'])
                ->loadCount('attachments');

            TaskBoardChanged::dispatch([
                'task_id' => $freshTask->id,
                'project_id' => $project->id,
                'status' => $this->taskStatus($freshTask)->value,
                'action' => 'task_updated',
                'actor_id' => $actor->id,
                'task' => $this->taskCard($freshTask),
                'changed_at' => now()->toISOString(),
            ]);
        });

        return back()->with('success', 'Task updated.');
    }

    private function actor(UpdateProjectTaskRequest $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    private function validatedTaskTypeId(Project $project, mixed $taskTypeId): ?int
    {
        if (empty($taskTypeId)) {
            return null;
        }

        $taskTypeId = TaskType::query()
            ->whereKey((int) $taskTypeId)
            ->where(function ($query) use ($project): void {
                $query->whereNull('project_id')
                    ->orWhere('project_id', $project->id);
            })
            ->value('id');

        if ($taskTypeId !== null) {
            return (int) $taskTypeId;
        }

        throw ValidationException::withMessages([
            'task_type_id' => ['Selected task type is not available for this project.'],
        ]);
    }

    private function projectMemberId(Project $project, mixed $picUserId): ?int
    {
        if (empty($picUserId)) {
            return null;
        }

        $projectMemberId = ProjectMember::query()
            ->where('project_id', $project->id)
            ->where('user_id', (int) $picUserId)
            ->value('id');

        if ($projectMemberId !== null) {
            return (int) $projectMemberId;
        }

        throw ValidationException::withMessages([
            'pic_user_id' => ['Selected PIC must be a project member.'],
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
    private function taskCard(ProjectTask $task): array
    {
        return [
            'id' => $task->id,
            'name' => $task->name,
            'status' => $this->taskStatus($task)->value,
            'description' => $task->description,
            'plan_start_date' => $this->dateString($task->plan_start_date),
            'plan_end_date' => $this->dateString($task->plan_end_date),
            'actual_start_date' => $this->dateString($task->actual_start_date),
            'actual_end_date' => $this->dateString($task->actual_end_date),
            'attachments_count' => $task->attachments_count ?? 0,
            'project' => $task->project ? [
                'id' => $task->project->id,
                'name' => $task->project->name,
                'status' => $task->project->currentStatus()->value,
                'customer' => $task->project->customers->first()?->name,
                'pm' => $task->project->pm ? [
                    'id' => $task->project->pm->id,
                    'name' => $task->project->pm->name,
                    'email' => $task->project->pm->email,
                    'external_id' => $task->project->pm->external_id,
                ] : null,
            ] : null,
            'pic' => $task->member?->user ? [
                'id' => $task->member->user->id,
                'name' => $task->member->user->name,
                'email' => $task->member->user->email,
                'external_id' => $task->member->user->external_id,
            ] : null,
            'task_type' => $task->taskType ? [
                'id' => $task->taskType->id,
                'name' => $task->taskType->name,
                'color' => $task->taskType->color,
            ] : null,
            'allowed_statuses' => collect($this->transitionService->allowedTargets($task))
                ->map(fn (TaskStatus $status): string => $status->value)
                ->all(),
        ];
    }

    private function taskStatus(ProjectTask $task): TaskStatus
    {
        $status = $task->getAttribute('status');

        if ($status instanceof TaskStatus) {
            return $status;
        }

        return TaskStatus::from((string) $status);
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value === null ? null : (string) $value;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function actualDateOverrides(array $data, User $actor): array
    {
        if (! $actor->can('override_actual_dates')) {
            return [];
        }

        $overrides = [];

        foreach (['actual_start_date', 'actual_end_date'] as $field) {
            if (array_key_exists($field, $data)) {
                $overrides[$field] = $this->dateString($data[$field]);
            }
        }

        return $overrides;
    }
}
