<?php

namespace App\Services\Projects;

use App\Enums\TaskStatus;
use App\Models\ProjectTask;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskTransitionService
{
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

    public function updateStatus(ProjectTask $task, TaskStatus $targetStatus): ProjectTask
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

        return DB::transaction(function () use ($task, $currentStatus, $targetStatus): ProjectTask {
            $task->forceFill([
                'status' => $targetStatus,
                'actual_start_date' => $this->actualStartDate($task, $currentStatus, $targetStatus),
                'actual_end_date' => $targetStatus === TaskStatus::Done ? ($task->actual_end_date ?? today()) : null,
            ])->save();

            return $task->refresh();
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
}
