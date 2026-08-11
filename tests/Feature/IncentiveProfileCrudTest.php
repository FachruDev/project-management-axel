<?php

namespace Tests\Feature;

use App\Enums\IncentiveProfileStatus;
use App\Models\IncentiveDeliveryRule;
use App\Models\IncentiveMandayRule;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProfile;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class IncentiveProfileCrudTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_permission_is_required_to_open_incentive_profiles(): void
    {
        $this
            ->actingAs(User::factory()->create())
            ->get(route('incentive-profiles.index'))
            ->assertForbidden();
    }

    public function test_authorized_user_can_view_index_and_detail(): void
    {
        $user = $this->userWithPermission();
        $profile = $this->profileWithRules();

        $this
            ->actingAs($user)
            ->get(route('incentive-profiles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('incentive-profiles/index')
                ->has('profiles.data', 1));

        $this
            ->actingAs($user)
            ->get(route('incentive-profiles.show', $profile))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('incentive-profiles/show')
                ->where('profile.id', $profile->id)
                ->has('profile.manday_rules', 2));
    }

    public function test_profile_can_be_created_with_nested_rules(): void
    {
        $user = $this->userWithPermission();

        $response = $this
            ->actingAs($user)
            ->post(route('incentive-profiles.store'), $this->payload([
                'code' => 'inc_2026',
                'name' => 'Incentive 2026',
            ]));

        $profile = IncentiveProfile::query()
            ->where('code', 'INC_2026')
            ->firstOrFail();

        $response->assertRedirect(route('incentive-profiles.show', $profile));
        $this->assertSame(IncentiveProfileStatus::Draft, $profile->status);
        $this->assertSame($user->id, $profile->created_by);
        $this->assertCount(2, $profile->mandayRules);
        $this->assertCount(2, $profile->picLevelRules);
        $this->assertCount(2, $profile->projectRoleRules);
        $this->assertCount(3, $profile->deliveryRules);
    }

    public function test_inactive_profile_can_be_updated_and_replaces_rules(): void
    {
        $user = $this->userWithPermission();
        $profile = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Inactive,
            'code' => 'INC_UPD',
        ]);

        $this
            ->actingAs($user)
            ->put(route('incentive-profiles.update', $profile), $this->payload([
                'code' => 'INC_UPD',
                'name' => 'Updated Incentive',
                'manday_rules' => [
                    ['min_mandays' => 1, 'max_mandays' => null, 'base_score' => 99],
                ],
            ]))
            ->assertRedirect(route('incentive-profiles.show', $profile));

        $profile->refresh();

        $this->assertSame('Updated Incentive', $profile->name);
        $this->assertSame($user->id, $profile->updated_by);
        $this->assertCount(1, $profile->mandayRules);
        $this->assertSame('99.0000', $profile->mandayRules()->firstOrFail()->base_score);
    }

    public function test_active_profile_is_locked_until_inactivated(): void
    {
        $user = $this->userWithPermission();
        $profile = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Active,
            'code' => 'INC_LOCK',
        ]);

        $this
            ->actingAs($user)
            ->put(route('incentive-profiles.update', $profile), $this->payload([
                'code' => 'INC_LOCK',
                'name' => 'Should Fail',
            ]))
            ->assertSessionHasErrors('profile');

        $this
            ->actingAs($user)
            ->patch(route('incentive-profiles.status.update', $profile), [
                'status' => IncentiveProfileStatus::Inactive->value,
            ])
            ->assertRedirect(route('incentive-profiles.show', $profile));

        $this->assertSame(IncentiveProfileStatus::Inactive, $profile->refresh()->status);
    }

    public function test_active_profile_can_only_be_changed_to_inactive(): void
    {
        $profile = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Active,
        ]);

        $this
            ->actingAs($this->userWithPermission())
            ->patch(route('incentive-profiles.status.update', $profile), [
                'status' => IncentiveProfileStatus::Archived->value,
            ])
            ->assertSessionHasErrors('status');
    }

    public function test_multiple_profiles_can_be_active(): void
    {
        $first = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Active,
            'code' => 'INC_ACTIVE_A',
        ]);
        $second = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Inactive,
            'code' => 'INC_ACTIVE_B',
        ]);

        $this
            ->actingAs($this->userWithPermission())
            ->patch(route('incentive-profiles.status.update', $second), [
                'status' => IncentiveProfileStatus::Active->value,
            ])
            ->assertRedirect(route('incentive-profiles.show', $second));

        $this->assertSame(IncentiveProfileStatus::Active, $first->refresh()->status);
        $this->assertSame(IncentiveProfileStatus::Active, $second->refresh()->status);
    }

    public function test_profile_delete_is_blocked_when_active_or_used(): void
    {
        $user = $this->userWithPermission();
        $active = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Active,
            'code' => 'INC_DEL_ACTIVE',
        ]);
        $used = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Inactive,
            'code' => 'INC_DEL_USED',
        ]);

        Project::factory()->create(['incentive_profile_id' => $used->id]);

        $this
            ->actingAs($user)
            ->delete(route('incentive-profiles.destroy', $active))
            ->assertSessionHasErrors('profile');

        $this
            ->actingAs($user)
            ->delete(route('incentive-profiles.destroy', $used))
            ->assertSessionHasErrors('profile');

        $this->assertModelExists($active);
        $this->assertModelExists($used);
    }

    public function test_unused_non_active_profile_can_be_deleted(): void
    {
        $profile = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Inactive,
        ]);

        $this
            ->actingAs($this->userWithPermission())
            ->delete(route('incentive-profiles.destroy', $profile))
            ->assertRedirect(route('incentive-profiles.index'));

        $this->assertModelMissing($profile);
    }

    public function test_new_version_copies_rules_and_uses_next_version(): void
    {
        $profile = $this->profileWithRules([
            'code' => 'INC_VERSION',
            'version' => 2,
            'status' => IncentiveProfileStatus::Archived,
        ]);

        IncentiveProfile::factory()->create([
            'code' => 'INC_VERSION',
            'version' => 3,
            'status' => IncentiveProfileStatus::Inactive,
        ]);

        $this
            ->actingAs($this->userWithPermission())
            ->post(route('incentive-profiles.versions.store', $profile))
            ->assertRedirect();

        $newProfile = IncentiveProfile::query()
            ->where('code', 'INC_VERSION')
            ->where('version', 4)
            ->firstOrFail();

        $this->assertSame(IncentiveProfileStatus::Draft, $newProfile->status);
        $this->assertCount(2, $newProfile->mandayRules);
        $this->assertCount(2, $newProfile->picLevelRules);
        $this->assertCount(2, $newProfile->projectRoleRules);
        $this->assertCount(3, $newProfile->deliveryRules);
    }

    public function test_validation_rejects_duplicate_code_version_and_missing_rules(): void
    {
        IncentiveProfile::factory()->create([
            'code' => 'INC_DUP',
            'version' => 1,
        ]);

        $this
            ->actingAs($this->userWithPermission())
            ->post(route('incentive-profiles.store'), $this->payload([
                'code' => 'inc_dup',
                'version' => 1,
                'manday_rules' => [],
                'pic_level_rules' => [],
                'project_role_rules' => [],
                'delivery_rules' => [],
            ]))
            ->assertSessionHasErrors([
                'code',
                'manday_rules',
                'pic_level_rules',
                'project_role_rules',
                'delivery_rules',
            ]);
    }

    public function test_validation_rejects_manday_gap_and_delivery_overlap(): void
    {
        $this
            ->actingAs($this->userWithPermission())
            ->post(route('incentive-profiles.store'), $this->payload([
                'manday_rules' => [
                    ['min_mandays' => 1, 'max_mandays' => 3, 'base_score' => 10],
                    ['min_mandays' => 5, 'max_mandays' => null, 'base_score' => 20],
                ],
                'delivery_rules' => [
                    ['name' => 'Late A', 'min_difference_days' => 1, 'max_difference_days' => 5, 'multiplier' => 0.8],
                    ['name' => 'Late B', 'min_difference_days' => 4, 'max_difference_days' => null, 'multiplier' => 0.5],
                ],
            ]))
            ->assertSessionHasErrors(['manday_rules', 'delivery_rules']);
    }

    public function test_validation_rejects_duplicate_pic_and_role_codes(): void
    {
        $this
            ->actingAs($this->userWithPermission())
            ->post(route('incentive-profiles.store'), $this->payload([
                'pic_level_rules' => [
                    ['level_code' => 'manager', 'level_name' => 'Manager', 'points' => 4],
                    ['level_code' => 'MANAGER', 'level_name' => 'Manager 2', 'points' => 5],
                ],
                'project_role_rules' => [
                    ['role_code' => 'pm', 'role_name' => 'PM', 'points' => 2, 'is_support' => false],
                    ['role_code' => 'PM', 'role_name' => 'Project Manager', 'points' => 3, 'is_support' => false],
                ],
            ]))
            ->assertSessionHasErrors(['pic_level_rules', 'project_role_rules']);
    }

    public function test_delete_guard_checks_calculation_usage(): void
    {
        $profile = $this->profileWithRules([
            'status' => IncentiveProfileStatus::Inactive,
        ]);

        ProjectIncentiveCalculation::factory()->create([
            'incentive_profile_id' => $profile->id,
        ]);

        $this
            ->actingAs($this->userWithPermission())
            ->delete(route('incentive-profiles.destroy', $profile))
            ->assertSessionHasErrors('profile');
    }

    private function userWithPermission(): User
    {
        $permission = Permission::firstOrCreate([
            'name' => 'manage_incentive_profiles',
            'guard_name' => 'web',
        ]);

        $user = User::factory()->create();
        $user->givePermissionTo($permission);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function profileWithRules(array $overrides = []): IncentiveProfile
    {
        $profile = IncentiveProfile::factory()->create($overrides);

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
            'multiplier' => 1.2,
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
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'code' => 'INCENTIVE_TEST',
            'name' => 'Incentive Test',
            'description' => 'Profile for test.',
            'version' => 1,
            'effective_from' => now()->toDateString(),
            'effective_to' => null,
            'support_percent' => 10,
            'manday_rules' => [
                ['min_mandays' => 1, 'max_mandays' => 3, 'base_score' => 10],
                ['min_mandays' => 4, 'max_mandays' => null, 'base_score' => 20],
            ],
            'pic_level_rules' => [
                ['level_code' => 'manager', 'level_name' => 'Manager', 'points' => 4],
                ['level_code' => 'officer', 'level_name' => 'Officer', 'points' => 1],
            ],
            'project_role_rules' => [
                ['role_code' => 'pm', 'role_name' => 'PM', 'points' => 2, 'is_support' => false],
                ['role_code' => 'support', 'role_name' => 'Support', 'points' => 0, 'is_support' => true],
            ],
            'delivery_rules' => [
                ['name' => 'Early', 'min_difference_days' => null, 'max_difference_days' => -1, 'multiplier' => 1.2],
                ['name' => 'On Time', 'min_difference_days' => 0, 'max_difference_days' => 0, 'multiplier' => 1],
                ['name' => 'Late', 'min_difference_days' => 1, 'max_difference_days' => null, 'multiplier' => 0.8],
            ],
            ...$overrides,
        ];
    }
}
