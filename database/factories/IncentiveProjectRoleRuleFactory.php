<?php

namespace Database\Factories;

use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IncentiveProjectRoleRule>
 */
class IncentiveProjectRoleRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'incentive_profile_id' => IncentiveProfile::factory(),
            'role_code' => fake()->unique()->randomElement(['pm', 'production', 'support']).fake()->unique()->numberBetween(1, 999),
            'role_name' => fake()->jobTitle(),
            'points' => fake()->numberBetween(0, 3),
            'is_support' => false,
        ];
    }
}
