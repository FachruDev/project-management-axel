<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_incentive_calculations', function (Blueprint $table) {
            $table->boolean('is_current')->default(false)->index();
            $table->foreignId('calculated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable()->index();
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('lock_notes')->nullable();

            $table->index(['project_id', 'is_current']);
            $table->index(['incentive_profile_id', 'is_current']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_incentive_calculations', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'is_current']);
            $table->dropIndex(['incentive_profile_id', 'is_current']);
            $table->dropForeign(['calculated_by']);
            $table->dropForeign(['locked_by']);
            $table->dropColumn([
                'is_current',
                'calculated_by',
                'locked_at',
                'locked_by',
                'lock_notes',
            ]);
        });
    }
};
