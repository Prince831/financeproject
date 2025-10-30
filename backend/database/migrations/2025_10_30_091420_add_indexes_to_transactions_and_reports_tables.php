<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddIndexesToTransactionsAndReportsTables extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add indexes to transactions table for frequently queried fields
        // Note: transaction_id already has unique index from migration
        Schema::table('transactions', function (Blueprint $table) {
            $table->index('transaction_date'); // Date range queries
            $table->index('account_number'); // Account filtering
            $table->index(['transaction_date', 'account_number'], 'transactions_date_account_idx'); // Composite index for period + account queries
            $table->index('status'); // Status filtering
        });

        // Add indexes to reconciliation_reports table
        Schema::table('reconciliation_reports', function (Blueprint $table) {
            $table->index('reference'); // Report lookup
            $table->index('reconciliation_date'); // Date-based queries
            $table->index('reconciliation_mode'); // Mode filtering
            $table->index(['reconciliation_date', 'reconciliation_mode'], 'reports_date_mode_idx'); // Composite for trends
            $table->index('status'); // Status filtering
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Drop indexes from transactions table
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['transaction_date']);
            $table->dropIndex(['account_number']);
            $table->dropIndex('transactions_date_account_idx');
            $table->dropIndex(['status']);
        });

        // Drop indexes from reconciliation_reports table
        Schema::table('reconciliation_reports', function (Blueprint $table) {
            $table->dropIndex(['reference']);
            $table->dropIndex(['reconciliation_date']);
            $table->dropIndex(['reconciliation_mode']);
            $table->dropIndex(['reconciliation_date', 'reconciliation_mode']);
            $table->dropIndex(['status']);
        });
    }
}
