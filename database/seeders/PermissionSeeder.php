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
                'approve_projects',
                'export_project_preparations',
                'import_project_preparations',
            ],
            'task' => [
                'manage_tasks',
                'view_tasks',
            ],
            'master_data' => [
                'manage_departments',
                'manage_customers',
                'manage_working_calendar',
                'export_customers',
                'import_customers',
                'export_holidays',
                'import_holidays',
            ],
            'administration' => [
                'manage_users',
                'manage_roles',
                'export_users',
                'import_users',
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
