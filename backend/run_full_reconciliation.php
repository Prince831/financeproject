#!/usr/bin/env php
<?php

/**
 * Full File Reconciliation Script
 * Wrapper script that uses the integrated Artisan command
 * 
 * This script is now integrated into the main reconciliation process.
 * Use: php run_full_reconciliation.php <file_path>
 * Or use the Artisan command directly: php artisan reconcile:file <file_path>
 */

$filePath = $argv[1] ?? null;

if (!$filePath) {
    echo "=== FULL FILE RECONCILIATION ===\n\n";
    echo "Usage: php run_full_reconciliation.php <file_path> [options]\n";
    echo "Example: php run_full_reconciliation.php /path/to/your/file.csv\n\n";
    echo "Options:\n";
    echo "  --mode=by_transaction_id    Reconciliation mode (default: by_transaction_id)\n";
    echo "  --start-date=YYYY-MM-DD    Start date for period mode\n";
    echo "  --end-date=YYYY-MM-DD      End date for period mode\n";
    echo "  --date-tolerance=N         Date tolerance in days (default: 0)\n";
    echo "  --amount-tolerance=N       Amount tolerance (default: 0)\n\n";
    echo "The file should be CSV or Excel format with transaction data.\n";
    echo "Required columns: Transaction ID, Date, Amount\n\n";
    echo "Alternatively, use the Artisan command directly:\n";
    echo "  php artisan reconcile:file <file_path> [options]\n\n";
    exit(1);
}

if (!file_exists($filePath)) {
    echo "ERROR: File not found: $filePath\n";
    exit(1);
}

// Build command arguments
$command = "php artisan reconcile:file \"$filePath\"";
foreach (array_slice($argv, 2) as $arg) {
    $command .= " " . escapeshellarg($arg);
}

// Execute the Artisan command
passthru($command, $returnCode);
exit($returnCode);

