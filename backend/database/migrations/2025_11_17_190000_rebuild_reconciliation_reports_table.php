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
        Schema::dropIfExists('reconciliation_reports');

        Schema::create('reconciliation_runs', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->dateTime('reconciliation_date')->index();
            $table->string('reconciliation_mode')->index();
            $table->string('status')->default('completed')->index();
            $table->string('user_name')->nullable()->index();
            $table->string('file_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->json('filters')->nullable();
            $table->json('summary')->nullable();
            $table->longText('payload');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reconciliation_runs');

        Schema::create('reconciliation_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->dateTime('reconciliation_date');
            $table->decimal('total_debit', 15, 2)->default(0);
            $table->decimal('total_credit', 15, 2)->default(0);
            $table->decimal('net_change', 15, 2)->default(0);
            $table->string('reconciliation_mode')->default('by_transaction_id');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->integer('total_records')->default(0);
            $table->integer('matched_records')->default(0);
            $table->integer('discrepancies')->default(0);
            $table->json('discrepancy_details')->nullable();
            $table->json('detailed_records')->nullable();
            $table->string('status')->default('completed');
            $table->timestamps();
        });
    }
};

