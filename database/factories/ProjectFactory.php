<?php

namespace Database\Factories;

use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        $projectDate = fake()->dateTimeBetween('-1 month', '+1 month');

        return [
            'name' => fake()->sentence(3),
            'project_date' => $projectDate->format('Y-m-d'),
            'status' => ProjectStatus::Draft,
            'mandays' => fake()->randomFloat(2, 1, 30),
            'incentive_profile_id' => null,
            'pm_user_id' => null,
            'request_user_id' => null,
            'location' => fake()->city(),
            'urs_date' => null,
            'urs_number' => null,
            'plan_start_date' => null,
            'plan_end_date' => null,
            'actual_start_date' => null,
            'actual_end_date' => null,
            'uat_date' => null,
            'bast_date' => null,
            'approval_requested_by' => null,
            'approval_requested_at' => null,
            'approved_by' => null,
            'approved_at' => null,
            'rejected_by' => null,
            'rejected_at' => null,
            'rejection_notes' => null,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
