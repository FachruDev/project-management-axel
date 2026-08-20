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
        Schema::create('project_quotations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('quotation_no', 80)->unique();
            $table->string('quotation_type', 10)->index();
            $table->date('quotation_date')->index();
            $table->string('customer_name');
            $table->text('customer_address')->nullable();
            $table->string('customer_identifier', 120)->nullable();
            $table->text('cc')->nullable();
            $table->text('description')->nullable();
            $table->date('term_of_payment_date')->nullable();
            $table->date('valid_until_date')->nullable();
            $table->text('note')->nullable();
            $table->string('prepared_by_name', 120)->nullable();
            $table->string('approved_by_name', 120)->nullable();
            $table->decimal('ppn_pph_percent', 8, 4)->default(0);
            $table->decimal('subtotal', 18, 2)->default(0);
            $table->decimal('grand_total', 18, 2)->default(0);
            $table->string('qr_target_url')->nullable();
            $table->string('status', 30)->default('quotation')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['quotation_type', 'quotation_date']);
            $table->index(['project_id', 'status']);
        });

        Schema::create('project_quotation_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_quotation_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(1);
            $table->string('category', 50)->index();
            $table->string('unit', 50);
            $table->text('description');
            $table->decimal('qty', 18, 4)->nullable();
            $table->decimal('unit_price', 18, 2)->nullable();
            $table->decimal('discount_percent', 8, 4)->default(0);
            $table->decimal('amount', 18, 2)->default(0);
            $table->timestamps();

            $table->index(['project_quotation_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_quotation_items');
        Schema::dropIfExists('project_quotations');
    }
};
