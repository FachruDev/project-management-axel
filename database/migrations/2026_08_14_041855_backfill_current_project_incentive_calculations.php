<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('project_incentive_calculations')
            ->whereIn('id', function ($query): void {
                $query
                    ->selectRaw('max(id)')
                    ->from('project_incentive_calculations')
                    ->groupBy('project_id');
            })
            ->update(['is_current' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('project_incentive_calculations')->update(['is_current' => false]);
    }
};
