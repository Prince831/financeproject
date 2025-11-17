<?php

/**
 * Direct Reconciliation by Transaction IDs
 * Run reconciliation using transaction IDs from the shared file
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use App\Http\Controllers\ReconciliationController;
use Illuminate\Support\Facades\Log;

// Transaction IDs extracted from the shared file image
// Based on the image description, these are the transaction IDs visible
$fileTransactionIds = [
    '112665PkVZaU1759328572',
    '112664PVjDt51759328582',
    // Add more transaction IDs from your file here
    // The image showed multiple rows with transaction IDs
];

echo "=== DIRECT RECONCILIATION BY TRANSACTION IDS ===\n\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n";
echo "File Transaction IDs: " . count($fileTransactionIds) . "\n\n";

// Get all transaction IDs from database
$dbTransactions = Transaction::select('transaction_id')
    ->get()
    ->pluck('transaction_id')
    ->toArray();

echo "Database Statistics:\n";
echo "- Total transactions in database: " . count($dbTransactions) . "\n\n";

// Find matches and discrepancies
$matched = array_intersect($fileTransactionIds, $dbTransactions);
$fileOnly = array_diff($fileTransactionIds, $dbTransactions);
$dbOnly = array_diff($dbTransactions, $fileTransactionIds);

echo "=== RECONCILIATION RESULTS ===\n\n";
echo "Uploaded File Records: " . count($fileTransactionIds) . "\n";
echo "Matched: " . count($matched) . "\n";
echo "File-Only (Missing in Database): " . count($fileOnly) . "\n";
echo "Database-Only (Not in File): " . count($dbOnly) . "\n";
echo "Total Discrepancies: " . (count($fileOnly) + count($dbOnly)) . "\n\n";

if (!empty($fileOnly)) {
    echo "=== FILE-ONLY TRANSACTIONS (Missing in Database) ===\n";
    foreach ($fileOnly as $id) {
        echo "- Transaction ID: $id\n";
    }
    echo "\n";
}

if (!empty($matched)) {
    echo "=== MATCHED TRANSACTIONS ===\n";
    foreach ($matched as $id) {
        $txn = Transaction::where('transaction_id', $id)->first();
        if ($txn) {
            $amount = $txn->credit_amount > 0 ? $txn->credit_amount : -$txn->debit_amount;
            echo sprintf(
                "- ID: %s | Date: %s | Amount: %.2f | Status: %s\n",
                $id,
                $txn->transaction_date,
                $amount,
                $txn->status ?? 'N/A'
            );
        }
    }
    echo "\n";
}

if (!empty($dbOnly)) {
    echo "=== DATABASE-ONLY TRANSACTIONS (Not in File) ===\n";
    echo "Total: " . count($dbOnly) . " transactions\n";
    
    // Show sample of database-only transactions
    $sampleSize = min(20, count($dbOnly));
    $sampleIds = array_slice($dbOnly, 0, $sampleSize);
    
    $sampleTxns = Transaction::whereIn('transaction_id', $sampleIds)
        ->select('transaction_id', 'transaction_date', 'description', 'debit_amount', 'credit_amount', 'status')
        ->get();
    
    foreach ($sampleTxns as $txn) {
        $amount = $txn->credit_amount > 0 ? $txn->credit_amount : -$txn->debit_amount;
        echo sprintf(
            "- ID: %s | Date: %s | Amount: %.2f | Desc: %s\n",
            $txn->transaction_id,
            $txn->transaction_date,
            $amount,
            substr($txn->description ?? 'N/A', 0, 40)
        );
    }
    
    if (count($dbOnly) > 20) {
        echo "... and " . (count($dbOnly) - 20) . " more database-only transactions\n";
    }
    echo "\n";
}

// Summary statistics
echo "=== SUMMARY STATISTICS ===\n";
$matchRate = count($fileTransactionIds) > 0 
    ? (count($matched) / count($fileTransactionIds)) * 100 
    : 0;
echo "Match Rate: " . number_format($matchRate, 2) . "%\n";
echo "Discrepancy Rate: " . number_format(100 - $matchRate, 2) . "%\n\n";

echo "=== END OF REPORT ===\n";

