<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Department;
use App\Models\User;
use Database\Seeders\CustomerSeeder;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UserSeeder;
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
        $this->assertSame('incentive', $calculatePermission->getAttribute('category'));
        $this->assertNotNull($user->department_id);
        $this->assertGreaterThanOrEqual(5, Department::count());
        $this->assertGreaterThanOrEqual(4, Role::count());
        $this->assertGreaterThanOrEqual(3, Customer::count());
    }
}
