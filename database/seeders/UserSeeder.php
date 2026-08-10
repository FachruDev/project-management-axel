<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $department = Department::query()
            ->where('code', 'IT')
            ->first();

        $user = User::updateOrCreate(
            ['email' => 'm.fachru@galenium.com'],
            [
                'name' => 'M. Fachru',
                'external_id' => 'm.fachru',
                'department_id' => $department?->id,
                'password' => Hash::make('Gpl12345!'),
                'is_active' => true,
            ],
        );

        $user->assignRole('super_admin');
    }
}
