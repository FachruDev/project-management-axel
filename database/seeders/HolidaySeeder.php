<?php

namespace Database\Seeders;

use App\Enums\HolidayType;
use App\Models\Holiday;
use Illuminate\Database\Seeder;

class HolidaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $holidays = [
            [
                'date' => '2026-01-01',
                'name' => 'New Year Holiday',
                'type' => HolidayType::National,
                'is_working' => false,
                'description' => 'Placeholder national holiday data. Maintain this master data per official calendar.',
                'is_active' => true,
            ],
        ];

        foreach ($holidays as $holiday) {
            Holiday::updateOrCreate(
                ['date' => $holiday['date']],
                $holiday,
            );
        }
    }
}
