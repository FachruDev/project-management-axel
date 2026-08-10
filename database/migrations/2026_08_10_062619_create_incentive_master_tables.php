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
        Schema::create('incentive_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->unsignedInteger('version');
            $table->string('status', 30)->default('draft')->index();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->decimal('support_percent', 5, 4)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['code', 'version']);
        });

        Schema::create('incentive_manday_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incentive_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('min_mandays');
            $table->unsignedInteger('max_mandays')->nullable();
            $table->decimal('base_score', 12, 4);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['incentive_profile_id', 'sort_order']);
        });

        Schema::create('incentive_pic_level_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incentive_profile_id')->constrained()->cascadeOnDelete();
            $table->string('level_code', 50);
            $table->string('level_name', 100);
            $table->decimal('points', 12, 4);
            $table->timestamps();

            $table->unique(['incentive_profile_id', 'level_code']);
        });

        Schema::create('incentive_project_role_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incentive_profile_id')->constrained()->cascadeOnDelete();
            $table->string('role_code', 50);
            $table->string('role_name', 100);
            $table->decimal('points', 12, 4);
            $table->boolean('is_support')->default(false)->index();
            $table->timestamps();

            $table->unique(['incentive_profile_id', 'role_code']);
        });

        Schema::create('incentive_delivery_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incentive_profile_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->integer('min_difference_days')->nullable();
            $table->integer('max_difference_days')->nullable();
            $table->decimal('multiplier', 8, 4);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['incentive_profile_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incentive_delivery_rules');
        Schema::dropIfExists('incentive_project_role_rules');
        Schema::dropIfExists('incentive_pic_level_rules');
        Schema::dropIfExists('incentive_manday_rules');
        Schema::dropIfExists('incentive_profiles');
    }
};
