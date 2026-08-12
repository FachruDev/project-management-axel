<?php

namespace App\Services\Projects;

use App\Enums\TaskStatus;
use App\Events\ProjectBoardChanged;
use App\Events\TaskBoardChanged;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskTransitionService
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    /**
     * @var array<string, array<int, TaskStatus>>
     */
    private array $allowedTransitions = [
        'todo' => [TaskStatus::Assigned, TaskStatus::Cancelled],
        'assigned' => [TaskStatus::InProgress, TaskStatus::Cancelled],
        'inprogress' => [TaskStatus::Done, TaskStatus::Cancelled],
        'done' => [],
        'cancelled' => [],
    ];

    public function updateStatus(ProjectTask $task, TaskStatus $targetStatus, User $actor, ?string $reason = null): ProjectTask
    {
        $currentStatus = $this->currentStatus($task);

        if ($currentStatus === $targetStatus) {
            return $task;
        }

        if (! in_array($targetStatus, $this->allowedTransitions[$currentStatus->value] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => ['Task status transition is not allowed.'],
            ]);
        }

        return DB::transaction(function () use ($task, $currentStatus, $targetStatus, $actor, $reason): ProjectTask {
            $task->forceFill([
                'status' => $targetStatus,
                'actual_start_date' => $this->actualStartDate($task, $currentStatus, $targetStatus),
                'actual_end_date' => $targetStatus === TaskStatus::Done ? ($task->actual_end_date ?? today()) : null,
            ])->save();

            $task = $task->refresh()->load('project');
            $project = $task->project;

            $this->auditLogger->log(
                $project,
                $actor,
                'task_status_moved',
                $task,
                ['status' => $currentStatus->value],
                ['status' => $targetStatus->value],
                $this->isBackward($currentStatus, $targetStatus) ? $reason : null,
                'kanban',
            );

            TaskBoardChanged::dispatch([
                'task_id' => $task->id,
                'project_id' => $project->id,
                'old_status' => $currentStatus->value,
                'new_status' => $targetStatus->value,
                'action' => 'task_status_moved',
                'actor_id' => $actor->id,
                'changed_at' => now()->toISOString(),
            ]);

            ProjectBoardChanged::dispatch([
                'project_id' => $project->id,
                'task_id' => $task->id,
                'old_status' => $currentStatus->value,
                'new_status' => $targetStatus->value,
                'action' => 'task_status_moved',
                'actor_id' => $actor->id,
                'changed_at' => now()->toISOString(),
            ]);

            return $task;
        });
    }

    /**
     * @return array<int, TaskStatus>
     */
    public function allowedTargets(ProjectTask $task): array
    {
        return $this->allowedTransitions[$this->currentStatus($task)->value] ?? [];
    }

    private function currentStatus(ProjectTask $task): TaskStatus
    {
        $status = $task->getAttribute('status');

        if ($status instanceof TaskStatus) {
            return $status;
        }

        return TaskStatus::from((string) $status);
    }

    private function actualStartDate(ProjectTask $task, TaskStatus $currentStatus, TaskStatus $targetStatus): mixed
    {
        if ($targetStatus === TaskStatus::Cancelled) {
            return $task->actual_start_date;
        }

        if ($targetStatus !== TaskStatus::InProgress && $targetStatus !== TaskStatus::Done) {
            return $currentStatus === TaskStatus::Todo ? null : $task->actual_start_date;
        }

        return $task->actual_start_date ?? today();
    }

    private function isBackward(TaskStatus $currentStatus, TaskStatus $targetStatus): bool
    {
        return $this->statusRank($targetStatus) < $this->statusRank($currentStatus);
    }

    private function statusRank(TaskStatus $status): int
    {
        return match ($status) {
            TaskStatus::Todo => 1,
            TaskStatus::Assigned => 2,
            TaskStatus::InProgress => 3,
            TaskStatus::Done => 4,
            TaskStatus::Cancelled => 5,
        };
    }
}
