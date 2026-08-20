<?php

namespace Database\Factories;

use App\Enums\ProjectQuotationStatus;
use App\Enums\ProjectQuotationType;
use App\Models\Project;
use App\Models\ProjectQuotation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectQuotation>
 */
class ProjectQuotationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'quotation_no' => 'QUOT/AXEL-PRJ/'.$this->faker->year().'/I/'.$this->faker->unique()->numberBetween(1, 999),
            'quotation_type' => ProjectQuotationType::Project,
            'quotation_date' => $this->faker->date(),
            'customer_name' => $this->faker->company(),
            'customer_address' => $this->faker->address(),
            'customer_identifier' => $this->faker->bothify('CUST-###'),
            'cc' => null,
            'description' => $this->faker->sentence(),
            'term_of_payment_date' => now()->toDateString(),
            'valid_until_date' => now()->addMonth()->toDateString(),
            'note' => $this->faker->sentence(),
            'prepared_by_name' => $this->faker->name(),
            'approved_by_name' => $this->faker->name(),
            'ppn_pph_percent' => 11,
            'subtotal' => 1000000,
            'grand_total' => 1110000,
            'qr_target_url' => 'https://www.axeltekno.com',
            'status' => ProjectQuotationStatus::Quotation,
            'created_by' => User::factory(),
            'updated_by' => User::factory(),
        ];
    }
}
