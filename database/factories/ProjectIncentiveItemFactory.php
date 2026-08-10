<?php

namespace Database\Factories;

use App\Models\ProjectIncentiveCalculation;
use App\Models\ProjectIncentiveItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectIncentiveItem>
 */
class ProjectIncentiveItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'calculation_id' => ProjectIncentiveCalculation::factory(),
            'employee_id' => User::factory(),
            'employee_name' => fake()->name(),
            'project_role' => 'PM',
            'pic_level' => 'Manager',
            'is_support' => false,
            'pic_points' => 4,
            'role_points' => 2,
            'weight_points' => 6,
            'weight_ratio' => 1,
            'base_incentive' => 18,
            'delivery_multiplier' => 1,
            'final_incentive' => 18,
        ];
    }
}
