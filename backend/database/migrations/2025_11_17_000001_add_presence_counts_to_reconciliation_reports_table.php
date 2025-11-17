<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('reconciliation_reports', function (Blueprint $table) {
            $table->unsignedBigInteger('file_records')->nullable()->after('period_end');
            $table->unsignedBigInteger('doc_only_count')->nullable()->after('file_records');
            $table->unsignedBigInteger('db_only_count')->nullable()->after('doc_only_count');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('reconciliation_reports', function (Blueprint $table) {
            $table->dropColumn(['file_records', 'doc_only_count', 'db_only_count']);
        });
    }
};

