<?php

namespace Tests\Feature;

use App\Enums\AttachmentCollection;
use App\Models\Attachment;
use App\Models\Customer;
use App\Models\Department;
use App\Models\IncentiveDeliveryRule;
use App\Models\IncentiveMandayRule;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectAccessRule;
use App\Models\ProjectIncentiveCalculation;
use App\Models\ProjectIncentiveItem;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class ProjectModelRelationshipTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_user_belongs_to_department(): void
    {
        $department = Department::factory()->create();
        $user = User::factory()->create(['department_id' => $department->id]);

        $this->assertTrue($user->department->is($department));
        $this->assertTrue($department->users->contains($user));
    }

    public function test_project_connects_customers_members_access_tasks_and_attachments(): void
    {
        $project = Project::factory()->create();
        $customer = Customer::factory()->create();
        $memberUser = User::factory()->create();
        $granter = User::factory()->create();
        $taskType = TaskType::factory()->create();

        $project->customers()->attach($customer->id, ['is_primary' => true]);

        $member = ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $memberUser->id,
        ]);

        $accessRule = ProjectAccessRule::factory()->create([
            'project_id' => $project->id,
            'user_id' => $memberUser->id,
            'permission' => 'can_manage_tasks',
            'granted_by' => $granter->id,
        ]);

        $task = ProjectTask::factory()->create([
            'project_id' => $project->id,
            'project_member_id' => $member->id,
            'task_type_id' => $taskType->id,
        ]);

        $projectAttachment = Attachment::factory()->create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => AttachmentCollection::UrsFile,
        ]);

        $taskAttachment = Attachment::factory()->create([
            'attachable_type' => ProjectTask::class,
            'attachable_id' => $task->id,
            'collection' => AttachmentCollection::TaskAttachment,
        ]);

        $project->refresh();
        $task->refresh();

        $this->assertTrue($project->customers->contains($customer));
        $this->assertTrue($project->members->contains($member));
        $this->assertTrue($project->accessRules->contains($accessRule));
        $this->assertTrue($project->tasks->contains($task));
        $this->assertTrue($project->attachments->contains($projectAttachment));
        $this->assertTrue($task->attachments->contains($taskAttachment));
        $this->assertTrue($task->member->is($member));
        $this->assertTrue($task->taskType->is($taskType));
    }

    public function test_incentive_profile_connects_rules_project_and_calculation_snapshot(): void
    {
        $profile = IncentiveProfile::factory()->create();
        $mandayRule = IncentiveMandayRule::factory()->create(['incentive_profile_id' => $profile->id]);
        $picRule = IncentivePicLevelRule::factory()->create(['incentive_profile_id' => $profile->id]);
        $roleRule = IncentiveProjectRoleRule::factory()->create(['incentive_profile_id' => $profile->id]);
        $deliveryRule = IncentiveDeliveryRule::factory()->create(['incentive_profile_id' => $profile->id]);
        $project = Project::factory()->create(['incentive_profile_id' => $profile->id]);
        $employee = User::factory()->create();
        $calculation = ProjectIncentiveCalculation::factory()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
        ]);
        $item = ProjectIncentiveItem::factory()->create([
            'calculation_id' => $calculation->id,
            'employee_id' => $employee->id,
        ]);

        $profile->refresh();
        $calculation->refresh();

        $this->assertTrue($profile->mandayRules->contains($mandayRule));
        $this->assertTrue($profile->picLevelRules->contains($picRule));
        $this->assertTrue($profile->projectRoleRules->contains($roleRule));
        $this->assertTrue($profile->deliveryRules->contains($deliveryRule));
        $this->assertTrue($profile->projects->contains($project));
        $this->assertTrue($calculation->items->contains($item));
        $this->assertTrue($item->employee->is($employee));
    }
}
