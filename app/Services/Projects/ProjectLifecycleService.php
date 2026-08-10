<?php

namespace App\Services\Projects;

use App\Enums\ProjectStatus;
use App\Exceptions\ProjectLifecycleException;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectLifecycleService
{
    public function __construct(
        private readonly ProjectStatusValidator $validator,
    ) {}

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function submitForApproval(Project $project, User $actor): Project
    {
        $this->ensureStatus($project, [ProjectStatus::Draft]);
        $this->validator->validateFor($project, ProjectStatus::PendingApproval);

        return DB::transaction(function () use ($project, $actor): Project {
            $project->forceFill([
                'status' => ProjectStatus::PendingApproval,
                'approval_requested_by' => $actor->id,
                'approval_requested_at' => now(),
            ])->save();

            return $project->refresh();
        });
    }

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function approve(Project $project, User $actor): Project
    {
        $this->ensureStatus($project, [ProjectStatus::PendingApproval]);
        $this->validator->validateFor($project, ProjectStatus::PendingApproval);

        return DB::transaction(function () use ($project, $actor): Project {
            $project->forceFill([
                'status' => ProjectStatus::Planning,
                'approved_by' => $actor->id,
                'approved_at' => now(),
                'rejected_by' => null,
                'rejected_at' => null,
                'rejection_notes' => null,
            ])->save();

            return $project->refresh();
        });
    }

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function reject(Project $project, User $actor, string $notes): Project
    {
        $this->ensureStatus($project, [ProjectStatus::PendingApproval]);

        $notes = trim($notes);

        if ($notes === '') {
            throw ValidationException::withMessages([
                'rejection_notes' => ['Rejection notes are required.'],
            ]);
        }

        return DB::transaction(function () use ($project, $actor, $notes): Project {
            $project->forceFill([
                'status' => ProjectStatus::Rejected,
                'rejected_by' => $actor->id,
                'rejected_at' => now(),
                'rejection_notes' => $notes,
                'approved_by' => null,
                'approved_at' => null,
            ])->save();

            return $project->refresh();
        });
    }

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function resubmit(Project $project, User $actor): Project
    {
        $this->ensureStatus($project, [ProjectStatus::Rejected]);
        $this->validator->validateFor($project, ProjectStatus::PendingApproval);

        return DB::transaction(function () use ($project, $actor): Project {
            $project->forceFill([
                'status' => ProjectStatus::PendingApproval,
                'approval_requested_by' => $actor->id,
                'approval_requested_at' => now(),
                'rejected_by' => null,
                'rejected_at' => null,
                'rejection_notes' => null,
            ])->save();

            return $project->refresh();
        });
    }

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function start(Project $project, User $actor): Project
    {
        $this->ensureStatus($project, [ProjectStatus::Planning]);
        $this->validator->validateFor($project, ProjectStatus::Ongoing);

        return DB::transaction(function () use ($project): Project {
            $project->forceFill([
                'status' => ProjectStatus::Ongoing,
                'actual_start_date' => $project->actual_start_date ?? today(),
            ])->save();

            return $project->refresh();
        });
    }

    public function refreshAutomaticStatus(Project $project): Project
    {
        if (in_array($project->currentStatus(), [ProjectStatus::Planning, ProjectStatus::Ongoing], true)
            && $this->validator->passes($project, ProjectStatus::AwaitingBast)) {
            $project->forceFill(['status' => ProjectStatus::AwaitingBast])->save();
            $project->refresh();
        }

        if ($project->currentStatus() === ProjectStatus::AwaitingBast
            && $this->validator->passes($project, ProjectStatus::ReadyToClose)) {
            $project->forceFill(['status' => ProjectStatus::ReadyToClose])->save();
            $project->refresh();
        }

        return $project;
    }

    /**
     * @throws ProjectLifecycleException
     * @throws ValidationException
     */
    public function close(Project $project, User $actor): Project
    {
        $this->ensureStatus($project, [ProjectStatus::ReadyToClose]);

        $project->forceFill(['actual_end_date' => $project->actual_end_date ?? today()]);
        $this->validator->validateFor($project, ProjectStatus::Closed);

        return DB::transaction(function () use ($project): Project {
            $project->forceFill([
                'status' => ProjectStatus::Closed,
                'actual_end_date' => $project->actual_end_date ?? today(),
            ])->save();

            return $project->refresh();
        });
    }

    /**
     * @param  array<int, ProjectStatus>  $allowedStatuses
     *
     * @throws ProjectLifecycleException
     */
    private function ensureStatus(Project $project, array $allowedStatuses): void
    {
        $currentStatus = $project->currentStatus();

        if (in_array($currentStatus, $allowedStatuses, true)) {
            return;
        }

        throw ProjectLifecycleException::invalidTransition($currentStatus, $allowedStatuses);
    }
}
