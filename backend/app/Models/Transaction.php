<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'account_number',
        'account_name',
        'debit_amount',
        'credit_amount',
        'transaction_type',
        'transaction_date',
        'description',
        'reference_number',
        'balance',
        'status'
    ];

    protected $casts = [
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'transaction_date' => 'date'
    ];
}
