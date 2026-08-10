<?php

namespace Database\Factories;

use App\Enums\IncentiveProfileStatus;
use App\Models\IncentiveProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<IncentiveProfile>
 */
class IncentiveProfileFactory extends Factory
{
    public function definition(): array
    {
        $name = 'Incentive '.fake()->unique()->year();

        return [
            'code' => Str::upper(Str::slug($name, '_')),
            'name' => $name,
            'description' => fake()->optional()->sentence(),
            'version' => 1,
            'status' => IncentiveProfileStatus::Draft,
            'effective_from' => now()->startOfYear()->toDateString(),
            'effective_to' => null,
            'support_percent' => 0.1000,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}
