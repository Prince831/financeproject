<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReconciliationRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'reconciliation_date',
        'reconciliation_mode',
        'status',
        'user_name',
        'file_name',
        'file_size',
        'filters',
        'summary',
        'payload',
    ];

    protected $casts = [
        'reconciliation_date' => 'datetime',
        'filters' => 'array',
        'summary' => 'array',
        'payload' => 'array',
    ];
}

