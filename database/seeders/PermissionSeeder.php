<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'incentive' => [
                'manage_incentive_profiles',
                'calculate_project_incentives',
                'view_project_incentives',
            ],
            'project' => [
                'manage_projects',
                'view_projects',
            ],
            'master_data' => [
                'manage_departments',
                'manage_customers',
            ],
            'administration' => [
                'manage_users',
                'manage_roles',
            ],
        ];

        foreach ($permissions as $category => $names) {
            foreach ($names as $name) {
                Permission::updateOrCreate(
                    ['name' => $name, 'guard_name' => 'web'],
                    ['category' => $category],
                );
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
