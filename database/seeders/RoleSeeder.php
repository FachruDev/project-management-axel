<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $allPermissions = Permission::query()
            ->where('guard_name', 'web')
            ->pluck('name')
            ->all();

        $adminPermissions = Permission::query()
            ->where('guard_name', 'web')
            ->whereNotIn('name', ['manage_users', 'export_users', 'import_users', 'override_actual_dates'])
            ->pluck('name')
            ->all();

        $supportPermissions = [
            'manage_projects',
            'view_projects',
            'approve_projects',
            'manage_tasks',
            'view_tasks',
            'manage_customers',
        ];

        $roles = [
            'super_admin' => $allPermissions,
            'admin' => $adminPermissions,
            'support' => $supportPermissions,
        ];

        foreach ($roles as $roleName => $permissionNames) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
            ]);

            $role->syncPermissions($permissionNames);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
