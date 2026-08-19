<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\ProjectIncentiveItem;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class IncentiveWorkspaceTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_my_incentive_requires_permission_and_only_lists_own_locked_current_items(): void
    {
        $employee = $this->userWithPermissions(['view_my_incentives']);
        $otherEmployee = User::factory()->create();
        $profile = IncentiveProfile::factory()->create(['code' => 'STD']);
        $customer = Customer::factory()->create(['name' => 'Acme Customer']);
        $ownProject = $this->projectForCustomer($customer, $profile, ['name' => 'Own Locked Project']);
        $openProject = $this->projectForCustomer($customer, $profile, ['name' => 'Open Project']);
        $historicalProject = $this->projectForCustomer($customer, $profile, ['name' => 'Historical Project']);
        $otherProject = $this->projectForCustomer($customer, $profile, ['name' => 'Other User Project']);

        $lockedCalculation = $this->lockedCalculation($ownProject, $profile, ['total_incentive' => 150]);
        ProjectIncentiveItem::factory()->create([
            'calculation_id' => $lockedCalculation->id,
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'final_incentive' => 150,
        ]);
        ProjectIncentiveItem::factory()->create([
            'calculation_id' => ProjectIncentiveCalculation::factory()->create([
                'project_id' => $openProject->id,
                'incentive_profile_id' => $profile->id,
                'is_current' => true,
                'locked_at' => null,
            ])->id,
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'final_incentive' => 99,
        ]);
        ProjectIncentiveItem::factory()->create([
            'calculation_id' => ProjectIncentiveCalculation::factory()->historical()->locked()->create([
                'project_id' => $historicalProject->id,
                'incentive_profile_id' => $profile->id,
            ])->id,
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'final_incentive' => 88,
        ]);
        ProjectIncentiveItem::factory()->create([
            'calculation_id' => $this->lockedCalculation($otherProject, $profile)->id,
            'employee_id' => $otherEmployee->id,
            'employee_name' => $otherEmployee->name,
            'final_incentive' => 77,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->get(route('my-incentives.index'))
            ->assertForbidden();

        $this
            ->actingAs($employee)
            ->get(route('my-incentives.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('my-incentives/index')
                ->has('items.data', 1)
                ->where('items.data.0.project.name', 'Own Locked Project')
                ->where('items.data.0.employee.id', $employee->id)
                ->where('summary.total_incentive', '150'));
    }

    public function test_admin_incentive_requires_permission_and_filters_locked_current_items(): void
    {
        $admin = $this->userWithPermissions(['view_all_incentives']);
        $employeeA = User::factory()->create(['name' => 'Employee A']);
        $employeeB = User::factory()->create(['name' => 'Employee B']);
        $profile = IncentiveProfile::factory()->create(['code' => 'ADM']);
        $customerA = Customer::factory()->create(['name' => 'Customer A']);
        $customerB = Customer::factory()->create(['name' => 'Customer B']);
        $projectA = $this->projectForCustomer($customerA, $profile, ['name' => 'Project A']);
        $projectB = $this->projectForCustomer($customerB, $profile, ['name' => 'Project B']);

        ProjectIncentiveItem::factory()->create([
            'calculation_id' => $this->lockedCalculation($projectA, $profile, ['total_incentive' => 40])->id,
            'employee_id' => $employeeA->id,
            'employee_name' => $employeeA->name,
            'final_incentive' => 40,
        ]);
        ProjectIncentiveItem::factory()->create([
            'calculation_id' => $this->lockedCalculation($projectB, $profile, ['total_incentive' => 60])->id,
            'employee_id' => $employeeB->id,
            'employee_name' => $employeeB->name,
            'final_incentive' => 60,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->get(route('incentives.index'))
            ->assertForbidden();

        $this
            ->actingAs($admin)
            ->get(route('incentives.index', [
                'employee_id' => $employeeA->id,
                'customer_id' => $customerA->id,
                'project_id' => $projectA->id,
                'incentive_profile_id' => $profile->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('incentives/index')
                ->has('items.data', 1)
                ->where('items.data.0.employee.name', 'Employee A')
                ->where('items.data.0.project.name', 'Project A')
                ->where('summary.total_incentive', '40'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function projectForCustomer(Customer $customer, IncentiveProfile $profile, array $overrides = []): Project
    {
        $project = Project::factory()->create([
            'status' => ProjectStatus::Closed,
            'incentive_profile_id' => $profile->id,
            ...$overrides,
        ]);

        $project->customers()->attach($customer->id, ['is_primary' => true]);

        return $project;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function lockedCalculation(Project $project, IncentiveProfile $profile, array $overrides = []): ProjectIncentiveCalculation
    {
        return ProjectIncentiveCalculation::factory()->locked()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
            ...$overrides,
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
