<?php

namespace Tests\Feature;

use App\Enums\AttachmentCollection;
use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Attachment;
use App\Models\Customer;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProjectPageWorkflowTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_project_index_requires_project_permission(): void
    {
        $allowedUser = $this->userWithPermissions(['view_projects']);
        $blockedUser = User::factory()->create();

        $this->actingAs($allowedUser)
            ->get(route('projects.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->has('columns', 5));

        $this->actingAs($blockedUser)
            ->get(route('projects.index'))
            ->assertForbidden();
    }

    public function test_projects_kanban_only_shows_operational_statuses(): void
    {
        $user = $this->userWithPermissions(['view_projects']);

        Project::factory()->create(['status' => ProjectStatus::Draft, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::PendingApproval, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::Rejected, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::Planning, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::Ongoing, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::Closed, 'pm_user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('projects.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->where('columns.0.status', ProjectStatus::Planning->value)
                ->where('columns.1.status', ProjectStatus::Ongoing->value)
                ->where('columns.4.status', ProjectStatus::Closed->value)
                ->has('columns.0.projects', 1)
                ->has('columns.1.projects', 1)
                ->has('columns.4.projects', 1));
    }

    public function test_project_preparation_index_shows_preparation_statuses_and_create_redirects_to_preparation(): void
    {
        $user = $this->userWithPermissions(['manage_projects', 'view_projects']);
        $customer = Customer::factory()->create();
        $profile = IncentiveProfile::factory()->create([
            'status' => IncentiveProfileStatus::Active,
        ]);

        Project::factory()->create(['status' => ProjectStatus::Draft, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::Rejected, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::PendingApproval, 'pm_user_id' => $user->id]);
        Project::factory()->create(['status' => ProjectStatus::Planning, 'pm_user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('project-preparations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('project-preparations/index')
                ->has('projects', 3)
                ->where('columns.0.status', ProjectStatus::Draft->value)
                ->where('columns.1.status', ProjectStatus::PendingApproval->value)
                ->where('columns.2.status', ProjectStatus::Rejected->value)
                ->has('columns.0.projects', 1)
                ->has('columns.1.projects', 1)
                ->has('columns.2.projects', 1));

        $response = $this->actingAs($user)
            ->post(route('projects.store', ['redirect_to' => 'preparation']), [
                'name' => 'Preparation Draft',
                'project_date' => '2026-08-11',
                'customer_ids' => [$customer->id],
                'primary_customer_id' => $customer->id,
                'mandays' => 8,
                'incentive_profile_id' => $profile->id,
            ]);

        $project = Project::query()->where('name', 'Preparation Draft')->firstOrFail();

        $response->assertRedirect(route('projects.preparation.show', $project));

        $this->actingAs($user)
            ->get(route('projects.preparation.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/preparation')
                ->where('project.id', $project->id)
                ->has('options.incentive_profiles', 1));
    }

    public function test_draft_project_can_be_created_from_project_payload(): void
    {
        $user = $this->userWithPermissions(['view_projects', 'manage_projects']);
        $customer = Customer::factory()->create();
        $profile = IncentiveProfile::factory()->create([
            'status' => IncentiveProfileStatus::Active,
        ]);

        $response = $this->actingAs($user)
            ->post(route('projects.store'), [
                'name' => 'ERP Rollout',
                'project_date' => '2026-08-11',
                'customer_ids' => [$customer->id],
                'primary_customer_id' => $customer->id,
                'mandays' => 12,
                'incentive_profile_id' => $profile->id,
            ]);

        $project = Project::query()->where('name', 'ERP Rollout')->firstOrFail();

        $response->assertRedirect(route('projects.show', $project));
        $this->assertSame(ProjectStatus::Draft, $project->status);
        $this->assertTrue($project->customers()->whereKey($customer->id)->exists());
    }

    public function test_preparation_update_uploads_files_members_access_rules_and_tasks(): void
    {
        Storage::fake('local');

        $user = $this->userWithPermissions(['manage_projects']);
        $profile = $this->profileWithRules();
        $customer = Customer::factory()->create();
        $project = Project::factory()->create([
            'incentive_profile_id' => $profile->id,
        ]);
        $pm = User::factory()->create();
        $memberUser = User::factory()->create();
        $taskType = TaskType::factory()->create();
        $roleRule = $profile->projectRoleRules()->firstOrFail();
        $picRule = $profile->picLevelRules()->firstOrFail();

        $this->actingAs($user)
            ->post(route('projects.preparation.update', $project), [
                '_method' => 'PUT',
                'name' => 'Updated Preparation Project',
                'project_date' => '2026-08-11',
                'customer_ids' => [$customer->id],
                'primary_customer_id' => $customer->id,
                'mandays' => 9.5,
                'incentive_profile_id' => $profile->id,
                'pm_user_id' => $pm->id,
                'request_user_id' => $user->id,
                'location' => 'Jakarta',
                'urs_date' => '2026-08-12',
                'urs_number' => 'URS-001',
                'urs_file' => UploadedFile::fake()->create('urs.pdf', 12, 'application/pdf'),
                'request_evidence' => [
                    UploadedFile::fake()->create('request.pdf', 12, 'application/pdf'),
                ],
                'plan_start_date' => '2026-08-13',
                'plan_end_date' => '2026-08-20',
                'members' => [[
                    'user_id' => $memberUser->id,
                    'incentive_project_role_rule_id' => $roleRule->id,
                    'incentive_pic_level_rule_id' => $picRule->id,
                    'is_support' => false,
                ]],
                'access_rules' => [[
                    'user_id' => $memberUser->id,
                    'permission' => 'manage_tasks',
                ]],
                'tasks' => [[
                    'name' => 'Prepare UAT Script',
                    'task_type_id' => $taskType->id,
                    'pic_user_id' => $memberUser->id,
                    'status' => TaskStatus::Assigned->value,
                    'description' => 'Prepare user scenario',
                    'plan_start_date' => '2026-08-13',
                    'plan_end_date' => '2026-08-15',
                    'attachments' => [
                        UploadedFile::fake()->create('task.pdf', 12, 'application/pdf'),
                    ],
                ]],
            ])
            ->assertRedirect(route('projects.preparation.show', $project));

        $project->refresh();

        $this->assertSame($pm->id, $project->pm_user_id);
        $this->assertSame('Updated Preparation Project', $project->name);
        $this->assertSame('9.50', $project->mandays);
        $this->assertTrue($project->customers()->whereKey($customer->id)->exists());
        $this->assertTrue($project->hasAttachment(AttachmentCollection::UrsFile));
        $this->assertTrue($project->members()->where('user_id', $memberUser->id)->exists());
        $this->assertTrue($project->accessRules()->where('permission', 'manage_tasks')->exists());
        $this->assertTrue($project->tasks()->where('name', 'Prepare UAT Script')->exists());
        $this->assertDatabaseHas('attachments', [
            'collection' => AttachmentCollection::TaskAttachment->value,
            'original_name' => 'task.pdf',
        ]);
    }

    public function test_project_approval_reject_resubmit_and_start_routes_update_metadata(): void
    {
        Storage::fake('local');

        $manager = $this->userWithPermissions(['manage_projects']);
        $approver = $this->userWithPermissions(['approve_projects']);
        $project = $this->preparedProject($manager);

        $this->actingAs($manager)
            ->post(route('projects.submit-approval', $project))
            ->assertRedirect(route('projects.show', $project));

        $project->refresh();

        $this->assertSame(ProjectStatus::PendingApproval, $project->status);
        $this->assertSame($manager->id, $project->approval_requested_by);

        $this->actingAs($approver)
            ->post(route('project-approvals.reject', $project), [
                'rejection_notes' => 'URS needs correction',
            ])
            ->assertRedirect(route('project-approvals.index'));

        $project->refresh();

        $this->assertSame(ProjectStatus::Rejected, $project->status);
        $this->assertSame('URS needs correction', $project->rejection_notes);

        $this->actingAs($manager)
            ->post(route('projects.resubmit', $project))
            ->assertRedirect(route('projects.show', $project));

        $project->refresh();

        $this->assertSame(ProjectStatus::PendingApproval, $project->status);
        $this->assertNull($project->rejection_notes);

        $this->actingAs($approver)
            ->post(route('project-approvals.approve', $project))
            ->assertRedirect(route('project-approvals.index'));

        $project->refresh();

        $this->assertSame(ProjectStatus::Planning, $project->status);
        $this->assertSame($approver->id, $project->approved_by);

        $project->update(['uat_date' => '2026-08-18']);
        Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => AttachmentCollection::UatFile,
            'uploaded_by' => $manager->id,
        ]);

        $this->actingAs($manager)
            ->post(route('projects.start', $project))
            ->assertRedirect(route('projects.show', $project));

        $project->refresh();

        $this->assertSame(ProjectStatus::Ongoing, $project->status);
        $this->assertNotNull($project->actual_start_date);
    }

    public function test_refresh_status_promotes_to_awaiting_bast_ready_to_close_and_close_sets_actual_end(): void
    {
        Storage::fake('local');

        $user = $this->userWithPermissions(['manage_projects']);
        $project = $this->preparedProject($user);
        $project->update([
            'status' => ProjectStatus::Ongoing,
            'uat_date' => '2026-08-18',
        ]);

        Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => AttachmentCollection::UatFile,
            'uploaded_by' => $user->id,
        ]);
        $project->tasks()->update([
            'status' => TaskStatus::Done,
            'actual_start_date' => '2026-08-13',
            'actual_end_date' => '2026-08-15',
        ]);

        $this->actingAs($user)
            ->post(route('projects.refresh-status', $project))
            ->assertRedirect(route('projects.show', $project));

        $project->refresh();

        $this->assertSame(ProjectStatus::AwaitingBast, $project->status);

        $project->update(['bast_date' => '2026-08-19']);
        Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => AttachmentCollection::BastFile,
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->post(route('projects.refresh-status', $project))
            ->assertRedirect(route('projects.show', $project));

        $project->refresh();

        $this->assertSame(ProjectStatus::ReadyToClose, $project->status);

        $this->actingAs($user)
            ->post(route('projects.close', $project))
            ->assertRedirect(route('projects.show', $project));

        $project->refresh();

        $this->assertSame(ProjectStatus::Closed, $project->status);
        $this->assertSame(now()->toDateString(), $project->actual_end_date?->toDateString());
    }

    public function test_project_status_move_starts_project_and_records_history(): void
    {
        Storage::fake('local');

        $user = $this->userWithPermissions(['manage_projects']);
        $project = $this->preparedProject($user);
        $project->update([
            'status' => ProjectStatus::Planning,
            'uat_date' => '2026-08-18',
        ]);
        Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => AttachmentCollection::UatFile,
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->patch(route('projects.status-move', $project), [
                'target_status' => ProjectStatus::Ongoing->value,
            ])
            ->assertSessionHasNoErrors();

        $project->refresh();

        $this->assertSame(ProjectStatus::Ongoing, $project->status);
        $this->assertDatabaseHas('project_status_histories', [
            'project_id' => $project->id,
            'from_status' => ProjectStatus::Planning->value,
            'to_status' => ProjectStatus::Ongoing->value,
            'source' => 'drag',
        ]);
    }

    public function test_project_status_move_back_one_step_accepts_optional_reason(): void
    {
        $user = $this->userWithPermissions(['manage_projects']);
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);

        $this->actingAs($user)
            ->patch(route('projects.status-move', $project), [
                'target_status' => ProjectStatus::Planning->value,
            ])
            ->assertSessionHasNoErrors();

        $project->refresh();

        $this->assertSame(ProjectStatus::Planning, $project->status);
        $this->assertDatabaseHas('project_status_histories', [
            'project_id' => $project->id,
            'from_status' => ProjectStatus::Ongoing->value,
            'to_status' => ProjectStatus::Planning->value,
            'reason' => null,
        ]);
    }

    public function test_project_status_move_rejects_multi_step_and_closed_rollback(): void
    {
        $user = $this->userWithPermissions(['manage_projects']);
        $readyProject = Project::factory()->create(['status' => ProjectStatus::ReadyToClose]);
        $closedProject = Project::factory()->create(['status' => ProjectStatus::Closed]);

        $this->actingAs($user)
            ->patch(route('projects.status-move', $readyProject), [
                'target_status' => ProjectStatus::Ongoing->value,
                'reason' => 'Too far.',
            ])
            ->assertSessionHasErrors('target_status');

        $this->actingAs($user)
            ->patch(route('projects.status-move', $closedProject), [
                'target_status' => ProjectStatus::ReadyToClose->value,
                'reason' => 'Reopen.',
            ])
            ->assertSessionHasErrors('target_status');
    }

    public function test_project_task_type_crud_is_scoped_to_project(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $project = Project::factory()->create();

        $this->actingAs($user)
            ->post(route('projects.task-types.store', $project), [
                'name' => 'Architecture',
                'color' => '#0a57a4',
                'description' => 'Architecture label',
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        $taskType = TaskType::query()->where('name', 'Architecture')->firstOrFail();

        $this->assertSame($project->id, $taskType->project_id);

        $this->actingAs($user)
            ->patch(route('projects.task-types.update', [$project, $taskType]), [
                'name' => 'Development',
                'color' => '#16a34a',
                'description' => 'Development label',
                'is_active' => false,
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('task_types', [
            'id' => $taskType->id,
            'project_id' => $project->id,
            'name' => 'Development',
            'is_active' => false,
        ]);

        $this->actingAs($user)
            ->delete(route('projects.task-types.destroy', [$project, $taskType]))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('task_types', [
            'id' => $taskType->id,
        ]);
    }

    public function test_project_and_bulk_project_delete_routes_require_manage_permission(): void
    {
        $user = $this->userWithPermissions(['view_projects', 'manage_projects']);
        $firstProject = Project::factory()->create(['name' => 'Delete Project A']);
        $secondProject = Project::factory()->create(['name' => 'Delete Project B']);
        $thirdProject = Project::factory()->create(['name' => 'Delete Project C']);

        $this->actingAs($user)
            ->delete(route('projects.destroy', $firstProject))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('projects', [
            'id' => $firstProject->id,
        ]);

        $this->actingAs($user)
            ->delete(route('projects.bulk-delete'), [
                'project_ids' => [$secondProject->id, $thirdProject->id],
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('projects', [
            'id' => $secondProject->id,
        ]);
        $this->assertDatabaseMissing('projects', [
            'id' => $thirdProject->id,
        ]);
    }

    public function test_bulk_task_create_page_and_store_create_multiple_tasks(): void
    {
        Storage::fake('local');

        $user = $this->userWithPermissions(['manage_tasks']);
        $project = $this->preparedProject($user);
        $taskType = TaskType::factory()->create(['project_id' => $project->id]);
        $member = $project->members()->firstOrFail();

        $this->actingAs($user)
            ->get(route('projects.tasks.create', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/tasks/create')
                ->where('project.id', $project->id));

        $this->actingAs($user)
            ->post(route('projects.tasks.bulk-store', $project), [
                'tasks' => [
                    [
                        'name' => 'Bulk Task 1',
                        'task_type_id' => $taskType->id,
                        'pic_user_id' => $member->user_id,
                        'description' => 'First bulk task',
                        'plan_start_date' => '2026-08-14',
                        'plan_end_date' => '2026-08-15',
                        'attachments' => [
                            UploadedFile::fake()->create('bulk-task.pdf', 12, 'application/pdf'),
                        ],
                    ],
                    [
                        'name' => 'Bulk Task 2',
                        'task_type_id' => '',
                        'pic_user_id' => '',
                        'description' => null,
                        'plan_start_date' => '2026-08-16',
                        'plan_end_date' => '2026-08-17',
                    ],
                ],
            ])
            ->assertRedirect(route('projects.preparation.show', $project));

        $this->assertDatabaseHas('project_tasks', [
            'project_id' => $project->id,
            'name' => 'Bulk Task 1',
            'status' => TaskStatus::Assigned->value,
            'task_type_id' => $taskType->id,
        ]);
        $this->assertDatabaseHas('project_tasks', [
            'project_id' => $project->id,
            'name' => 'Bulk Task 2',
            'status' => TaskStatus::Todo->value,
        ]);
        $this->assertDatabaseHas('attachments', [
            'collection' => AttachmentCollection::TaskAttachment->value,
            'original_name' => 'bulk-task.pdf',
        ]);
    }

    public function test_task_delete_and_bulk_delete_routes(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $project = Project::factory()->create();
        $firstTask = ProjectTask::factory()->create(['project_id' => $project->id]);
        $secondTask = ProjectTask::factory()->create(['project_id' => $project->id]);
        $thirdTask = ProjectTask::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete(route('tasks.destroy', $firstTask))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('project_tasks', [
            'id' => $firstTask->id,
        ]);

        $this->actingAs($user)
            ->delete(route('tasks.bulk-delete'), [
                'task_ids' => [$secondTask->id, $thirdTask->id],
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('project_tasks', [
            'id' => $secondTask->id,
        ]);
        $this->assertDatabaseMissing('project_tasks', [
            'id' => $thirdTask->id,
        ]);
    }

    public function test_task_board_is_scoped_to_visible_tasks(): void
    {
        $user = $this->userWithPermissions(['view_tasks']);
        $visibleProject = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $hiddenProject = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $visibleMember = ProjectMember::factory()->create([
            'project_id' => $visibleProject->id,
            'user_id' => $user->id,
        ]);
        $hiddenMember = ProjectMember::factory()->create([
            'project_id' => $hiddenProject->id,
        ]);

        $visibleProject->tasks()->create([
            'project_member_id' => $visibleMember->id,
            'name' => 'Visible Scoped Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-15',
        ]);
        $hiddenProject->tasks()->create([
            'project_member_id' => $hiddenMember->id,
            'name' => 'Hidden Scoped Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-15',
        ]);

        $this->actingAs($user)
            ->get(route('tasks.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tasks/index')
                ->has('columns', 5)
                ->has('columns.1.tasks', 1)
                ->where('columns.1.tasks.0.name', 'Visible Scoped Task'));
    }

    public function test_task_status_action_uses_controlled_transitions(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
        ]);
        $task = $project->tasks()->create([
            'project_member_id' => $member->id,
            'name' => 'Controlled Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-15',
        ]);

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task), [
                'status' => TaskStatus::InProgress->value,
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertSame(TaskStatus::InProgress, $task->status);
        $this->assertNotNull($task->actual_start_date);

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task), [
                'status' => TaskStatus::Todo->value,
                'reason' => 'Reset to todo.',
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertSame(TaskStatus::Todo, $task->status);
        $this->assertNull($task->actual_start_date);

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task), [
                'status' => TaskStatus::Assigned->value,
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertSame(TaskStatus::Assigned, $task->status);
        $this->assertNull($task->actual_start_date);

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task), [
                'status' => TaskStatus::InProgress->value,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task->refresh()), [
                'status' => TaskStatus::Done->value,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->patch(route('tasks.status.update', $task->refresh()), [
                'status' => TaskStatus::Todo->value,
                'reason' => 'Restart from todo.',
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertSame(TaskStatus::Todo, $task->status);
        $this->assertNull($task->actual_start_date);
        $this->assertNull($task->actual_end_date);
    }

    public function test_task_can_be_updated_from_drawer_with_status_transition(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
        ]);
        $taskType = TaskType::factory()->create(['project_id' => $project->id]);
        $task = $project->tasks()->create([
            'project_member_id' => $member->id,
            'name' => 'Editable Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-15',
        ]);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), [
                'name' => 'Edited From Drawer',
                'task_type_id' => $taskType->id,
                'pic_user_id' => $member->user_id,
                'status' => TaskStatus::InProgress->value,
                'description' => 'Updated details.',
                'plan_start_date' => '2026-08-14',
                'plan_end_date' => '2026-08-16',
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertSame('Edited From Drawer', $task->name);
        $this->assertSame($taskType->id, $task->task_type_id);
        $this->assertSame(TaskStatus::InProgress, $task->status);
        $this->assertNotNull($task->actual_start_date);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), [
                'name' => 'Edited Rollback Task',
                'task_type_id' => $taskType->id,
                'pic_user_id' => $member->user_id,
                'status' => TaskStatus::Assigned->value,
                'reason' => 'Need to reassign before progress.',
                'description' => 'Rollback from drawer.',
                'plan_start_date' => '2026-08-14',
                'plan_end_date' => '2026-08-16',
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();

        $this->assertSame('Edited Rollback Task', $task->name);
        $this->assertSame(TaskStatus::Assigned, $task->status);
        $this->assertNull($task->actual_start_date);
    }

    public function test_task_update_rejects_pic_outside_project_members(): void
    {
        $user = $this->userWithPermissions(['manage_tasks']);
        $outsideUser = User::factory()->create();
        $project = Project::factory()->create(['status' => ProjectStatus::Ongoing]);
        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
        ]);
        $task = $project->tasks()->create([
            'project_member_id' => $member->id,
            'name' => 'Scoped PIC Task',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-15',
        ]);

        $this->actingAs($user)
            ->patch(route('tasks.update', $task), [
                'name' => 'Invalid PIC Task',
                'task_type_id' => null,
                'pic_user_id' => $outsideUser->id,
                'status' => TaskStatus::Assigned->value,
                'description' => null,
                'plan_start_date' => '2026-08-13',
                'plan_end_date' => '2026-08-15',
            ])
            ->assertSessionHasErrors('pic_user_id');
    }

    public function test_new_tasks_with_pic_are_automatically_assigned(): void
    {
        $user = $this->userWithPermissions(['manage_projects', 'manage_tasks']);
        $project = $this->preparedProject($user);
        $member = $project->members()->firstOrFail();

        $this->actingAs($user)
            ->post(route('projects.tasks.bulk-store', $project), [
                'tasks' => [[
                    'name' => 'Assigned from bulk create',
                    'pic_user_id' => $member->user_id,
                    'description' => 'Has a PIC',
                    'plan_start_date' => '2026-08-13',
                    'plan_end_date' => '2026-08-15',
                ]],
            ])
            ->assertRedirect(route('projects.preparation.show', $project));

        $this->assertDatabaseHas('project_tasks', [
            'project_id' => $project->id,
            'name' => 'Assigned from bulk create',
            'status' => TaskStatus::Assigned->value,
        ]);
    }

    public function test_planning_project_preparation_can_still_be_updated(): void
    {
        $user = $this->userWithPermissions(['manage_projects']);
        $project = $this->preparedProject($user);
        $project->forceFill(['status' => ProjectStatus::Planning])->save();
        $profile = $project->incentiveProfile()->with(['projectRoleRules', 'picLevelRules'])->firstOrFail();
        $customer = $project->customers()->firstOrFail();
        $pm = $project->pm()->firstOrFail();
        $member = $project->members()->firstOrFail();
        $task = $project->tasks()->firstOrFail();

        $this->actingAs($user)
            ->post(route('projects.preparation.update', $project), [
                '_method' => 'PUT',
                'name' => 'Planning Project Updated',
                'project_date' => '2026-08-11',
                'customer_ids' => [$customer->id],
                'primary_customer_id' => $customer->id,
                'mandays' => 10,
                'incentive_profile_id' => $profile->id,
                'pm_user_id' => $pm->id,
                'request_user_id' => $user->id,
                'location' => 'Bandung',
                'urs_date' => '2026-08-12',
                'urs_number' => 'URS-UPDATED',
                'plan_start_date' => '2026-08-13',
                'plan_end_date' => '2026-08-20',
                'members' => [[
                    'user_id' => $member->user_id,
                    'incentive_project_role_rule_id' => $member->incentive_project_role_rule_id,
                    'incentive_pic_level_rule_id' => $member->incentive_pic_level_rule_id,
                    'is_support' => false,
                ]],
                'access_rules' => [],
                'tasks' => [[
                    'id' => $task->id,
                    'name' => 'Existing planning task',
                    'pic_user_id' => $member->user_id,
                    'status' => TaskStatus::Todo->value,
                    'description' => 'Existing task with PIC should be assigned when saved from todo.',
                    'plan_start_date' => '2026-08-13',
                    'plan_end_date' => '2026-08-15',
                ], [
                    'name' => 'New preparation task with PIC',
                    'pic_user_id' => $member->user_id,
                    'status' => TaskStatus::Todo->value,
                    'description' => 'New task with PIC.',
                    'plan_start_date' => '2026-08-14',
                    'plan_end_date' => '2026-08-16',
                ]],
            ])
            ->assertRedirect(route('projects.preparation.show', $project))
            ->assertSessionHasNoErrors();

        $project->refresh();
        $task->refresh();

        $this->assertSame('Planning Project Updated', $project->name);
        $this->assertSame('Bandung', $project->location);
        $this->assertSame('URS-UPDATED', $project->urs_number);
        $this->assertSame(TaskStatus::Todo, $task->status);
        $this->assertDatabaseHas('project_tasks', [
            'project_id' => $project->id,
            'name' => 'New preparation task with PIC',
            'status' => TaskStatus::Assigned->value,
        ]);
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

    private function profileWithRules(): IncentiveProfile
    {
        $profile = IncentiveProfile::factory()->create([
            'status' => IncentiveProfileStatus::Active,
        ]);

        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'developer',
            'role_name' => 'Developer',
            'is_support' => false,
        ]);
        IncentivePicLevelRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'level_code' => 'pm',
            'level_name' => 'Project Manager',
        ]);

        return $profile->refresh();
    }

    private function preparedProject(User $actor): Project
    {
        $profile = $this->profileWithRules();
        $customer = Customer::factory()->create();
        $pm = User::factory()->create();
        $memberUser = User::factory()->create();
        $roleRule = $profile->projectRoleRules()->firstOrFail();
        $picRule = $profile->picLevelRules()->firstOrFail();
        $project = Project::factory()->create([
            'status' => ProjectStatus::Draft,
            'incentive_profile_id' => $profile->id,
            'pm_user_id' => $pm->id,
            'request_user_id' => $actor->id,
            'location' => 'Jakarta',
            'urs_date' => '2026-08-12',
            'urs_number' => 'URS-001',
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-20',
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
        ]);

        $project->customers()->attach($customer->id, ['is_primary' => true]);

        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $memberUser->id,
            'incentive_project_role_rule_id' => $roleRule->id,
            'incentive_pic_level_rule_id' => $picRule->id,
            'project_role_code' => $roleRule->role_code,
            'project_role_name' => $roleRule->role_name,
            'pic_level_code' => $picRule->level_code,
            'pic_level_name' => $picRule->level_name,
            'is_support' => false,
        ]);

        $project->tasks()->create([
            'project_member_id' => $member->id,
            'name' => 'Prepare UAT Script',
            'status' => TaskStatus::Assigned,
            'plan_start_date' => '2026-08-13',
            'plan_end_date' => '2026-08-15',
        ]);

        Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => AttachmentCollection::UrsFile,
            'uploaded_by' => $actor->id,
        ]);

        return $project->refresh();
    }
}
