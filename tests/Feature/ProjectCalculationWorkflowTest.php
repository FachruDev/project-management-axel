<?php

namespace Tests\Feature;

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
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProjectCalculationWorkflowTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_project_calculation_index_requires_view_permission(): void
    {
        $this
            ->actingAs(User::factory()->create())
            ->get(route('project-calculations.index'))
            ->assertForbidden();

        $this
            ->actingAs($this->userWithPermissions(['view_project_incentives']))
            ->get(route('project-calculations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('project-calculations/index'));
    }

    public function test_index_lists_not_calculated_open_and_locked_closed_projects(): void
    {
        $profile = $this->profileWithRules();
        $notCalculated = $this->closedProject($profile, [
            'name' => 'Not Calculated Project',
            'updated_at' => now()->subMinutes(3),
        ]);
        $openProject = $this->closedProject($profile, [
            'name' => 'Open Calculation Project',
            'updated_at' => now()->subMinutes(2),
        ]);
        $lockedProject = $this->closedProject($profile, [
            'name' => 'Locked Calculation Project',
            'updated_at' => now(),
        ]);

        ProjectIncentiveCalculation::factory()->create([
            'project_id' => $openProject->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
            'locked_at' => null,
        ]);
        ProjectIncentiveCalculation::factory()->locked()->create([
            'project_id' => $lockedProject->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
        ]);

        $this
            ->actingAs($this->userWithPermissions([
                'view_project_incentives',
                'lock_project_incentives',
                'unlock_project_incentives',
            ]))
            ->get(route('project-calculations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('project-calculations/index')
                ->has('projects.data', 3)
                ->where('projects.data.0.name', $lockedProject->name)
                ->where('projects.data.0.calculation.is_locked', true)
                ->where('projects.data.1.name', $openProject->name)
                ->where('projects.data.1.calculation.is_locked', false)
                ->where('projects.data.2.name', $notCalculated->name)
                ->where('projects.data.2.calculation', null));
    }

    public function test_recalculate_profile_creates_new_current_snapshot_for_unlocked_project(): void
    {
        $profile = $this->profileWithRules();
        $project = $this->closedProject($profile);
        $this->addTechnicalMember($project, $profile);
        $oldCalculation = ProjectIncentiveCalculation::factory()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
            'calculated_at' => now()->subDay(),
            'is_current' => true,
            'locked_at' => null,
        ]);
        $actor = $this->userWithPermissions(['calculate_project_incentives']);

        $this
            ->actingAs($actor)
            ->post(route('project-calculations.recalculate', $profile))
            ->assertRedirect(route('project-calculations.index', [
                'incentive_profile_id' => $profile->id,
            ]))
            ->assertSessionHas('calculation_summary');

        $this->assertFalse($oldCalculation->refresh()->is_current);

        $newCalculation = ProjectIncentiveCalculation::query()
            ->whereBelongsTo($project)
            ->where('is_current', true)
            ->firstOrFail();

        $this->assertNotSame($oldCalculation->id, $newCalculation->id);
        $this->assertSame($actor->id, $newCalculation->calculated_by);
    }

    public function test_recalculate_profile_skips_locked_project(): void
    {
        $profile = $this->profileWithRules();
        $project = $this->closedProject($profile);
        $this->addTechnicalMember($project, $profile);
        ProjectIncentiveCalculation::factory()->locked()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
        ]);

        $this
            ->actingAs($this->userWithPermissions(['calculate_project_incentives']))
            ->post(route('project-calculations.recalculate', $profile))
            ->assertSessionHas('calculation_summary', fn (array $summary): bool => $summary['calculated'] === 0
                && $summary['skipped'] === 1
                && $summary['skipped_projects'][0]['project_name'] === $project->name
                && str_contains($summary['skipped_projects'][0]['reason'], 'locked'));

        $this->assertSame(1, ProjectIncentiveCalculation::query()->whereBelongsTo($project)->count());
    }

    public function test_lock_requires_permission_and_records_lock_metadata(): void
    {
        $profile = $this->profileWithRules();
        $project = $this->closedProject($profile);
        $calculation = ProjectIncentiveCalculation::factory()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->patch(route('project-calculations.lock', $calculation), [
                'lock_notes' => 'Ready for payroll.',
            ])
            ->assertForbidden();

        $actor = $this->userWithPermissions(['lock_project_incentives']);

        $this
            ->actingAs($actor)
            ->patch(route('project-calculations.lock', $calculation), [
                'lock_notes' => 'Ready for payroll.',
            ])
            ->assertSessionHasNoErrors();

        $calculation->refresh();

        $this->assertNotNull($calculation->locked_at);
        $this->assertSame($actor->id, $calculation->locked_by);
        $this->assertSame('Ready for payroll.', $calculation->lock_notes);
        $this->assertTrue(Activity::query()->where('event', 'project_calculation_locked')->exists());
    }

    public function test_unlock_requires_permission_and_allows_recalculate_again(): void
    {
        $profile = $this->profileWithRules();
        $project = $this->closedProject($profile);
        $this->addTechnicalMember($project, $profile);
        $calculation = ProjectIncentiveCalculation::factory()->locked()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->patch(route('project-calculations.unlock', $calculation))
            ->assertForbidden();

        $this
            ->actingAs($this->userWithPermissions(['unlock_project_incentives']))
            ->patch(route('project-calculations.unlock', $calculation))
            ->assertSessionHasNoErrors();

        $this->assertNull($calculation->refresh()->locked_at);
        $this->assertTrue(Activity::query()->where('event', 'project_calculation_unlocked')->exists());

        $this
            ->actingAs($this->userWithPermissions(['calculate_project_incentives']))
            ->post(route('project-calculations.recalculate', $profile))
            ->assertSessionHas('calculation_summary', fn (array $summary): bool => $summary['calculated'] === 1);

        $this->assertFalse($calculation->refresh()->is_current);
        $this->assertSame(2, ProjectIncentiveCalculation::query()->whereBelongsTo($project)->count());
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

    private function addTechnicalMember(Project $project, IncentiveProfile $profile): ProjectMember
    {
        $user = User::factory()->create(['name' => 'Calculation User']);
        $roleRule = $profile->projectRoleRules()->where('role_code', 'pm')->firstOrFail();
        $picRule = $profile->picLevelRules()->where('level_code', 'manager')->firstOrFail();

        return ProjectMember::factory()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'incentive_project_role_rule_id' => $roleRule->id,
            'incentive_pic_level_rule_id' => $picRule->id,
            'project_role_code' => $roleRule->role_code,
            'project_role_name' => $roleRule->role_name,
            'pic_level_code' => $picRule->level_code,
            'pic_level_name' => $picRule->level_name,
            'is_support' => false,
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
}
