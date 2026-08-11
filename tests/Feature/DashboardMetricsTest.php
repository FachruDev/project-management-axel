<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_admin_dashboard_uses_global_metrics(): void
    {
        $admin = User::factory()->create();
        $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $role->givePermissionTo(Permission::query()->pluck('name')->all());
        $admin->assignRole($role);

        $activeProject = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        Project::factory()->create(['status' => ProjectStatus::PendingApproval]);
        $member = ProjectMember::factory()->create(['project_id' => $activeProject->id]);
        $activeProject->tasks()->create([
            'project_member_id' => $member->id,
            'name' => 'Global Overdue Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => now()->subDays(3)->toDateString(),
            'plan_end_date' => now()->subDay()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('scope', 'global')
                ->where('metrics.active_projects', 1)
                ->where('metrics.awaiting_approval', 1)
                ->where('metrics.overdue_tasks', 1));
    }

    public function test_support_dashboard_is_scoped_to_related_work(): void
    {
        $support = User::factory()->create();
        $support->givePermissionTo(Permission::query()->pluck('name')->all());
        $visibleProject = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $hiddenProject = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $visibleMember = ProjectMember::factory()->create([
            'project_id' => $visibleProject->id,
            'user_id' => $support->id,
        ]);
        $hiddenMember = ProjectMember::factory()->create([
            'project_id' => $hiddenProject->id,
        ]);

        $visibleProject->tasks()->create([
            'project_member_id' => $visibleMember->id,
            'name' => 'Visible Due Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => now()->toDateString(),
            'plan_end_date' => now()->addDays(2)->toDateString(),
        ]);
        $hiddenProject->tasks()->create([
            'project_member_id' => $hiddenMember->id,
            'name' => 'Hidden Due Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => now()->toDateString(),
            'plan_end_date' => now()->addDays(2)->toDateString(),
        ]);

        $this->actingAs($support)
            ->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('scope', 'assigned')
                ->where('metrics.active_projects', 1)
                ->where('metrics.due_this_week_tasks', 1));
    }
}
