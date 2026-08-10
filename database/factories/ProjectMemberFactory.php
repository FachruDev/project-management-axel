<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectMember>
 */
class ProjectMemberFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'incentive_project_role_rule_id' => null,
            'incentive_pic_level_rule_id' => null,
            'project_role_code' => 'pm',
            'project_role_name' => 'PM',
            'pic_level_code' => 'manager',
            'pic_level_name' => 'Manager',
            'is_support' => false,
        ];
    }
}
