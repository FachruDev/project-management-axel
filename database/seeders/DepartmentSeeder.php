<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            ['code' => 'IT', 'name' => 'Information Technology', 'description' => 'Technology and application delivery.'],
            ['code' => 'PMO', 'name' => 'Project Management Office', 'description' => 'Project governance and delivery coordination.'],
            ['code' => 'QA', 'name' => 'Quality Assurance', 'description' => 'Quality validation and compliance support.'],
            ['code' => 'OPS', 'name' => 'Operations', 'description' => 'Operational execution and support.'],
            ['code' => 'SALES', 'name' => 'Sales', 'description' => 'Customer relationship and commercial coordination.'],
        ];

        foreach ($departments as $department) {
            Department::updateOrCreate(
                ['code' => $department['code']],
                [
                    'name' => $department['name'],
                    'description' => $department['description'],
                    'is_active' => true,
                ],
            );
        }
    }
}
