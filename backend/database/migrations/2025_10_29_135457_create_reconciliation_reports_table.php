<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReconciliationReportsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('reconciliation_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->dateTime('reconciliation_date');
            $table->decimal('total_debit', 15, 2)->default(0);
            $table->decimal('total_credit', 15, 2)->default(0);
            $table->decimal('net_change', 15, 2)->default(0);
            $table->string('reconciliation_mode')->default('by_transaction_id'); // by_transaction_id, by_period
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->integer('total_records')->default(0);
            $table->integer('matched_records')->default(0);
            $table->integer('discrepancies')->default(0);
            $table->json('discrepancy_details')->nullable();
            $table->json('detailed_records')->nullable(); // Store complete record details for detailed reporting
            $table->string('status')->default('completed'); // completed, failed
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('reconciliation_reports');
    }
}
