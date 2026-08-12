<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Events\ProjectBoardChanged;
use App\Events\TaskBoardChanged;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProjectAuditBroadcastTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'testing-key',
            'broadcasting.connections.reverb.secret' => 'testing-secret',
            'broadcasting.connections.reverb.app_id' => 'testing-app',
        ]);

        Broadcast::channel('project-board', fn (User $user): bool => $user->can('view_projects'));
        Broadcast::channel('task-board', fn (User $user): bool => $user->can('view_tasks'));
    }

    public function test_project_status_move_without_reason_records_audit_and_broadcasts(): void
    {
        $user = $this->userWithPermissions(['manage_projects']);
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);

        Event::fake([ProjectBoardChanged::class]);

        $this->actingAs($user)
            ->patch(route('projects.status-move', $project), [
                'target_status' => ProjectStatus::Planning->value,
            ])
            ->assertSessionHasNoErrors();

        Event::assertDispatched(ProjectBoardChanged::class);

        $activity = Activity::query()
            ->where('event', 'project_status_moved')
            ->where('subject_id', $project->id)
            ->firstOrFail();

        $this->assertSame($user->id, $activity->causer_id);
        $this->assertSame(Project::class, $activity->getExtraProperty('entity_type'));
        $this->assertSame(ProjectStatus::Ongoing->value, $activity->getExtraProperty('old.status'));
        $this->assertSame(ProjectStatus::Planning->value, $activity->getExtraProperty('new.status'));
        $this->assertNull($activity->getExtraProperty('reason'));
    }

    public function test_task_status_move_forward_ignores_reason_and_broadcasts(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
        ]);
        $task = ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'status' => TaskStatus::Assigned,
        ]);

        Event::fake([ProjectBoardChanged::class, TaskBoardChanged::class]);

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task), [
                'status' => TaskStatus::InProgress->value,
                'reason' => 'Starting implementation.',
            ])
            ->assertSessionHasNoErrors();

        Event::assertDispatched(TaskBoardChanged::class);
        Event::assertDispatched(ProjectBoardChanged::class);

        $activity = Activity::query()
            ->where('event', 'task_status_moved')
            ->where('subject_id', $project->id)
            ->firstOrFail();

        $this->assertSame(ProjectTask::class, $activity->getExtraProperty('entity_type'));
        $this->assertSame($task->id, $activity->getExtraProperty('entity_id'));
        $this->assertNull($activity->getExtraProperty('reason'));
        $this->assertSame(TaskStatus::Assigned->value, $activity->getExtraProperty('old.status'));
        $this->assertSame(TaskStatus::InProgress->value, $activity->getExtraProperty('new.status'));
    }

    public function test_invalid_task_transition_does_not_audit_or_broadcast(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
        ]);
        $task = ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'status' => TaskStatus::Done,
        ]);

        Event::fake([ProjectBoardChanged::class, TaskBoardChanged::class]);

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task), [
                'status' => TaskStatus::Todo->value,
                'reason' => 'Invalid move.',
            ])
            ->assertSessionHasErrors('status');

        Event::assertNotDispatched(TaskBoardChanged::class);
        Event::assertNotDispatched(ProjectBoardChanged::class);
        $this->assertFalse(Activity::query()->where('event', 'task_status_moved')->exists());
    }

    public function test_board_channels_allow_users_with_view_permissions(): void
    {
        $viewer = $this->userWithPermissions(['view_projects', 'view_tasks']);

        $this->assertTrue($viewer->can('view_projects'));
        $this->assertTrue($viewer->can('view_tasks'));

        $this->actingAs($viewer)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-project-board',
            ])
            ->assertOk();

        $this->actingAs($viewer)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-task-board',
            ])
            ->assertOk();
    }

    public function test_board_channels_reject_users_without_view_permissions(): void
    {
        $blocked = User::factory()->create();

        $this->assertFalse($blocked->can('view_projects'));
        $this->assertFalse($blocked->can('view_tasks'));

        $this->actingAs($blocked)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-project-board',
            ])
            ->assertForbidden();

        $this->actingAs($blocked)
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-task-board',
            ])
            ->assertForbidden();
    }

    public function test_project_detail_audit_log_is_scoped_to_visible_project(): void
    {
        $user = $this->userWithPermissions(['view_projects']);
        $visibleProject = Project::factory()->create(['pm_user_id' => $user->id]);
        $hiddenProject = Project::factory()->create();

        app(ProjectAuditLogger::class)->log(
            $visibleProject,
            $user,
            'project_updated',
            $visibleProject,
            ['name' => 'Old'],
            ['name' => 'Visible'],
        );
        app(ProjectAuditLogger::class)->log(
            $hiddenProject,
            $user,
            'project_updated',
            $hiddenProject,
            ['name' => 'Old'],
            ['name' => 'Hidden'],
        );

        $this->actingAs($user)
            ->get(route('projects.show', $visibleProject))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/show')
                ->has('project.audit_logs', 1)
                ->where('project.audit_logs.0.action', 'project_updated')
                ->where('project.audit_logs.0.new.name', 'Visible'));

        $this->actingAs($user)
            ->get(route('projects.show', $hiddenProject))
            ->assertForbidden();
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(
            Permission::query()
                ->whereIn('name', $permissions)
                ->pluck('name')
                ->all(),
        );

        return $user;
    }
}
