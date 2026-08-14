<?php

namespace App\Services\Incentives;

use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectCalculationLockService
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    /**
     * @throws ValidationException
     */
    public function lock(ProjectIncentiveCalculation $calculation, User $actor, ?string $notes = null): ProjectIncentiveCalculation
    {
        return DB::transaction(function () use ($calculation, $actor, $notes): ProjectIncentiveCalculation {
            $calculation = $this->lockedCalculation($calculation);
            $this->ensureCurrent($calculation);

            if ($calculation->isLocked()) {
                $this->fail('calculation', 'Project calculation is already locked.');
            }

            $oldData = $this->snapshot($calculation);

            $calculation->forceFill([
                'locked_at' => now(),
                'locked_by' => $actor->id,
                'lock_notes' => $this->nullableText($notes),
            ])->save();

            $this->auditLogger->log(
                $this->project($calculation),
                $actor,
                'project_calculation_locked',
                $calculation,
                $oldData,
                $this->snapshot($calculation),
                $notes,
            );

            return $calculation->refresh()->load(['project', 'lockedBy']);
        });
    }

    /**
     * @throws ValidationException
     */
    public function unlock(ProjectIncentiveCalculation $calculation, User $actor): ProjectIncentiveCalculation
    {
        return DB::transaction(function () use ($calculation, $actor): ProjectIncentiveCalculation {
            $calculation = $this->lockedCalculation($calculation);
            $this->ensureCurrent($calculation);

            if (! $calculation->isLocked()) {
                $this->fail('calculation', 'Project calculation is not locked.');
            }

            $oldData = $this->snapshot($calculation);

            $calculation->forceFill([
                'locked_at' => null,
                'locked_by' => null,
                'lock_notes' => null,
            ])->save();

            $this->auditLogger->log(
                $this->project($calculation),
                $actor,
                'project_calculation_unlocked',
                $calculation,
                $oldData,
                $this->snapshot($calculation),
            );

            return $calculation->refresh()->load('project');
        });
    }

    private function lockedCalculation(ProjectIncentiveCalculation $calculation): ProjectIncentiveCalculation
    {
        return ProjectIncentiveCalculation::query()
            ->with('project')
            ->whereKey($calculation->id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    /**
     * @throws ValidationException
     */
    private function ensureCurrent(ProjectIncentiveCalculation $calculation): void
    {
        if ($calculation->is_current) {
            return;
        }

        $this->fail('calculation', 'Only current project calculation can be updated.');
    }

    private function project(ProjectIncentiveCalculation $calculation): Project
    {
        $project = $calculation->project;

        abort_unless($project instanceof Project, 404);

        return $project;
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(ProjectIncentiveCalculation $calculation): array
    {
        return $this->auditLogger->snapshot($calculation, [
            'is_current',
            'locked_at',
            'locked_by',
            'lock_notes',
        ]);
    }

    private function nullableText(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * @throws ValidationException
     */
    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([
            $key => [$message],
        ]);
    }
}
