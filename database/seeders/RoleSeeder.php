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

        $roles = [
            'super_admin' => $allPermissions,
            'admin' => $allPermissions,
            'project_manager' => [
                'manage_projects',
                'view_projects',
                'view_project_incentives',
                'calculate_project_incentives',
            ],
            'member' => [
                'view_projects',
                'view_project_incentives',
            ],
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
