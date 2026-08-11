<?php

namespace App\Services\Incentives;

use App\Enums\DeliveryStatus;
use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Models\IncentiveDeliveryRule;
use App\Models\IncentiveMandayRule;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\ProjectMember;
use App\Services\Calendar\BusinessDayCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @phpstan-type IncentiveItemPayload array{
 *     employee_id: int,
 *     employee_name: string,
 *     project_role: string,
 *     pic_level: string|null,
 *     is_support: bool,
 *     pic_points: float,
 *     role_points: float,
 *     weight_points: float,
 *     weight_ratio: float,
 *     base_incentive: float
 * }
 */
class ProjectIncentiveCalculator
{
    public function __construct(
        private readonly BusinessDayCalculator $businessDayCalculator,
    ) {}

    /**
     * @throws ValidationException
     */
    public function calculate(Project $project): ProjectIncentiveCalculation
    {
        return DB::transaction(function () use ($project): ProjectIncentiveCalculation {
            $project = $project->fresh([
                'incentiveProfile.mandayRules',
                'incentiveProfile.deliveryRules',
                'members.user',
                'members.roleRule',
                'members.picLevelRule',
            ]) ?? $project;

            $profile = $this->validatedProfile($project);
            $this->ensureClosedProject($project);

            $mandays = (float) $project->mandays;
            $mandayRule = $this->matchingMandayRule($profile, $mandays);
            $baseScore = (float) $mandayRule->base_score;
            $supportPercent = (float) $profile->support_percent;
            $supportPool = $baseScore * $supportPercent;
            $technicalPool = $baseScore - $supportPool;

            $members = $project->members;
            $this->ensureMembers($members);

            $technicalMembers = $members->filter(fn (ProjectMember $member): bool => ! $this->isSupportMember($member));
            $supportMembers = $members->filter(fn (ProjectMember $member): bool => $this->isSupportMember($member));

            $this->ensureSupportMembers($supportPercent, $supportMembers);

            $technicalRows = $this->technicalRows($technicalMembers, $profile, $technicalPool);
            $supportRows = $this->supportRows($supportMembers, $profile, $supportPool);

            $targetEndDate = CarbonImmutable::parse((string) $project->plan_end_date)->startOfDay();
            $actualEndDate = CarbonImmutable::parse((string) $project->actual_end_date)->startOfDay();
            $differenceDays = $this->businessDayCalculator->signedDifference($targetEndDate, $actualEndDate);
            $deliveryRule = $this->matchingDeliveryRule($profile, $differenceDays);
            $deliveryMultiplier = (float) $deliveryRule->multiplier;
            $deliveryStatus = $this->deliveryStatus($differenceDays);

            $rows = collect([...$technicalRows, ...$supportRows])
                ->map(function (array $row) use ($deliveryMultiplier): array {
                    $baseIncentive = (float) $row['base_incentive'];

                    return [
                        ...$row,
                        'base_incentive' => $this->roundValue($baseIncentive),
                        'delivery_multiplier' => $this->roundValue($deliveryMultiplier),
                        'final_incentive' => $this->roundValue($baseIncentive * $deliveryMultiplier),
                    ];
                })
                ->values();

            $calculation = ProjectIncentiveCalculation::create([
                'project_id' => $project->id,
                'incentive_profile_id' => $profile->id,
                'mandays' => $this->roundValue($mandays, 2),
                'base_score' => $this->roundValue($baseScore),
                'support_percent' => $this->roundValue($supportPercent),
                'support_pool' => $this->roundValue($supportPool),
                'technical_pool' => $this->roundValue($technicalPool),
                'target_end_date' => $targetEndDate->toDateString(),
                'actual_end_date' => $actualEndDate->toDateString(),
                'difference_days' => $differenceDays,
                'delivery_status' => $deliveryStatus,
                'delivery_multiplier' => $this->roundValue($deliveryMultiplier),
                'total_incentive' => $this->roundValue((float) $rows->sum('final_incentive')),
                'calculated_at' => now(),
            ]);

            $calculation->items()->createMany($rows->all());

            return $calculation->refresh()->load('items');
        });
    }

    /**
     * @throws ValidationException
     */
    private function validatedProfile(Project $project): IncentiveProfile
    {
        $profile = $project->incentiveProfile;

        if (! $profile instanceof IncentiveProfile) {
            $this->fail('incentive_profile_id', 'Project incentive profile is required.');
        }

        if ($profile->currentStatus() !== IncentiveProfileStatus::Active) {
            $this->fail('incentive_profile_id', 'Only active incentive profile can be calculated.');
        }

        return $profile;
    }

    /**
     * @throws ValidationException
     */
    private function ensureClosedProject(Project $project): void
    {
        if ($project->currentStatus() !== ProjectStatus::Closed) {
            $this->fail('project', 'Only closed project can be calculated.');
        }

        if ((float) $project->mandays <= 0) {
            $this->fail('mandays', 'Project mandays must be greater than zero.');
        }

        if ($project->plan_end_date === null) {
            $this->fail('plan_end_date', 'Project plan end date is required for calculation.');
        }

        if ($project->actual_end_date === null) {
            $this->fail('actual_end_date', 'Project actual end date is required for calculation.');
        }
    }

    /**
     * @param  Collection<int, ProjectMember>  $members
     *
     * @throws ValidationException
     */
    private function ensureMembers(Collection $members): void
    {
        if ($members->isNotEmpty()) {
            return;
        }

        $this->fail('project_members', 'Project members are required for incentive calculation.');
    }

    /**
     * @param  Collection<int, ProjectMember>  $supportMembers
     *
     * @throws ValidationException
     */
    private function ensureSupportMembers(float $supportPercent, Collection $supportMembers): void
    {
        if ($supportPercent <= 0 || $supportMembers->isNotEmpty()) {
            return;
        }

        $this->fail('project_members', 'Support members are required when support percent is greater than zero.');
    }

    /**
     * @throws ValidationException
     */
    private function matchingMandayRule(IncentiveProfile $profile, float $mandays): IncentiveMandayRule
    {
        $rule = $profile->mandayRules
            ->sortBy('sort_order')
            ->first(function (IncentiveMandayRule $rule) use ($mandays): bool {
                $maxMandays = $rule->max_mandays;

                return $mandays >= (float) $rule->min_mandays
                    && ($maxMandays === null || $mandays <= (float) $maxMandays);
            });

        if (! $rule instanceof IncentiveMandayRule) {
            $this->fail('mandays', 'No manday rule matches this project mandays.');
        }

        return $rule;
    }

    /**
     * @throws ValidationException
     */
    private function matchingDeliveryRule(IncentiveProfile $profile, int $differenceDays): IncentiveDeliveryRule
    {
        $rule = $profile->deliveryRules
            ->sortBy('sort_order')
            ->first(function (IncentiveDeliveryRule $rule) use ($differenceDays): bool {
                $minDifference = $rule->min_difference_days;
                $maxDifference = $rule->max_difference_days;

                return ($minDifference === null || $differenceDays >= (int) $minDifference)
                    && ($maxDifference === null || $differenceDays <= (int) $maxDifference);
            });

        if (! $rule instanceof IncentiveDeliveryRule) {
            $this->fail('difference_days', 'No delivery rule matches this project delivery result.');
        }

        return $rule;
    }

    /**
     * @param  Collection<int, ProjectMember>  $members
     * @return array<int, IncentiveItemPayload>
     *
     * @throws ValidationException
     */
    private function technicalRows(Collection $members, IncentiveProfile $profile, float $technicalPool): array
    {
        if ($technicalPool <= 0 && $members->isEmpty()) {
            return [];
        }

        if ($members->isEmpty()) {
            $this->fail('project_members', 'Technical members are required for incentive calculation.');
        }

        $weightedMembers = [];
        $totalWeight = 0.0;

        foreach ($members as $member) {
            $roleRule = $this->validRoleRule($member, $profile);
            $picLevelRule = $member->picLevelRule;

            if ($picLevelRule === null || (int) $picLevelRule->incentive_profile_id !== (int) $profile->id) {
                $this->fail('project_members', 'Every technical member must have a PIC level rule from the selected profile.');
            }

            if ($roleRule->is_support) {
                $this->fail('project_members', 'Technical member cannot use support project role rule.');
            }

            $picPoints = (float) $picLevelRule->points;
            $rolePoints = (float) $roleRule->points;
            $weightPoints = $picPoints + $rolePoints;

            $weightedMembers[] = [
                'member' => $member,
                'role_rule' => $roleRule,
                'pic_points' => $picPoints,
                'role_points' => $rolePoints,
                'weight_points' => $weightPoints,
            ];

            $totalWeight += $weightPoints;
        }

        if ($totalWeight <= 0) {
            $this->fail('project_members', 'Total technical member weight must be greater than zero.');
        }

        $rows = [];

        foreach ($weightedMembers as $weightedMember) {
            $member = $weightedMember['member'];
            $weightRatio = (float) $weightedMember['weight_points'] / $totalWeight;
            $baseIncentive = $weightRatio * $technicalPool;

            $rows[] = $this->itemPayload(
                employeeId: (int) $member->user_id,
                employeeName: $member->user->name,
                projectRole: $member->project_role_name ?? $weightedMember['role_rule']->role_name,
                picLevel: $this->picLevelName($member),
                isSupport: false,
                picPoints: (float) $weightedMember['pic_points'],
                rolePoints: (float) $weightedMember['role_points'],
                weightPoints: (float) $weightedMember['weight_points'],
                weightRatio: round($weightRatio, 8),
                baseIncentive: $baseIncentive,
            );
        }

        return $rows;
    }

    /**
     * @param  Collection<int, ProjectMember>  $members
     * @return array<int, IncentiveItemPayload>
     *
     * @throws ValidationException
     */
    private function supportRows(Collection $members, IncentiveProfile $profile, float $supportPool): array
    {
        if ($members->isEmpty()) {
            return [];
        }

        $baseIncentive = $supportPool / $members->count();
        $weightRatio = 1 / $members->count();
        $rows = [];

        foreach ($members as $member) {
            $roleRule = $this->validRoleRule($member, $profile);

            $rows[] = $this->itemPayload(
                employeeId: (int) $member->user_id,
                employeeName: $member->user->name,
                projectRole: $member->project_role_name ?? $roleRule->role_name,
                picLevel: $this->picLevelName($member),
                isSupport: true,
                picPoints: $this->picLevelPoints($member),
                rolePoints: (float) $roleRule->points,
                weightPoints: 0,
                weightRatio: round($weightRatio, 8),
                baseIncentive: $baseIncentive,
            );
        }

        return $rows;
    }

    /**
     * @return IncentiveItemPayload
     */
    private function itemPayload(
        int $employeeId,
        string $employeeName,
        string $projectRole,
        ?string $picLevel,
        bool $isSupport,
        float $picPoints,
        float $rolePoints,
        float $weightPoints,
        float $weightRatio,
        float $baseIncentive,
    ): array {
        return [
            'employee_id' => $employeeId,
            'employee_name' => $employeeName,
            'project_role' => $projectRole,
            'pic_level' => $picLevel,
            'is_support' => $isSupport,
            'pic_points' => $this->roundValue($picPoints),
            'role_points' => $this->roundValue($rolePoints),
            'weight_points' => $this->roundValue($weightPoints),
            'weight_ratio' => $weightRatio,
            'base_incentive' => $baseIncentive,
        ];
    }

    /**
     * @throws ValidationException
     */
    private function validRoleRule(ProjectMember $member, IncentiveProfile $profile): IncentiveProjectRoleRule
    {
        $roleRule = $member->roleRule;

        if (! $roleRule instanceof IncentiveProjectRoleRule || (int) $roleRule->incentive_profile_id !== (int) $profile->id) {
            $this->fail('project_members', 'Every project member must have a project role rule from the selected profile.');
        }

        return $roleRule;
    }

    private function isSupportMember(ProjectMember $member): bool
    {
        return (bool) $member->is_support || (bool) $member->roleRule?->is_support;
    }

    private function picLevelName(ProjectMember $member): ?string
    {
        if ($member->pic_level_name !== null) {
            return $member->pic_level_name;
        }

        $picLevelRule = $member->getRelationValue('picLevelRule');

        if (! $picLevelRule instanceof IncentivePicLevelRule) {
            return null;
        }

        return $picLevelRule->level_name;
    }

    private function picLevelPoints(ProjectMember $member): float
    {
        $picLevelRule = $member->getRelationValue('picLevelRule');

        if (! $picLevelRule instanceof IncentivePicLevelRule) {
            return 0;
        }

        return (float) $picLevelRule->points;
    }

    private function deliveryStatus(int $differenceDays): DeliveryStatus
    {
        if ($differenceDays < 0) {
            return DeliveryStatus::Early;
        }

        if ($differenceDays > 0) {
            return DeliveryStatus::Late;
        }

        return DeliveryStatus::OnTime;
    }

    private function roundValue(float $value, int $precision = 4): float
    {
        return round($value, $precision);
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
