<?php

namespace Database\Factories;

use App\Models\IncentiveDeliveryRule;
use App\Models\IncentiveProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IncentiveDeliveryRule>
 */
class IncentiveDeliveryRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'incentive_profile_id' => IncentiveProfile::factory(),
            'name' => 'On Time',
            'min_difference_days' => 0,
            'max_difference_days' => 0,
            'multiplier' => 1,
            'sort_order' => 1,
        ];
    }
}
