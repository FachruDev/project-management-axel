<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Department;
use App\Models\Holiday;
use App\Models\IncentiveProfile;
use App\Models\User;
use App\Models\WorkingDayRule;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\HolidaySeeder;
use Database\Seeders\IncentiveProfileSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UserSeeder;
use Database\Seeders\WorkingDayRuleSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MasterSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_master_seeders_create_departments_permissions_roles_user_and_customers(): void
    {
        $this->seed([
            DepartmentSeeder::class,
            PermissionSeeder::class,
            RoleSeeder::class,
            UserSeeder::class,
            CustomerSeeder::class,
            IncentiveProfileSeeder::class,
            WorkingDayRuleSeeder::class,
            HolidaySeeder::class,
        ]);

        $user = User::query()
            ->where('email', 'm.fachru@galenium.com')
            ->firstOrFail();
        $calculatePermission = Permission::query()
            ->where('name', 'calculate_project_incentives')
            ->firstOrFail();

        $this->assertSame('m.fachru', $user->external_id);
        $this->assertTrue($user->is_active);
        $this->assertTrue(Hash::check('Gpl12345!', $user->password));
        $this->assertTrue($user->hasRole('super_admin'));
        $this->assertTrue($user->can('manage_incentive_profiles'));
        $this->assertTrue($user->can('calculate_project_incentives'));
        $this->assertTrue($user->can('manage_users'));
        $this->assertTrue($user->can('manage_roles'));
        $this->assertTrue($user->can('manage_working_calendar'));
        $this->assertSame('incentive', $calculatePermission->getAttribute('category'));
        $this->assertNotNull($user->department_id);
        $this->assertGreaterThanOrEqual(5, Department::count());
        $this->assertTrue(Role::query()->where('name', 'super_admin')->exists());
        $this->assertTrue(Role::query()->where('name', 'admin')->exists());
        $this->assertTrue(Role::query()->where('name', 'support')->exists());
        $this->assertTrue(Role::findByName('admin')->hasPermissionTo('approve_projects'));
        $this->assertTrue(Role::findByName('admin')->hasPermissionTo('manage_working_calendar'));
        $this->assertFalse(Role::findByName('admin')->hasPermissionTo('manage_users'));
        $this->assertTrue(Role::findByName('support')->hasPermissionTo('view_projects'));
        $this->assertTrue(Role::findByName('support')->hasPermissionTo('manage_projects'));
        $this->assertTrue(Role::findByName('support')->hasPermissionTo('view_tasks'));
        $this->assertTrue(Role::findByName('support')->hasPermissionTo('manage_tasks'));
        $this->assertTrue(Role::findByName('support')->hasPermissionTo('manage_customers'));
        $this->assertFalse(Role::findByName('support')->hasPermissionTo('manage_working_calendar'));
        $this->assertFalse(Role::findByName('support')->hasPermissionTo('manage_users'));
        $this->assertGreaterThanOrEqual(3, Customer::count());
        $this->assertSame(7, WorkingDayRule::count());
        $this->assertFalse(WorkingDayRule::query()->where('day_of_week', 7)->firstOrFail()->is_working);
        $this->assertGreaterThanOrEqual(1, Holiday::count());

        $profile = IncentiveProfile::query()
            ->where('code', 'PROJECT_MONITORING')
            ->firstOrFail();

        $this->assertSame('0.1000', $profile->support_percent);
        $this->assertSame('active', $profile->status->value);
        $this->assertSame(4, $profile->mandayRules()->count());
        $this->assertSame(4, $profile->picLevelRules()->count());
        $this->assertSame(3, $profile->projectRoleRules()->count());
        $this->assertSame(4, $profile->deliveryRules()->count());
    }
}
