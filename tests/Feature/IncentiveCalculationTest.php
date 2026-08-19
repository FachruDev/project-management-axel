<?php

namespace Tests\Feature;

use App\Enums\DeliveryStatus;
use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Models\IncentiveDeliveryRule;
use App\Models\IncentiveMandayRule;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\ProjectMember;
use App\Models\User;
use App\Services\Incentives\IncentiveProfileBatchCalculator;
use App\Services\Incentives\ProjectIncentiveCalculator;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class IncentiveCalculationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_calculator_splits_technical_and_support_pools_with_delivery_multiplier(): void
    {
        $profile = $this->profileWithRules();
        $project = $this->closedProject($profile, [
            'mandays' => 6,
            'plan_end_date' => '2026-01-12',
            'actual_end_date' => '2026-01-08',
        ]);

        $this->addTechnicalMember($project, $profile, 'Dede', 'manager', 'pm');
        $this->addTechnicalMember($project, $profile, 'Yugas', 'officer', 'developer');
        $this->addSupportMember($project, $profile, 'Jihan');
        $this->addSupportMember($project, $profile, 'Fanan');

        $calculation = app(ProjectIncentiveCalculator::class)->calculate($project);

        $this->assertSame(DeliveryStatus::Early, $calculation->delivery_status);
        $this->assertSame(-2, $calculation->difference_days);
        $this->assertSame('20.0000', $calculation->base_score);
        $this->assertSame('2.0000', $calculation->support_pool);
        $this->assertSame('18.0000', $calculation->technical_pool);
        $this->assertSame('1.1000', $calculation->delivery_multiplier);
        $this->assertSame('22.0000', $calculation->total_incentive);

        $items = $calculation->items->keyBy('employee_name');

        $this->assertSame('13.5000', $items->get('Dede')->base_incentive);
        $this->assertSame('14.8500', $items->get('Dede')->final_incentive);
        $this->assertSame('4.5000', $items->get('Yugas')->base_incentive);
        $this->assertSame('4.9500', $items->get('Yugas')->final_incentive);
        $this->assertSame('1.0000', $items->get('Jihan')->base_incentive);
        $this->assertSame('1.1000', $items->get('Jihan')->final_incentive);
        $this->assertSame('1.0000', $items->get('Fanan')->base_incentive);
        $this->assertSame('1.1000', $items->get('Fanan')->final_incentive);
    }

    public function test_delivery_rules_resolve_on_time_and_late_statuses(): void
    {
        $profile = $this->profileWithRules(['support_percent' => 0]);

        $onTimeProject = $this->closedProject($profile, [
            'plan_end_date' => '2026-01-10',
            'actual_end_date' => '2026-01-10',
        ]);
        $this->addTechnicalMember($onTimeProject, $profile, 'On Time User', 'manager', 'pm');

        $lateProject = $this->closedProject($profile, [
            'plan_end_date' => '2026-01-12',
            'actual_end_date' => '2026-01-14',
        ]);
        $this->addTechnicalMember($lateProject, $profile, 'Late User', 'manager', 'pm');

        $onTimeCalculation = app(ProjectIncentiveCalculator::class)->calculate($onTimeProject);
        $lateCalculation = app(ProjectIncentiveCalculator::class)->calculate($lateProject);

        $this->assertSame(DeliveryStatus::OnTime, $onTimeCalculation->delivery_status);
        $this->assertSame('1.0000', $onTimeCalculation->delivery_multiplier);
        $this->assertSame(DeliveryStatus::Late, $lateCalculation->delivery_status);
        $this->assertSame(2, $lateCalculation->difference_days);
        $this->assertSame('0.8000', $lateCalculation->delivery_multiplier);
    }

    public function test_support_role_rule_marks_member_as_support_even_without_checkbox(): void
    {
        $profile = $this->profileWithRules();
        $project = $this->closedProject($profile);
        $this->addTechnicalMember($project, $profile, 'Technical User', 'manager', 'pm');

        $supportMember = $this->addSupportMember($project, $profile, 'Role Support');
        $supportMember->forceFill(['is_support' => false])->save();

        $calculation = app(ProjectIncentiveCalculator::class)->calculate($project);
        $supportItem = $calculation->items->firstWhere('employee_name', 'Role Support');

        $this->assertNotNull($supportItem);
        $this->assertTrue($supportItem->is_support);
        $this->assertSame('2.0000', $supportItem->base_incentive);
    }

    public function test_calculator_rejects_inactive_profile(): void
    {
        $profile = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Inactive,
        ]);
        $project = $this->closedProject($profile);

        $this->expectException(ValidationException::class);

        app(ProjectIncentiveCalculator::class)->calculate($project);
    }

    public function test_batch_calculation_skips_closed_projects_that_are_not_ready_and_ignores_open_projects(): void
    {
        $profile = $this->profileWithRules();
        $validProject = $this->closedProject($profile, ['name' => 'Valid Project']);
        $this->addTechnicalMember($validProject, $profile, 'Valid User', 'manager', 'pm');
        $this->addSupportMember($validProject, $profile, 'Valid Support');

        Project::factory()->create([
            'name' => 'Draft Project',
            'status' => ProjectStatus::Draft,
            'incentive_profile_id' => $profile->id,
        ]);

        $missingActualEnd = $this->closedProject($profile, [
            'name' => 'Missing Actual End',
            'actual_end_date' => null,
        ]);
        $this->addTechnicalMember($missingActualEnd, $profile, 'Invalid User', 'manager', 'pm');

        $summary = app(IncentiveProfileBatchCalculator::class)->calculateForProfile($profile);

        $this->assertSame(1, $summary['calculated']);
        $this->assertSame(1, $summary['skipped']);
        $this->assertSame('Missing Actual End', $summary['skipped_projects'][0]['project_name']);
        $this->assertStringContainsString('actual end date', $summary['skipped_projects'][0]['reason']);
        $this->assertCount(1, ProjectIncentiveCalculation::all());
    }

    public function test_batch_skips_member_rules_from_other_profile_without_rolling_back_valid_projects(): void
    {
        $profile = $this->profileWithRules(['support_percent' => 0]);
        $otherProfile = $this->profileWithRules(['code' => 'INC_OTHER']);

        $validProject = $this->closedProject($profile, ['name' => 'Valid Project']);
        $this->addTechnicalMember($validProject, $profile, 'Valid User', 'manager', 'pm');

        $invalidProject = $this->closedProject($profile, ['name' => 'Invalid Project']);
        $this->addTechnicalMember($invalidProject, $otherProfile, 'Invalid User', 'manager', 'pm');

        $summary = app(IncentiveProfileBatchCalculator::class)->calculateForProfile($profile);

        $this->assertSame(1, $summary['calculated']);
        $this->assertSame(1, $summary['skipped']);
        $this->assertSame('Invalid Project', $summary['skipped_projects'][0]['project_name']);
        $this->assertStringContainsString('selected profile', $summary['skipped_projects'][0]['reason']);
        $this->assertCount(1, ProjectIncentiveCalculation::all());
    }

    public function test_calculate_projects_route_requires_permission(): void
    {
        $profile = $this->profileWithRules();

        $this
            ->actingAs(User::factory()->create())
            ->post(route('incentive-profiles.calculations.store', $profile))
            ->assertForbidden();

        $user = User::factory()->create();
        $user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'calculate_project_incentives',
            'guard_name' => 'web',
        ]));

        $this
            ->actingAs($user)
            ->post(route('incentive-profiles.calculations.store', $profile))
            ->assertRedirect(route('incentive-profiles.show', $profile))
            ->assertSessionHas('calculation_summary');
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function profileWithRules(array $overrides = []): IncentiveProfile
    {
        $profile = IncentiveProfile::factory()->create([
            'status' => IncentiveProfileStatus::Active,
            'support_percent' => 0.1,
            ...$overrides,
        ]);

        IncentiveMandayRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'min_mandays' => 1,
            'max_mandays' => 3,
            'base_score' => 10,
            'sort_order' => 1,
        ]);
        IncentiveMandayRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'min_mandays' => 4,
            'max_mandays' => null,
            'base_score' => 20,
            'sort_order' => 2,
        ]);

        IncentivePicLevelRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'level_code' => 'manager',
            'level_name' => 'Manager',
            'points' => 4,
        ]);
        IncentivePicLevelRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'level_code' => 'officer',
            'level_name' => 'Officer',
            'points' => 1,
        ]);

        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'pm',
            'role_name' => 'PM',
            'points' => 2,
            'is_support' => false,
        ]);
        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'developer',
            'role_name' => 'Developer',
            'points' => 1,
            'is_support' => false,
        ]);
        IncentiveProjectRoleRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'role_code' => 'support',
            'role_name' => 'Support',
            'points' => 0,
            'is_support' => true,
        ]);

        IncentiveDeliveryRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'name' => 'Early',
            'min_difference_days' => null,
            'max_difference_days' => -1,
            'multiplier' => 1.1,
            'sort_order' => 1,
        ]);
        IncentiveDeliveryRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'name' => 'On Time',
            'min_difference_days' => 0,
            'max_difference_days' => 0,
            'multiplier' => 1,
            'sort_order' => 2,
        ]);
        IncentiveDeliveryRule::factory()->create([
            'incentive_profile_id' => $profile->id,
            'name' => 'Late',
            'min_difference_days' => 1,
            'max_difference_days' => null,
            'multiplier' => 0.8,
            'sort_order' => 3,
        ]);

        return $profile->refresh();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function closedProject(IncentiveProfile $profile, array $overrides = []): Project
    {
        return Project::factory()->create([
            'status' => ProjectStatus::Closed,
            'incentive_profile_id' => $profile->id,
            'mandays' => 6,
            'plan_start_date' => '2026-01-01',
            'plan_end_date' => '2026-01-10',
            'actual_start_date' => '2026-01-01',
            'actual_end_date' => '2026-01-10',
            ...$overrides,
        ]);
    }

    private function addTechnicalMember(
        Project $project,
        IncentiveProfile $profile,
        string $name,
        string $picLevelCode,
        string $roleCode,
    ): ProjectMember {
        $user = User::factory()->create(['name' => $name]);
        $picLevelRule = $profile->picLevelRules()->where('level_code', $picLevelCode)->firstOrFail();
        $roleRule = $profile->projectRoleRules()->where('role_code', $roleCode)->firstOrFail();

        return ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'incentive_project_role_rule_id' => $roleRule->id,
            'incentive_pic_level_rule_id' => $picLevelRule->id,
            'project_role_code' => $roleRule->role_code,
            'project_role_name' => $roleRule->role_name,
            'pic_level_code' => $picLevelRule->level_code,
            'pic_level_name' => $picLevelRule->level_name,
            'is_support' => false,
        ]);
    }

    private function addSupportMember(Project $project, IncentiveProfile $profile, string $name): ProjectMember
    {
        $user = User::factory()->create(['name' => $name]);
        $roleRule = $profile->projectRoleRules()->where('role_code', 'support')->firstOrFail();

        return ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'incentive_project_role_rule_id' => $roleRule->id,
            'incentive_pic_level_rule_id' => null,
            'project_role_code' => $roleRule->role_code,
            'project_role_name' => $roleRule->role_name,
            'pic_level_code' => null,
            'pic_level_name' => null,
            'is_support' => true,
        ]);
    }
}
