<?php

namespace Database\Factories;

use App\Models\WorkingDayRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkingDayRule>
 */
class WorkingDayRuleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'day_of_week' => fake()->numberBetween(1, 7),
            'is_working' => fake()->boolean(70),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
