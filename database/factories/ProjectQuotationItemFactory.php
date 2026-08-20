<?php

namespace Database\Factories;

use App\Models\ProjectQuotation;
use App\Models\ProjectQuotationItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectQuotationItem>
 */
class ProjectQuotationItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_quotation_id' => ProjectQuotation::factory(),
            'sort_order' => 1,
            'category' => 'project',
            'unit' => 'mandays',
            'description' => $this->faker->sentence(),
            'qty' => 1,
            'unit_price' => 1000000,
            'discount_percent' => 0,
            'amount' => 1000000,
        ];
    }
}
