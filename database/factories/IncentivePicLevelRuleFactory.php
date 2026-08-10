<?php

namespace Database\Factories;

use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IncentivePicLevelRule>
 */
class IncentivePicLevelRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'incentive_profile_id' => IncentiveProfile::factory(),
            'level_code' => fake()->randomElement(['manager', 'section', 'spv', 'officer']).fake()->unique()->numberBetween(1, 999999),
            'level_name' => fake()->jobTitle(),
            'points' => fake()->numberBetween(1, 5),
        ];
    }
}
