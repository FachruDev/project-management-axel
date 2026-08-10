<?php

namespace Database\Factories;

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\TaskType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectTask>
 */
class ProjectTaskFactory extends Factory
{
    public function definition(): array
    {
        $startDate = now()->addDays(fake()->numberBetween(1, 5));

        return [
            'project_id' => Project::factory(),
            'task_type_id' => TaskType::factory(),
            'project_member_id' => null,
            'name' => fake()->sentence(3),
            'status' => TaskStatus::Todo,
            'description' => fake()->optional()->paragraph(),
            'plan_start_date' => $startDate->toDateString(),
            'plan_end_date' => $startDate->copy()->addDays(3)->toDateString(),
            'actual_start_date' => null,
            'actual_end_date' => null,
        ];
    }
}
