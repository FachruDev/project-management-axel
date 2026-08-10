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
        Schema::create('project_incentive_calculations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incentive_profile_id')->constrained()->restrictOnDelete();
            $table->decimal('mandays', 12, 2);
            $table->decimal('base_score', 12, 4);
            $table->decimal('support_percent', 5, 4);
            $table->decimal('support_pool', 12, 4);
            $table->decimal('technical_pool', 12, 4);
            $table->date('target_end_date');
            $table->date('actual_end_date');
            $table->integer('difference_days');
            $table->string('delivery_status', 30);
            $table->decimal('delivery_multiplier', 8, 4);
            $table->decimal('total_incentive', 12, 4);
            $table->timestamp('calculated_at');
            $table->timestamps();

            $table->index(['project_id', 'calculated_at']);
        });

        Schema::create('project_incentive_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calculation_id')->constrained('project_incentive_calculations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('users')->restrictOnDelete();
            $table->string('employee_name', 150);
            $table->string('project_role', 100);
            $table->string('pic_level', 100)->nullable();
            $table->boolean('is_support');
            $table->decimal('pic_points', 12, 4);
            $table->decimal('role_points', 12, 4);
            $table->decimal('weight_points', 12, 4);
            $table->decimal('weight_ratio', 12, 8)->nullable();
            $table->decimal('base_incentive', 12, 4);
            $table->decimal('delivery_multiplier', 8, 4);
            $table->decimal('final_incentive', 12, 4);
            $table->timestamps();

            $table->index(['calculation_id', 'employee_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_incentive_items');
        Schema::dropIfExists('project_incentive_calculations');
    }
};
