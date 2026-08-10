<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Department;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MasterDataCrudTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_master_data_routes_require_permissions(): void
    {
        $allowedUser = $this->userWithAllPermissions();
        $blockedUser = User::factory()->create();

        $this->actingAs($allowedUser)
            ->get(route('customers.index'))
            ->assertOk();

        $this->actingAs($blockedUser)
            ->get(route('customers.index'))
            ->assertForbidden();
    }

    public function test_customer_can_be_created_updated_and_guarded_from_delete_when_used(): void
    {
        $user = $this->userWithAllPermissions();

        $this->actingAs($user)
            ->post(route('customers.store'), [
                'name' => 'PT Example Contact',
                'email' => 'contact@example.com',
                'company_name' => 'PT Example',
                'company_address' => 'Jakarta',
                'is_active' => true,
            ])
            ->assertRedirect(route('customers.index'));

        $customer = Customer::query()->where('email', 'contact@example.com')->firstOrFail();

        $this->assertModelExists($customer);

        $this->actingAs($user)
            ->put(route('customers.update', $customer), [
                'name' => 'PT Example Updated',
                'email' => 'updated@example.com',
                'company_name' => 'PT Example',
                'company_address' => 'Bandung',
                'is_active' => false,
            ])
            ->assertRedirect(route('customers.index'));

        $customer->refresh();

        $this->assertSame('PT Example Updated', $customer->name);
        $this->assertFalse($customer->is_active);
    }

    public function test_department_can_be_created_updated_and_delete_is_guarded_when_users_exist(): void
    {
        $user = $this->userWithAllPermissions();

        $this->actingAs($user)
            ->post(route('departments.store'), [
                'code' => 'IT',
                'name' => 'Information Technology',
                'description' => 'Internal IT',
                'is_active' => true,
            ])
            ->assertRedirect(route('departments.index'));

        $department = Department::query()->where('code', 'IT')->firstOrFail();

        $this->actingAs($user)
            ->put(route('departments.update', $department), [
                'code' => 'ITD',
                'name' => 'IT Development',
                'description' => null,
                'is_active' => true,
            ])
            ->assertRedirect(route('departments.index'));

        $department->refresh();

        $this->assertSame('ITD', $department->code);

        User::factory()->for($department)->create();

        $this->actingAs($user)
            ->delete(route('departments.destroy', $department))
            ->assertSessionHasErrors('department');

        $this->assertModelExists($department);
    }

    public function test_user_can_be_created_updated_and_password_update_is_optional(): void
    {
        $admin = $this->userWithAllPermissions();
        $department = Department::factory()->create();
        $role = Role::create(['name' => 'qa_admin', 'guard_name' => 'web']);

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'QA Admin',
                'email' => 'qa.admin@example.com',
                'external_id' => 'qa.admin',
                'department_id' => $department->id,
                'password' => 'Password123!',
                'is_active' => true,
                'roles' => [$role->name],
            ])
            ->assertRedirect(route('users.index'));

        $managedUser = User::query()->where('email', 'qa.admin@example.com')->firstOrFail();

        $this->assertTrue(Hash::check('Password123!', $managedUser->password));
        $this->assertTrue($managedUser->hasRole($role->name));

        $oldPassword = $managedUser->password;

        $this->actingAs($admin)
            ->put(route('users.update', $managedUser), [
                'name' => 'QA Lead',
                'email' => 'qa.lead@example.com',
                'external_id' => 'qa.lead',
                'department_id' => '',
                'password' => '',
                'is_active' => false,
                'roles' => [],
            ])
            ->assertRedirect(route('users.index'));

        $managedUser->refresh();

        $this->assertSame('QA Lead', $managedUser->name);
        $this->assertSame($oldPassword, $managedUser->password);
        $this->assertFalse($managedUser->is_active);
        $this->assertFalse($managedUser->hasRole($role->name));
    }

    public function test_role_can_sync_permissions_and_delete_is_guarded_when_users_exist(): void
    {
        $admin = $this->userWithAllPermissions();
        $permission = Permission::query()->where('name', 'view_projects')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('roles.store'), [
                'name' => 'viewer_custom',
                'permissions' => [$permission->name],
            ])
            ->assertRedirect(route('roles.index'));

        $role = Role::query()->where('name', 'viewer_custom')->firstOrFail();

        $this->assertTrue($role->hasPermissionTo($permission->name));

        $assignedUser = User::factory()->create();
        $assignedUser->assignRole($role);

        $this->actingAs($admin)
            ->delete(route('roles.destroy', $role))
            ->assertSessionHasErrors('role');

        $this->assertModelExists($role);
    }

    private function userWithAllPermissions(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(Permission::query()->pluck('name')->all());

        return $user;
    }
}
