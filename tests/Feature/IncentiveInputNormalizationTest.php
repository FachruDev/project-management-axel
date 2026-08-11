<?php

namespace Tests\Feature;

use App\Enums\IncentiveProfileStatus;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class IncentiveInputNormalizationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_incentive_profile_inputs_are_normalized_before_saving(): void
    {
        $this
            ->actingAs($this->userWithPermissions(['manage_incentive_profiles']))
            ->post(route('incentive-profiles.store'), [
                'code' => 'comma_profile',
                'name' => 'Comma Profile',
                'description' => null,
                'version' => 1,
                'effective_from' => '2026-08-11',
                'effective_to' => null,
                'support_percent' => '10',
                'manday_rules' => [
                    ['min_mandays' => '1', 'max_mandays' => '15', 'base_score' => '12,5'],
                    ['min_mandays' => '16', 'max_mandays' => '0', 'base_score' => '40,75'],
                ],
                'pic_level_rules' => [
                    ['level_code' => 'manager', 'level_name' => 'Manager', 'points' => '1,25'],
                ],
                'project_role_rules' => [
                    ['role_code' => 'support', 'role_name' => 'Support', 'points' => '0,5', 'is_support' => true],
                ],
                'delivery_rules' => [
                    ['name' => 'Early', 'min_difference_days' => '0', 'max_difference_days' => '-1', 'multiplier' => '1,25'],
                    ['name' => 'On Time', 'min_difference_days' => '0', 'max_difference_days' => '0', 'multiplier' => '1'],
                    ['name' => 'Late No Point', 'min_difference_days' => '1', 'max_difference_days' => '-', 'multiplier' => '0'],
                ],
            ])
            ->assertRedirect();

        $profile = IncentiveProfile::query()
            ->where('code', 'COMMA_PROFILE')
            ->firstOrFail();
        $openMandayRule = $profile->mandayRules()->where('min_mandays', 16)->firstOrFail();
        $earlyRule = $profile->deliveryRules()->where('name', 'Early')->firstOrFail();

        $this->assertSame('0.1000', $profile->support_percent);
        $this->assertNull($openMandayRule->max_mandays);
        $this->assertSame('40.7500', $openMandayRule->base_score);
        $this->assertSame('1.2500', $profile->picLevelRules()->firstOrFail()->points);
        $this->assertSame('0.5000', $profile->projectRoleRules()->firstOrFail()->points);
        $this->assertNull($earlyRule->min_difference_days);
        $this->assertSame(-1, $earlyRule->max_difference_days);
        $this->assertSame('1.2500', $earlyRule->multiplier);
    }

    public function test_project_mandays_accepts_comma_decimal(): void
    {
        $user = $this->userWithPermissions(['view_projects', 'manage_projects']);
        $customer = Customer::factory()->create();
        $profile = IncentiveProfile::factory()->create([
            'status' => IncentiveProfileStatus::Active,
        ]);

        $this
            ->actingAs($user)
            ->post(route('projects.store'), [
                'name' => 'Comma Mandays',
                'project_date' => '2026-08-11',
                'customer_ids' => [$customer->id],
                'primary_customer_id' => $customer->id,
                'mandays' => '12,5',
                'incentive_profile_id' => $profile->id,
            ])
            ->assertRedirect();

        $project = Project::query()->where('name', 'Comma Mandays')->firstOrFail();

        $this->assertSame('12.50', $project->mandays);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();

        foreach ($permissions as $permissionName) {
            $permission = Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]);

            $user->givePermissionTo($permission);
        }

        return $user;
    }
}
