<?php

/**
 * File-Based Direct Reconciliation Script
 * Parses a CSV/Excel file and runs reconciliation against database
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use App\Http\Controllers\ReconciliationController;
use Illuminate\Support\Facades\Log;

// Check if file path provided
$filePath = $argv[1] ?? null;

if (!$filePath || !file_exists($filePath)) {
    echo "Usage: php reconcile_file.php <path_to_file>\n";
    echo "Example: php reconcile_file.php /path/to/transactions.csv\n\n";
    echo "Or provide transaction IDs directly in the script.\n";
    exit(1);
}

echo "=== FILE RECONCILIATION REPORT ===\n\n";
echo "File: $filePath\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // Initialize controller
    $controller = new ReconciliationController();
    
    // Use reflection to access private methods
    $reflection = new ReflectionClass($controller);
    
    // Get file extension
    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    
    // Parse file
    $parseMethod = $reflection->getMethod('parseFile');
    $parseMethod->setAccessible(true);
    $documentData = $parseMethod->invoke($controller, $filePath, $extension);
    
    echo "File Parsed Successfully!\n";
    echo "- Total records in file: " . count($documentData) . "\n\n";
    
    // Run reconciliation
    $reconcileMethod = $reflection->getMethod('performTransactionIdPresenceReconciliation');
    $reconcileMethod->setAccessible(true);
    $result = $reconcileMethod->invoke($controller, $documentData);
    
    // Display results
    echo "=== RECONCILIATION RESULTS ===\n\n";
    echo "Uploaded File Records: " . ($result['fileRecords'] ?? $result['totalRecords'] ?? 0) . "\n";
    echo "Matched: " . ($result['matched'] ?? 0) . "\n";
    echo "File-Only (Missing in Database): " . ($result['docOnlyCount'] ?? $result['missing'] ?? 0) . "\n";
    echo "Database-Only (Not in File): " . ($result['dbOnlyCount'] ?? $result['mismatched'] ?? 0) . "\n";
    echo "Total Discrepancies: " . ($result['discrepancies'] ?? 0) . "\n\n";
    
    // Show file-only transactions
    $fileOnlyCount = $result['docOnlyCount'] ?? $result['missing'] ?? 0;
    if ($fileOnlyCount > 0) {
        echo "=== FILE-ONLY TRANSACTIONS (Missing in Database) ===\n";
        $records = $result['records'] ?? [];
        $fileOnlyRecords = array_filter($records, function($r) {
            return ($r['source'] ?? '') === 'document';
        });
        
        $count = 0;
        foreach ($fileOnlyRecords as $record) {
            if ($count >= 20) {
                echo "... and " . ($fileOnlyCount - 20) . " more\n";
                break;
            }
            echo "- Transaction ID: " . ($record['transaction_id'] ?? 'N/A') . "\n";
            $count++;
        }
        echo "\n";
    }
    
    // Show database-only transactions
    $dbOnlyCount = $result['dbOnlyCount'] ?? $result['mismatched'] ?? 0;
    if ($dbOnlyCount > 0) {
        echo "=== DATABASE-ONLY TRANSACTIONS (Not in File) ===\n";
        $records = $result['records'] ?? [];
        $dbOnlyRecords = array_filter($records, function($r) {
            return ($r['source'] ?? '') === 'database';
        });
        
        $count = 0;
        foreach ($dbOnlyRecords as $record) {
            if ($count >= 20) {
                echo "... and " . ($dbOnlyCount - 20) . " more\n";
                break;
            }
            echo "- Transaction ID: " . ($record['transaction_id'] ?? 'N/A') . "\n";
            $count++;
        }
        echo "\n";
    }
    
    echo "=== SUMMARY ===\n";
    if (isset($result['summary'])) {
        foreach ($result['summary'] as $key => $value) {
            echo ucfirst(str_replace('_', ' ', $key)) . ": $value\n";
        }
    }
    
    echo "\n=== END OF REPORT ===\n";
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    exit(1);
}

