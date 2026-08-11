<?php

namespace Database\Seeders;

use App\Enums\IncentiveProfileStatus;
use App\Models\IncentiveProfile;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IncentiveProfileSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the project monitoring incentive profile.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $profile = IncentiveProfile::updateOrCreate(
                [
                    'code' => 'PROJECT_MONITORING',
                    'version' => 1,
                ],
                [
                    'name' => 'Project Monitoring',
                    'description' => 'Default incentive profile for project monitoring mandays, PIC level, project role, support pool, and delivery multiplier.',
                    'status' => IncentiveProfileStatus::Active,
                    'effective_from' => now()->startOfYear()->toDateString(),
                    'effective_to' => null,
                    'support_percent' => 0.1000,
                    'created_by' => null,
                    'updated_by' => null,
                ],
            );

            $profile->mandayRules()->delete();
            $profile->picLevelRules()->delete();
            $profile->projectRoleRules()->delete();
            $profile->deliveryRules()->delete();

            $profile->mandayRules()->createMany([
                ['min_mandays' => 1, 'max_mandays' => 3, 'base_score' => 10, 'sort_order' => 1],
                ['min_mandays' => 4, 'max_mandays' => 8, 'base_score' => 20, 'sort_order' => 2],
                ['min_mandays' => 9, 'max_mandays' => 15, 'base_score' => 30, 'sort_order' => 3],
                ['min_mandays' => 16, 'max_mandays' => null, 'base_score' => 40, 'sort_order' => 4],
            ]);

            $profile->picLevelRules()->createMany([
                ['level_code' => 'manager', 'level_name' => 'Manager', 'points' => 4],
                ['level_code' => 'section', 'level_name' => 'Section', 'points' => 3],
                ['level_code' => 'spv', 'level_name' => 'SPV', 'points' => 2],
                ['level_code' => 'officer', 'level_name' => 'Officer', 'points' => 1],
            ]);

            $profile->projectRoleRules()->createMany([
                ['role_code' => 'pm', 'role_name' => 'PM', 'points' => 2, 'is_support' => false],
                ['role_code' => 'prod', 'role_name' => 'Production', 'points' => 1, 'is_support' => false],
                ['role_code' => 'support', 'role_name' => 'Support', 'points' => 0, 'is_support' => true],
            ]);

            $profile->deliveryRules()->createMany([
                ['name' => 'Early Delivery', 'min_difference_days' => null, 'max_difference_days' => -1, 'multiplier' => 1.1000, 'sort_order' => 1],
                ['name' => 'On Time', 'min_difference_days' => 0, 'max_difference_days' => 0, 'multiplier' => 1.0000, 'sort_order' => 2],
                ['name' => 'Late Delivery', 'min_difference_days' => 1, 'max_difference_days' => 30, 'multiplier' => 0.8000, 'sort_order' => 3],
                ['name' => 'Very Late Delivery', 'min_difference_days' => 31, 'max_difference_days' => null, 'multiplier' => 0.0000, 'sort_order' => 4],
            ]);
        });
    }
}
