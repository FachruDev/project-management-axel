<?php

namespace App\Services\Projects;

use App\Enums\ProjectStatus;
use App\Exceptions\ProjectLifecycleException;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectStatusMoveService
{
    /**
     * @var array<string, int>
     */
    private array $rank = [
        'planning' => 1,
        'ongoing' => 2,
        'awaiting_bast' => 3,
        'ready_to_close' => 4,
        'closed' => 5,
    ];

    /**
     * @var array<string, ProjectStatus>
     */
    private array $oneStepRollback = [
        'ongoing' => ProjectStatus::Planning,
        'awaiting_bast' => ProjectStatus::Ongoing,
        'ready_to_close' => ProjectStatus::AwaitingBast,
    ];

    public function __construct(
        private readonly ProjectLifecycleService $lifecycleService,
    ) {}

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function move(Project $project, ProjectStatus $targetStatus, User $actor, ?string $reason = null): Project
    {
        $currentStatus = $project->currentStatus();

        if ($currentStatus === $targetStatus) {
            return $project;
        }

        $this->ensureOperational($currentStatus);
        $this->ensureOperational($targetStatus);

        if ($this->isBackward($currentStatus, $targetStatus)) {
            return $this->rollbackOneStep($project, $currentStatus, $targetStatus, $actor, $reason);
        }

        return $this->moveForward($project, $currentStatus, $targetStatus, $actor);
    }

    /**
     * @throws ValidationException
     */
    private function rollbackOneStep(Project $project, ProjectStatus $currentStatus, ProjectStatus $targetStatus, User $actor, ?string $reason): Project
    {
        $allowedTarget = $this->oneStepRollback[$currentStatus->value] ?? null;

        if ($allowedTarget !== $targetStatus) {
            throw ValidationException::withMessages([
                'target_status' => ['Project can only be moved backward one status at a time.'],
            ]);
        }

        $reason = trim((string) $reason);

        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['Reason is required when project status moves backward.'],
            ]);
        }

        return DB::transaction(function () use ($project, $currentStatus, $targetStatus, $actor, $reason): Project {
            $project->forceFill(['status' => $targetStatus])->save();
            $this->recordHistory($project, $currentStatus, $targetStatus, $actor, $reason, 'drag');

            return $project->refresh();
        });
    }

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    private function moveForward(Project $project, ProjectStatus $currentStatus, ProjectStatus $targetStatus, User $actor): Project
    {
        $project = match ($targetStatus) {
            ProjectStatus::Ongoing => $this->lifecycleService->start($project, $actor),
            ProjectStatus::AwaitingBast, ProjectStatus::ReadyToClose => $this->lifecycleService->refreshAutomaticStatus($project),
            ProjectStatus::Closed => $this->lifecycleService->close($project, $actor),
            default => throw ValidationException::withMessages([
                'target_status' => ['Project status transition is not allowed.'],
            ]),
        };

        if ($project->currentStatus() !== $targetStatus) {
            throw ValidationException::withMessages([
                'target_status' => ['Project data is not complete for the target status.'],
            ]);
        }

        $this->recordHistory($project, $currentStatus, $targetStatus, $actor, null, 'drag');

        return $project;
    }

    /**
     * @throws ValidationException
     */
    private function ensureOperational(ProjectStatus $status): void
    {
        if (array_key_exists($status->value, $this->rank)) {
            return;
        }

        throw ValidationException::withMessages([
            'target_status' => ['Only operational project statuses can be moved on Kanban.'],
        ]);
    }

    private function isBackward(ProjectStatus $currentStatus, ProjectStatus $targetStatus): bool
    {
        return $this->rank[$targetStatus->value] < $this->rank[$currentStatus->value];
    }

    private function recordHistory(Project $project, ProjectStatus $fromStatus, ProjectStatus $toStatus, User $actor, ?string $reason, string $source): void
    {
        $project->statusHistories()->create([
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'reason' => $reason,
            'changed_by' => $actor->id,
            'changed_at' => now(),
            'source' => $source,
        ]);
    }
}
