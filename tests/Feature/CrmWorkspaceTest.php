<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CrmWorkspaceTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_crm_index_requires_permission_and_lists_visible_customer_metrics(): void
    {
        $user = $this->userWithPermissions(['view_crm']);
        $profile = IncentiveProfile::factory()->create();
        $visibleCustomer = Customer::factory()->create([
            'name' => 'Visible Customer',
            'company_name' => 'Visible Company',
        ]);
        $hiddenCustomer = Customer::factory()->create(['name' => 'Hidden Customer']);
        $activeProject = $this->projectForCustomer($visibleCustomer, $profile, [
            'name' => 'Active CRM Project',
            'status' => ProjectStatus::Ongoing,
            'pm_user_id' => $user->id,
        ]);
        $closedProject = $this->projectForCustomer($visibleCustomer, $profile, [
            'name' => 'Closed CRM Project',
            'status' => ProjectStatus::Closed,
            'pm_user_id' => $user->id,
        ]);
        $this->projectForCustomer($hiddenCustomer, $profile, [
            'name' => 'Hidden CRM Project',
            'status' => ProjectStatus::Ongoing,
        ]);
        ProjectIncentiveCalculation::factory()->locked()->create([
            'project_id' => $closedProject->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
            'total_incentive' => 75,
        ]);

        $this
            ->actingAs(User::factory()->create())
            ->get(route('crm.index'))
            ->assertForbidden();

        $this
            ->actingAs($user)
            ->get(route('crm.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('crm/index')
                ->has('customers.data', 1)
                ->where('customers.data.0.name', 'Visible Customer')
                ->where('customers.data.0.projects_count', 2)
                ->where('customers.data.0.active_projects_count', 1)
                ->where('customers.data.0.closed_projects_count', 1)
                ->where('customers.data.0.locked_incentive_total', '75'));

        $this->assertTrue($activeProject->exists);
    }

    public function test_crm_detail_requires_visible_customer_and_lists_customer_projects(): void
    {
        $user = $this->userWithPermissions(['view_crm', 'view_projects', 'view_project_incentives']);
        $profile = IncentiveProfile::factory()->create(['code' => 'CRM']);
        $visibleCustomer = Customer::factory()->create(['name' => 'Detail Customer']);
        $hiddenCustomer = Customer::factory()->create(['name' => 'Blocked Customer']);
        $project = $this->projectForCustomer($visibleCustomer, $profile, [
            'name' => 'Visible Detail Project',
            'status' => ProjectStatus::Closed,
            'pm_user_id' => $user->id,
        ]);
        $this->projectForCustomer($hiddenCustomer, $profile, [
            'name' => 'Hidden Detail Project',
            'status' => ProjectStatus::Closed,
        ]);
        ProjectIncentiveCalculation::factory()->locked()->create([
            'project_id' => $project->id,
            'incentive_profile_id' => $profile->id,
            'is_current' => true,
            'total_incentive' => 120,
        ]);

        $this
            ->actingAs($user)
            ->get(route('crm.customers.show', $visibleCustomer))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('crm/show')
                ->where('customer.name', 'Detail Customer')
                ->where('customer.summary.locked_incentive_total', '120')
                ->has('projects.data', 1)
                ->where('projects.data.0.name', 'Visible Detail Project')
                ->where('projects.data.0.actions.can_view_project', true)
                ->where('projects.data.0.actions.can_view_calculation', true));

        $this
            ->actingAs($user)
            ->get(route('crm.customers.show', $hiddenCustomer))
            ->assertForbidden();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function projectForCustomer(Customer $customer, IncentiveProfile $profile, array $overrides = []): Project
    {
        $project = Project::factory()->create([
            'status' => ProjectStatus::Ongoing,
            'incentive_profile_id' => $profile->id,
            ...$overrides,
        ]);

        $project->customers()->attach($customer->id, ['is_primary' => true]);

        return $project;
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
