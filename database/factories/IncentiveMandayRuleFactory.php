<?php

namespace Database\Factories;

use App\Models\IncentiveMandayRule;
use App\Models\IncentiveProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IncentiveMandayRule>
 */
class IncentiveMandayRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'incentive_profile_id' => IncentiveProfile::factory(),
            'min_mandays' => 1,
            'max_mandays' => 3,
            'base_score' => 10,
            'sort_order' => 1,
        ];
    }
}
