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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email')->nullable()->index();
            $table->string('company_name', 150);
            $table->text('company_address')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->date('project_date');
            $table->string('status', 30)->default('draft')->index();
            $table->decimal('mandays', 12, 2);
            $table->foreignId('incentive_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pm_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('request_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location', 200)->nullable();
            $table->date('urs_date')->nullable();
            $table->string('urs_number', 100)->nullable();
            $table->date('plan_start_date')->nullable();
            $table->date('plan_end_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->date('uat_date')->nullable();
            $table->date('bast_date')->nullable();
            $table->foreignId('approval_requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approval_requested_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'project_date']);
            $table->index(['pm_user_id', 'status']);
        });

        Schema::create('customer_project', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['customer_id', 'project_id']);
        });

        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incentive_project_role_rule_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('incentive_pic_level_rule_id')->nullable()->constrained()->nullOnDelete();
            $table->string('project_role_code', 50)->nullable();
            $table->string('project_role_name', 100)->nullable();
            $table->string('pic_level_code', 50)->nullable();
            $table->string('pic_level_name', 100)->nullable();
            $table->boolean('is_support')->default(false)->index();
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });

        Schema::create('project_access_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('permission', 80);
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'user_id', 'permission']);
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->morphs('attachable');
            $table->string('collection', 50)->index();
            $table->string('disk', 50)->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('project_access_rules');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('customer_project');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('customers');
    }
};
