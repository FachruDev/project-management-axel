<?php

namespace App\Services\Incentives;

use App\Enums\IncentiveProfileStatus;
use App\Models\IncentiveProfile;
use App\Models\Project;
use Illuminate\Validation\ValidationException;

class IncentiveProfileBatchCalculator
{
    public function __construct(
        private readonly ProjectIncentiveCalculator $calculator,
    ) {}

    /**
     * @return array{
     *     profile_id: int,
     *     calculated: int,
     *     skipped: int,
     *     calculated_projects: array<int, array{project_id: int, calculation_id: int}>,
     *     skipped_projects: array<int, array{project_id: int, reason: string}>
     * }
     *
     * @throws ValidationException
     */
    public function calculateForProfile(IncentiveProfile $profile): array
    {
        $profile = $profile->fresh() ?? $profile;

        if ($profile->currentStatus() !== IncentiveProfileStatus::Active) {
            throw ValidationException::withMessages([
                'incentive_profile_id' => ['Only active incentive profile can be calculated.'],
            ]);
        }

        $calculatedProjects = [];
        $skippedProjects = [];

        Project::query()
            ->whereBelongsTo($profile, 'incentiveProfile')
            ->latest()
            ->lazyById()
            ->each(function (Project $project) use (&$calculatedProjects, &$skippedProjects): void {
                try {
                    $calculation = $this->calculator->calculate($project);

                    $calculatedProjects[] = [
                        'project_id' => (int) $project->id,
                        'calculation_id' => (int) $calculation->id,
                    ];
                } catch (ValidationException $exception) {
                    $skippedProjects[] = [
                        'project_id' => (int) $project->id,
                        'reason' => $this->firstValidationMessage($exception),
                    ];
                }
            });

        return [
            'profile_id' => (int) $profile->id,
            'calculated' => count($calculatedProjects),
            'skipped' => count($skippedProjects),
            'calculated_projects' => $calculatedProjects,
            'skipped_projects' => $skippedProjects,
        ];
    }

    private function firstValidationMessage(ValidationException $exception): string
    {
        $messages = collect($exception->errors())
            ->flatten()
            ->filter()
            ->values();

        return (string) ($messages->first() ?? 'Project is not ready for incentive calculation.');
    }
}
