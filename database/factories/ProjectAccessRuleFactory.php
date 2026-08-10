<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAccessRule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectAccessRule>
 */
class ProjectAccessRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'permission' => 'can_view',
            'granted_by' => null,
        ];
    }
}
