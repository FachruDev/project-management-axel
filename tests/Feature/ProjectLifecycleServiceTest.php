<?php

namespace Tests\Feature;

use App\Enums\AttachmentCollection;
use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Exceptions\ProjectLifecycleException;
use App\Models\Attachment;
use App\Models\Customer;
use App\Models\IncentiveDeliveryRule;
use App\Models\IncentiveMandayRule;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectLifecycleService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProjectLifecycleServiceTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_submit_for_approval_requires_preparation_data(): void
    {
        $project = Project::factory()->create();
        $actor = User::factory()->create();

        try {
            app(ProjectLifecycleService::class)->submitForApproval($project, $actor);
            $this->fail('Expected validation exception.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('customers', $exception->errors());
            $this->assertArrayHasKey('incentive_profile_id', $exception->errors());
            $this->assertArrayHasKey('pm_user_id', $exception->errors());
            $this->assertArrayHasKey('urs_file', $exception->errors());
            $this->assertArrayHasKey('project_members', $exception->errors());
        }
    }

    public function test_submit_for_approval_sets_pending_metadata(): void
    {
        $this->travelTo(now());

        $project = $this->preparedProject();
        $actor = User::factory()->create();

        $project = app(ProjectLifecycleService::class)->submitForApproval($project, $actor);

        $this->assertSame(ProjectStatus::PendingApproval, $project->status);
        $this->assertSame($actor->id, $project->approval_requested_by);
        $this->assertTrue($project->approval_requested_at->isSameSecond(now()));
    }

    public function test_approve_moves_pending_project_to_planning_and_clears_rejection(): void
    {
        $this->travelTo(now());

        $actor = User::factory()->create();
        $project = $this->preparedProject([
            'status' => ProjectStatus::PendingApproval,
            'rejected_by' => $actor->id,
            'rejected_at' => now()->subDay(),
            'rejection_notes' => 'old note',
        ]);

        $project = app(ProjectLifecycleService::class)->approve($project, $actor);

        $this->assertSame(ProjectStatus::Planning, $project->status);
        $this->assertSame($actor->id, $project->approved_by);
        $this->assertTrue($project->approved_at->isSameSecond(now()));
        $this->assertNull($project->rejected_by);
        $this->assertNull($project->rejected_at);
        $this->assertNull($project->rejection_notes);
    }

    public function test_reject_requires_notes_and_keeps_project_editable_for_resubmit(): void
    {
        $actor = User::factory()->create();
        $project = $this->preparedProject(['status' => ProjectStatus::PendingApproval]);
        $service = app(ProjectLifecycleService::class);

        $this->expectException(ValidationException::class);

        $service->reject($project, $actor, '   ');
    }

    public function test_reject_and_resubmit_clear_rejection_metadata(): void
    {
        $this->travelTo(now());

        $actor = User::factory()->create();
        $project = $this->preparedProject(['status' => ProjectStatus::PendingApproval]);
        $service = app(ProjectLifecycleService::class);

        $project = $service->reject($project, $actor, 'URS file needs revision.');

        $this->assertSame(ProjectStatus::Rejected, $project->status);
        $this->assertSame($actor->id, $project->rejected_by);
        $this->assertSame('URS file needs revision.', $project->rejection_notes);

        $project = $service->resubmit($project, $actor);

        $this->assertSame(ProjectStatus::PendingApproval, $project->status);
        $this->assertNull($project->rejected_by);
        $this->assertNull($project->rejected_at);
        $this->assertNull($project->rejection_notes);
    }

    public function test_start_requires_uat_data(): void
    {
        $project = $this->preparedProject(['status' => ProjectStatus::Planning]);
        $actor = User::factory()->create();

        $this->expectException(ValidationException::class);

        app(ProjectLifecycleService::class)->start($project, $actor);
    }

    public function test_start_moves_planning_to_ongoing_and_sets_actual_start_date(): void
    {
        $this->travelTo(now());

        $project = $this->preparedProject([
            'status' => ProjectStatus::Planning,
            'uat_date' => now()->toDateString(),
        ]);
        $this->addAttachment($project, AttachmentCollection::UatFile);

        $project = app(ProjectLifecycleService::class)->start($project, User::factory()->create());

        $this->assertSame(ProjectStatus::Ongoing, $project->status);
        $this->assertTrue($project->actual_start_date->isSameDay(today()));
    }

    public function test_start_repairs_missing_actual_start_date_for_existing_ongoing_project(): void
    {
        $this->travelTo(now());

        $project = $this->preparedProject([
            'status' => ProjectStatus::Ongoing,
            'actual_start_date' => null,
        ]);

        $project = app(ProjectLifecycleService::class)->start($project, User::factory()->create());

        $this->assertSame(ProjectStatus::Ongoing, $project->status);
        $this->assertTrue($project->actual_start_date->isSameDay(today()));
    }

    public function test_refresh_automatic_status_promotes_ongoing_to_awaiting_bast_when_all_tasks_done(): void
    {
        $project = $this->ongoingProjectWithUat();
        $member = $project->members()->firstOrFail();

        ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'task_type_id' => TaskType::factory()->create()->id,
            'status' => TaskStatus::Done,
        ]);

        $project = app(ProjectLifecycleService::class)->refreshAutomaticStatus($project);

        $this->assertSame(ProjectStatus::AwaitingBast, $project->status);
    }

    public function test_refresh_automatic_status_does_not_promote_when_any_task_is_not_done(): void
    {
        $project = $this->ongoingProjectWithUat();
        $member = $project->members()->firstOrFail();

        ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'task_type_id' => TaskType::factory()->create()->id,
            'status' => TaskStatus::InProgress,
        ]);

        $project = app(ProjectLifecycleService::class)->refreshAutomaticStatus($project);

        $this->assertSame(ProjectStatus::Ongoing, $project->status);
    }

    public function test_refresh_automatic_status_promotes_awaiting_bast_to_ready_to_close_when_bast_complete(): void
    {
        $project = $this->ongoingProjectWithUat(['status' => ProjectStatus::AwaitingBast]);
        $member = $project->members()->firstOrFail();

        ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'task_type_id' => TaskType::factory()->create()->id,
            'status' => TaskStatus::Done,
        ]);
        $project->forceFill(['bast_date' => now()->toDateString()])->save();
        $this->addAttachment($project, AttachmentCollection::BastFile);

        $project = app(ProjectLifecycleService::class)->refreshAutomaticStatus($project);

        $this->assertSame(ProjectStatus::ReadyToClose, $project->status);
    }

    public function test_close_requires_ready_to_close_status(): void
    {
        $project = $this->ongoingProjectWithUat(['status' => ProjectStatus::Planning]);

        $this->expectException(ProjectLifecycleException::class);

        app(ProjectLifecycleService::class)->close($project, User::factory()->create());
    }

    public function test_close_sets_closed_status_and_actual_end_date(): void
    {
        $this->travelTo(now());

        $project = $this->ongoingProjectWithUat([
            'status' => ProjectStatus::ReadyToClose,
            'bast_date' => now()->toDateString(),
        ]);
        $member = $project->members()->firstOrFail();

        ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'task_type_id' => TaskType::factory()->create()->id,
            'status' => TaskStatus::Done,
        ]);
        $this->addAttachment($project, AttachmentCollection::BastFile);

        $actor = User::factory()->create();

        $project = app(ProjectLifecycleService::class)->close($project, $actor);

        $this->assertSame(ProjectStatus::Closed, $project->status);
        $this->assertTrue($project->actual_end_date->isSameDay(today()));

        $calculation = $project->currentIncentiveCalculation()->firstOrFail();

        $this->assertSame($actor->id, $calculation->calculated_by);
    }

    public function test_close_rolls_back_when_incentive_calculation_is_not_ready(): void
    {
        $project = $this->ongoingProjectWithUat([
            'status' => ProjectStatus::ReadyToClose,
            'bast_date' => now()->toDateString(),
        ]);
        $member = $project->members()->firstOrFail();
        $member->forceFill([
            'incentive_project_role_rule_id' => null,
            'incentive_pic_level_rule_id' => null,
            'project_role_code' => null,
            'project_role_name' => null,
            'pic_level_code' => null,
            'pic_level_name' => null,
        ])->save();

        ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'task_type_id' => TaskType::factory()->create()->id,
            'status' => TaskStatus::Done,
        ]);
        $this->addAttachment($project, AttachmentCollection::BastFile);

        $this->expectException(ValidationException::class);

        try {
            app(ProjectLifecycleService::class)->close($project, User::factory()->create());
        } finally {
            $project->refresh();

            $this->assertSame(ProjectStatus::ReadyToClose, $project->status);
            $this->assertFalse($project->currentIncentiveCalculation()->exists());
        }
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function preparedProject(array $overrides = []): Project
    {
        $pm = User::factory()->create();
        $profile = $this->profileWithRules();
        $roleRule = $profile->projectRoleRules()->firstOrFail();
        $picRule = $profile->picLevelRules()->firstOrFail();
        $project = Project::factory()->create([
            'incentive_profile_id' => $profile->id,
            'pm_user_id' => $pm->id,
            'request_user_id' => User::factory()->create()->id,
            'location' => 'Jakarta',
            'urs_date' => now()->toDateString(),
            'urs_number' => 'URS-001',
            'plan_start_date' => now()->addDay()->toDateString(),
            'plan_end_date' => now()->addDays(7)->toDateString(),
            ...$overrides,
        ]);

        $project->customers()->attach(Customer::factory()->create()->id, ['is_primary' => true]);
        ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $pm->id,
            'incentive_project_role_rule_id' => $roleRule->id,
            'incentive_pic_level_rule_id' => $picRule->id,
            'project_role_code' => $roleRule->role_code,
            'project_role_name' => $roleRule->role_name,
            'pic_level_code' => $picRule->level_code,
            'pic_level_name' => $picRule->level_name,
            'is_support' => false,
        ]);
        $this->addAttachment($project, AttachmentCollection::UrsFile);

        return $project->refresh();
    }

    private function profileWithRules(): IncentiveProfile
    {
        $profile = IncentiveProfile::factory()->create([
            'status' => IncentiveProfileStatus::Active,
            'support_percent' => 0,
        ]);

        IncentiveMandayRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'min_mandays' => 1,
            'max_mandays' => null,
            'base_score' => 20,
            'sort_order' => 1,
        ]);
        IncentivePicLevelRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'level_code' => 'manager',
            'level_name' => 'Manager',
            'points' => 4,
        ]);
        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'pm',
            'role_name' => 'PM',
            'points' => 2,
            'is_support' => false,
        ]);
        IncentiveDeliveryRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'name' => 'On Time',
            'min_difference_days' => null,
            'max_difference_days' => null,
            'multiplier' => 1,
            'sort_order' => 1,
        ]);

        return $profile->refresh();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function ongoingProjectWithUat(array $overrides = []): Project
    {
        $project = $this->preparedProject([
            'status' => ProjectStatus::Ongoing,
            'uat_date' => now()->toDateString(),
            ...$overrides,
        ]);
        $this->addAttachment($project, AttachmentCollection::UatFile);

        return $project->refresh();
    }

    private function addAttachment(Project $project, AttachmentCollection $collection): Attachment
    {
        return Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => $collection,
        ]);
    }
}
