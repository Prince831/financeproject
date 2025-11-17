<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\ReconciliationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ReconcileFile extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reconcile:file 
                            {file : Path to the file to reconcile}
                            {--mode=by_transaction_id : Reconciliation mode (by_period or by_transaction_id)}
                            {--start-date= : Start date for period mode}
                            {--end-date= : End date for period mode}
                            {--date-tolerance=0 : Date tolerance in days}
                            {--amount-tolerance=0 : Amount tolerance}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run reconciliation directly on a file against the database';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $filePath = $this->argument('file');
        
        if (!file_exists($filePath)) {
            $this->error("File not found: $filePath");
            return Command::FAILURE;
        }

        $this->info("=== FILE RECONCILIATION ===");
        $this->info("File: $filePath");
        $this->info("File Size: " . number_format(filesize($filePath) / 1024, 2) . " KB");
        $this->info("Date: " . date('Y-m-d H:i:s'));
        $this->newLine();

        try {
            // Create a mock request with the file
            $request = Request::create('/api/reconcile', 'POST', [
                'mode' => $this->option('mode'),
                'start_date' => $this->option('start-date'),
                'end_date' => $this->option('end-date'),
                'date_tolerance' => $this->option('date-tolerance'),
                'amount_tolerance' => $this->option('amount-tolerance'),
            ]);

            // Attach the file to the request
            $request->files->set('file', new \Illuminate\Http\UploadedFile(
                $filePath,
                basename($filePath),
                mime_content_type($filePath),
                null,
                true
            ));

            // Initialize controller
            $controller = new ReconciliationController();
            
            $this->info("Processing file...");
            $this->newLine();

            // Run reconciliation
            $response = $controller->reconcile($request);
            $result = json_decode($response->getContent(), true);

            if (isset($result['error_type'])) {
                $this->error("ERROR: " . ($result['message'] ?? 'Unknown error'));
                if (isset($result['error_details'])) {
                    $this->error("Details: " . json_encode($result['error_details'], JSON_PRETTY_PRINT));
                }
                return Command::FAILURE;
            }

            // Display comprehensive results
            $this->displayResults($result);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("ERROR: " . $e->getMessage());
            $this->error("File: " . $e->getFile());
            $this->error("Line: " . $e->getLine());
            Log::error('Reconciliation command failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Display reconciliation results in a formatted way
     *
     * @param array $result
     * @return void
     */
    private function displayResults(array $result)
    {
        $this->info("=== RECONCILIATION RESULTS ===");
        $this->newLine();

        $fileRecords = $result['fileRecords'] ?? $result['totalRecords'] ?? 0;
        $matched = $result['matched'] ?? 0;
        $fileOnly = $result['docOnlyCount'] ?? $result['missing'] ?? 0;
        $dbOnly = $result['dbOnlyCount'] ?? $result['mismatched'] ?? 0;
        $discrepancies = $result['discrepancies'] ?? 0;

        $this->table(
            ['Metric', 'Count'],
            [
                ['Uploaded File Records', number_format($fileRecords)],
                ['Matched', number_format($matched)],
                ['File-Only (Missing in DB)', number_format($fileOnly)],
                ['Database-Only (Not in File)', number_format($dbOnly)],
                ['Total Discrepancies', number_format($discrepancies)],
                ['Balance Status', $result['balanceStatus'] ?? 'Unknown'],
            ]
        );

        // Calculate and display match rate
        $matchRate = $fileRecords > 0 ? ($matched / $fileRecords) * 100 : 0;
        $this->newLine();
        $this->info("Match Rate: " . number_format($matchRate, 2) . "%");
        $this->info("Discrepancy Rate: " . number_format(100 - $matchRate, 2) . "%");
        $this->newLine();

        // Show file-only transactions (first 20)
        if ($fileOnly > 0) {
            $this->warn("=== FILE-ONLY TRANSACTIONS (Missing in Database) ===");
            $records = $result['records'] ?? [];
            $fileOnlyRecords = array_filter($records, function($r) {
                return ($r['source'] ?? '') === 'document';
            });

            $count = 0;
            $tableData = [];
            foreach ($fileOnlyRecords as $record) {
                if ($count >= 20) {
                    $this->comment("... and " . ($fileOnly - 20) . " more file-only transactions");
                    break;
                }
                $tableData[] = [
                    $record['transaction_id'] ?? 'N/A',
                    $record['status'] ?? 'Missing in database'
                ];
                $count++;
            }

            if (!empty($tableData)) {
                $this->table(['Transaction ID', 'Status'], $tableData);
            }
            $this->newLine();
        }

        // Show database-only transactions (first 20)
        if ($dbOnly > 0) {
            $this->warn("=== DATABASE-ONLY TRANSACTIONS (Not in File) ===");
            $records = $result['records'] ?? [];
            $dbOnlyRecords = array_filter($records, function($r) {
                return ($r['source'] ?? '') === 'database';
            });

            $count = 0;
            $tableData = [];
            foreach ($dbOnlyRecords as $record) {
                if ($count >= 20) {
                    $this->comment("... and " . ($dbOnly - 20) . " more database-only transactions");
                    break;
                }
                $tableData[] = [
                    $record['transaction_id'] ?? 'N/A',
                    $record['status'] ?? 'Missing in uploaded file'
                ];
                $count++;
            }

            if (!empty($tableData)) {
                $this->table(['Transaction ID', 'Status'], $tableData);
            }
            $this->newLine();
        }

        // Summary
        if (isset($result['summary'])) {
            $this->info("=== FINANCIAL SUMMARY ===");
            $summaryData = [];
            foreach ($result['summary'] as $key => $value) {
                $summaryData[] = [ucfirst(str_replace('_', ' ', $key)), $value];
            }
            $this->table(['Metric', 'Value'], $summaryData);
            $this->newLine();
        }

        // Reference
        if (isset($result['reference'])) {
            $this->info("Reconciliation Reference: " . $result['reference']);
            $this->comment("This reference can be used to retrieve the full report later.");
            $this->newLine();
        }

        $this->info("=== END OF REPORT ===");
    }
}

