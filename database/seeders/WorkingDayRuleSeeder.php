<?php

namespace Database\Seeders;

use App\Models\WorkingDayRule;
use Illuminate\Database\Seeder;

class WorkingDayRuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $days = [
            1 => ['Monday', true],
            2 => ['Tuesday', true],
            3 => ['Wednesday', true],
            4 => ['Thursday', true],
            5 => ['Friday', true],
            6 => ['Saturday', false],
            7 => ['Sunday', false],
        ];

        foreach ($days as $dayOfWeek => [$name, $isWorking]) {
            WorkingDayRule::updateOrCreate(
                ['day_of_week' => $dayOfWeek],
                [
                    'is_working' => $isWorking,
                    'description' => $name,
                ],
            );
        }
    }
}
