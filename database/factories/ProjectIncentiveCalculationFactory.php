<?php

namespace Database\Factories;

use App\Enums\DeliveryStatus;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectIncentiveCalculation>
 */
class ProjectIncentiveCalculationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'incentive_profile_id' => IncentiveProfile::factory(),
            'mandays' => 6,
            'base_score' => 20,
            'support_percent' => 0.1000,
            'support_pool' => 2,
            'technical_pool' => 18,
            'target_end_date' => now()->toDateString(),
            'actual_end_date' => now()->toDateString(),
            'difference_days' => 0,
            'delivery_status' => DeliveryStatus::OnTime,
            'delivery_multiplier' => 1,
            'total_incentive' => 20,
            'calculated_at' => now(),
            'calculated_by' => null,
            'is_current' => true,
            'locked_at' => null,
            'locked_by' => null,
            'lock_notes' => null,
        ];
    }

    public function locked(): static
    {
        return $this->state(fn (): array => [
            'locked_at' => now(),
        ]);
    }

    public function historical(): static
    {
        return $this->state(fn (): array => [
            'is_current' => false,
        ]);
    }
}
