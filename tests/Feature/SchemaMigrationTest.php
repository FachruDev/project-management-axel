<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\IncentiveProfile;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaMigrationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_project_core_tables_have_required_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('departments', ['code', 'name', 'description', 'is_active']));
        $this->assertTrue(Schema::hasColumn('users', 'department_id'));
        $this->assertTrue(Schema::hasColumns('customers', ['name', 'email', 'company_name', 'company_address', 'is_active']));
        $this->assertTrue(Schema::hasColumns('projects', [
            'name',
            'project_date',
            'status',
            'mandays',
            'incentive_profile_id',
            'pm_user_id',
            'request_user_id',
            'location',
            'urs_date',
            'urs_number',
            'plan_start_date',
            'plan_end_date',
            'actual_start_date',
            'actual_end_date',
            'uat_date',
            'bast_date',
            'rejection_notes',
        ]));
        $this->assertTrue(Schema::hasColumns('project_members', ['project_id', 'user_id', 'project_role_code', 'pic_level_code', 'is_support']));
        $this->assertTrue(Schema::hasColumns('project_access_rules', ['project_id', 'user_id', 'permission', 'granted_by']));
        $this->assertTrue(Schema::hasColumns('attachments', ['attachable_type', 'attachable_id', 'collection', 'disk', 'path', 'original_name']));
    }

    public function test_task_and_incentive_tables_have_required_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('task_types', ['name', 'color', 'description', 'is_active']));
        $this->assertTrue(Schema::hasColumns('project_tasks', ['project_id', 'task_type_id', 'project_member_id', 'name', 'status', 'plan_start_date', 'plan_end_date']));
        $this->assertTrue(Schema::hasColumns('incentive_profiles', ['code', 'name', 'version', 'status', 'effective_from', 'support_percent']));
        $this->assertTrue(Schema::hasColumns('incentive_manday_rules', ['incentive_profile_id', 'min_mandays', 'max_mandays', 'base_score']));
        $this->assertTrue(Schema::hasColumns('incentive_pic_level_rules', ['incentive_profile_id', 'level_code', 'level_name', 'points']));
        $this->assertTrue(Schema::hasColumns('incentive_project_role_rules', ['incentive_profile_id', 'role_code', 'role_name', 'points', 'is_support']));
        $this->assertTrue(Schema::hasColumns('incentive_delivery_rules', ['incentive_profile_id', 'name', 'min_difference_days', 'max_difference_days', 'multiplier']));
        $this->assertTrue(Schema::hasColumns('project_incentive_calculations', ['project_id', 'incentive_profile_id', 'mandays', 'delivery_status', 'total_incentive']));
        $this->assertTrue(Schema::hasColumns('project_incentive_items', ['calculation_id', 'employee_id', 'employee_name', 'project_role', 'final_incentive']));
        $this->assertTrue(Schema::hasColumns('working_day_rules', ['day_of_week', 'is_working', 'description']));
        $this->assertTrue(Schema::hasColumns('holidays', ['date', 'name', 'type', 'is_working', 'description', 'is_active']));
    }

    public function test_basic_unique_constraints_are_enforced(): void
    {
        Department::factory()->create(['code' => 'IT']);

        $this->expectException(QueryException::class);

        Department::factory()->create(['code' => 'IT']);
    }

    public function test_incentive_profile_code_and_version_are_unique_together(): void
    {
        IncentiveProfile::factory()->create(['code' => 'INCENTIVE', 'version' => 1]);

        $this->expectException(QueryException::class);

        IncentiveProfile::factory()->create(['code' => 'INCENTIVE', 'version' => 1]);
    }
}
