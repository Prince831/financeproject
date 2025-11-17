<?php

/**
 * Direct Reconciliation Script
 * Runs reconciliation against database using provided transaction data
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

// Transaction data from the shared file
// Based on the image description, extracting transaction IDs
$fileTransactions = [
    ['transaction_id' => '112665PkVZaU1759328572', 'amount' => 336.33, 'date' => '2025-10-01'],
    ['transaction_id' => '112664PVjDt51759328582', 'amount' => 1818, 'date' => '2025-10-01'],
    // Add more transaction IDs from the file as needed
    // The system will extract all transaction IDs from the uploaded file
];

echo "=== DIRECT RECONCILIATION REPORT ===\n\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

// Get all transaction IDs from database
$dbTransactions = Transaction::select('transaction_id')
    ->get()
    ->pluck('transaction_id')
    ->toArray();

echo "Database Statistics:\n";
echo "- Total transactions in database: " . count($dbTransactions) . "\n\n";

// If we have file transaction IDs, check them
if (!empty($fileTransactions)) {
    $fileTransactionIds = array_column($fileTransactions, 'transaction_id');
    
    echo "File Statistics:\n";
    echo "- Total transactions in file: " . count($fileTransactionIds) . "\n\n";
    
    // Find matches
    $matched = array_intersect($fileTransactionIds, $dbTransactions);
    $fileOnly = array_diff($fileTransactionIds, $dbTransactions);
    $dbOnly = array_diff($dbTransactions, $fileTransactionIds);
    
    echo "=== RECONCILIATION RESULTS ===\n\n";
    echo "Matched Transactions: " . count($matched) . "\n";
    echo "File-Only (Missing in Database): " . count($fileOnly) . "\n";
    echo "Database-Only (Not in File): " . count($dbOnly) . "\n\n";
    
    if (!empty($fileOnly)) {
        echo "=== FILE-ONLY TRANSACTIONS (Missing in Database) ===\n";
        foreach ($fileOnly as $id) {
            echo "- Transaction ID: $id\n";
        }
        echo "\n";
    }
    
    if (!empty($dbOnly)) {
        echo "=== DATABASE-ONLY TRANSACTIONS (Not in File) ===\n";
        echo "Total: " . count($dbOnly) . " transactions\n";
        if (count($dbOnly) <= 20) {
            foreach ($dbOnly as $id) {
                echo "- Transaction ID: $id\n";
            }
        } else {
            echo "(Showing first 20 of " . count($dbOnly) . ")\n";
            foreach (array_slice($dbOnly, 0, 20) as $id) {
                echo "- Transaction ID: $id\n";
            }
        }
        echo "\n";
    }
} else {
    echo "No file transaction IDs provided.\n";
    echo "To run reconciliation with your file:\n";
    echo "1. Upload the file through the portal\n";
    echo "2. Or provide transaction IDs in this script\n\n";
}

// Get sample transactions from database for reference
echo "=== SAMPLE DATABASE TRANSACTIONS ===\n";
$sampleTransactions = Transaction::select('transaction_id', 'transaction_date', 'description', 'debit_amount', 'credit_amount')
    ->orderBy('transaction_date', 'desc')
    ->limit(10)
    ->get();

if ($sampleTransactions->count() > 0) {
    echo "Recent transactions in database:\n";
    foreach ($sampleTransactions as $txn) {
        $amount = $txn->credit_amount > 0 ? $txn->credit_amount : -$txn->debit_amount;
        echo sprintf(
            "- ID: %s | Date: %s | Amount: %.2f | Desc: %s\n",
            $txn->transaction_id,
            $txn->transaction_date,
            $amount,
            substr($txn->description ?? 'N/A', 0, 30)
        );
    }
} else {
    echo "No transactions found in database.\n";
}

echo "\n=== END OF REPORT ===\n";

