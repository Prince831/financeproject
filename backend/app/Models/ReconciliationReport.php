<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReconciliationReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'reconciliation_date',
        'total_debit',
        'total_credit',
        'net_change',
        'reconciliation_mode',
        'period_start',
        'period_end',
        'total_records',
        'matched_records',
        'discrepancies',
        'discrepancy_details',
        'detailed_records',
        'status',
        'unrecognized_count',
    ];

    protected $casts = [
        'reconciliation_date' => 'datetime',
        'period_start' => 'date',
        'period_end' => 'date',
        'total_debit' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'net_change' => 'decimal:2',
        'discrepancy_details' => 'array',
        'detailed_records' => 'array',
        'unrecognized_count' => 'integer',
    ];
}
