<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\ReconciliationRun;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Smalot\PdfParser\Parser;

class ReconciliationController extends Controller
{
    /**
     * Persist a full reconciliation payload.
     */
    private function storeReconciliationRun(
        array $result,
        string $mode,
        ?string $startDate,
        ?string $endDate,
        ?string $fileName,
        ?int $fileSize,
        string $reference,
        string $status = 'completed'
    ): ?ReconciliationRun {
        try {
            $summary = [
                'totalRecords' => $result['totalRecords'] ?? null,
                'matched' => $result['matched'] ?? null,
                'docOnlyCount' => $result['docOnlyCount'] ?? $result['missing'] ?? null,
                'dbOnlyCount' => $result['dbOnlyCount'] ?? $result['mismatched'] ?? null,
                'discrepancies' => $result['discrepancies'] ?? null,
                'balanceStatus' => $result['balanceStatus'] ?? null,
                'totalDebitVariance' => $result['totalDebitVariance'] ?? null,
                'totalCreditVariance' => $result['totalCreditVariance'] ?? null,
                'netVariance' => $result['netVariance'] ?? null,
                'fileRecords' => $result['fileRecords'] ?? null,
            ];

            return ReconciliationRun::create([
                'reference' => $reference,
                'reconciliation_date' => now(),
                'reconciliation_mode' => $mode,
                'status' => $status,
                'user_name' => $result['user'] ?? null,
                'file_name' => $fileName,
                'file_size' => $fileSize,
                'filters' => array_filter([
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ]),
                'summary' => $summary,
                'payload' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to store reconciliation run', [
                'reference' => $reference,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Update reconciliation progress
     *
     * @param string $sessionId
     * @param array $progress
     */
    private function updateProgress($sessionId, $progress)
    {
        Cache::put("reconciliation_progress_{$sessionId}", $progress, 300); // 5 minutes
    }

    /**
     * Get reconciliation progress
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProgress(Request $request)
    {
        $sessionId = $request->input('session_id');
        if (!$sessionId) {
            return response()->json(['error' => 'Session ID required'], 400);
        }

        $progress = Cache::get("reconciliation_progress_{$sessionId}", [
            'step' => 'idle',
            'progress' => 0,
            'message' => 'Ready to start',
            'completed' => false
        ]);

        return response()->json($progress);
    }

    /**
     * Handle manual reconciliation (without file upload)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function reconcileManual(Request $request)
    {
        $startTime = microtime(true);

        try {
            Log::info('Starting manual reconciliation process', [
                'mode' => $request->input('mode'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'date_tolerance' => $request->input('date_tolerance'),
                'amount_tolerance' => $request->input('amount_tolerance'),
                'use_entire_document' => $request->input('use_entire_document')
            ]);

            $request->validate([
                'mode' => 'required|in:by_period,by_transaction_id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
                'date_tolerance' => 'nullable|numeric|min:0',
                'amount_tolerance' => 'nullable|numeric|min:0',
                'use_entire_document' => 'nullable|boolean'
            ]);

            $mode = $request->input('mode');
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');

            // For manual reconciliation, we need to get all transactions and compare them
            // This simulates comparing the current database state against itself
            // In a real scenario, this would compare against uploaded data or external system

            $dbRecords = \App\Models\Transaction::select(['transaction_id', 'account_number', 'account_name', 'description', 'reference_number', 'debit_amount', 'credit_amount', 'balance', 'transaction_type', 'status', 'transaction_date'])
                ->get()
                ->keyBy('transaction_id');

            // For manual reconciliation, we'll simulate finding discrepancies by checking for data consistency
            $result = $this->performManualReconciliation($dbRecords, $mode, $startDate, $endDate);

            // Add metadata
            $result['comparisonTime'] = round(microtime(true) - $startTime, 2) . ' seconds';
            $result['timestamp'] = now()->toISOString();
            $result['user'] = $request->user() ? $request->user()->name : 'Anonymous User';

            // Save reconciliation report to database
            $reference = 'MANUAL-' . now()->format('Ymd-His') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));

            // Debug logging
            Log::info('Creating reconciliation report', [
                'reference' => $reference,
                'total_debit' => $result['totalDebitVariance'] ?? 0,
                'total_credit' => $result['totalCreditVariance'] ?? 0,
                'net_change' => $result['netVariance'] ?? 0,
                'total_records' => $result['totalRecords'],
                'discrepancies' => $result['discrepancies'],
                'records_count' => count($result['records'] ?? []),
            ]);

            $this->storeReconciliationRun(
                $result,
                $mode,
                $startDate,
                $endDate,
                null,
                null,
                $reference
            );

            // Add reference to result
            $result['reference'] = $reference;

            Log::info('Manual reconciliation completed successfully', [
                'reference' => $reference,
                'totalRecords' => $result['totalRecords'],
                'discrepancies' => $result['discrepancies'],
                'user' => $result['user']
            ]);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Manual reconciliation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);

            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);

            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'reconciliation_processing_error',
                'error_details' => [
                    'type' => get_class($e),
                    'line' => $e->getLine(),
                    'file' => basename($e->getFile())
                ]
            ], 500);
        }
    }

    private function performManualReconciliation($dbRecords, $mode = 'by_period', $startDate = null, $endDate = null)
    {
        $totalRecords = $dbRecords->count();
        $matched = 0;
        $discrepancies = 0;
        $missing = 0;
        $mismatched = 0;
        $critical = 0;
        $high = 0;
        $medium = 0;
        $low = 0;
        $totalDebitVariance = 0;
        $totalCreditVariance = 0;
        $records = [];
        $detailedRecords = [];

        // For manual reconciliation, we'll check for data consistency issues
        foreach ($dbRecords as $recordId => $dbRecord) {
            $matched++;

            $completeRecordData = [
                'transaction_id' => $recordId,
                'document_record' => null, // No document for manual reconciliation
                'database_record' => $dbRecord->toArray(),
                'discrepancies' => []
            ];
            // For manual reconciliation we only highlight discrepancies when there is something to compare.
            // Since there is no uploaded document, we skip data-quality heuristics and only include records
            // when explicit discrepancies are identified elsewhere in the process.
            if (!empty($completeRecordData['discrepancies'])) {
                $detailedRecords[] = $completeRecordData;
            }
        }

        $netVariance = $totalDebitVariance + $totalCreditVariance;
        $balanceStatus = abs($netVariance) < 0.01 ? 'In Balance' : 'Out of Balance';

        if (empty($records)) {
            $records[] = [
                'id' => 'SUMMARY',
                'field' => 'Summary',
                'documentValue' => 'All records reconciled',
                'databaseValue' => 'All records reconciled',
                'difference' => 'No discrepancies detected between uploaded document and database',
                'type' => 'Summary',
                'severity' => 'info',
                'account' => null,
                'fieldKey' => null,
                'documentRawValue' => null,
                'databaseRawValue' => null,
                'documentRecord' => null,
                'databaseRecord' => null,
            ];
        }

        if (empty($detailedRecords)) {
            $detailedRecords[] = [
                'transaction_id' => 'SUMMARY',
                'document_record' => null,
                'database_record' => null,
                'discrepancies' => [],
            ];
        }

        return [
            'totalRecords' => $totalRecords,
            'matched' => $matched,
            'discrepancies' => $discrepancies,
            'missing' => $missing,
            'mismatched' => $mismatched,
            'critical' => $critical,
            'high' => $high,
            'medium' => $medium,
            'low' => $low,
            'totalDebitVariance' => $totalDebitVariance,
            'totalCreditVariance' => $totalCreditVariance,
            'netVariance' => $netVariance,
            'balanceStatus' => $balanceStatus,
            'records' => $records,
            'detailedRecords' => $detailedRecords,
            'fileRecords' => $totalRecords, // For manual reconciliation, all records are from DB
            'docOnlyCount' => 0, // Manual reconciliation doesn't have uploaded file
            'dbOnlyCount' => 0 // All records are in DB for manual reconciliation
        ];
    }

    /**
     * Handle file reconciliation
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function reconcile(Request $request)
    {
        $startTime = microtime(true);
        $sessionId = $request->input('session_id', uniqid('rec_', true));

        try {
            Log::info('Starting reconciliation process', [
                'has_file' => $request->hasFile('file'),
                'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'No file',
                'mode' => $request->input('mode'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'session_id' => $sessionId,
                'all_input' => $request->all()
            ]);

            // Log system state before processing
            Log::info('System state before reconciliation', [
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'php_version' => PHP_VERSION,
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
                'max_execution_time' => ini_get('max_execution_time'),
                'memory_limit' => ini_get('memory_limit'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size')
            ]);

            // Initialize progress
            $this->updateProgress($sessionId, [
                'step' => 'initializing',
                'progress' => 5,
                'message' => 'Initializing reconciliation process...',
                'completed' => false
            ]);

            try {
                $request->validate([
                    'file' => 'required|file|mimes:xlsx,xls,csv,txt,pdf|max:5120', // 5MB max for faster processing
                    'mode' => 'required|in:by_period,by_transaction_id',
                    'start_date' => 'nullable|date|required_if:mode,by_period',
                    'end_date' => 'nullable|date|required_if:mode,by_period|after_or_equal:start_date',
                ], [
                    'file.required' => 'A file must be uploaded for reconciliation.',
                    'file.file' => 'The uploaded item must be a valid file.',
                    'file.mimes' => 'Only CSV, XLS, XLSX, TXT, and PDF files are accepted.',
                    'file.max' => 'File size must not exceed 5MB.',
                    'mode.required' => 'Reconciliation mode is required.',
                    'mode.in' => 'Invalid reconciliation mode selected.',
                    'start_date.date' => 'Start date must be a valid date.',
                    'start_date.required_if' => 'Start date is required when using period-based reconciliation.',
                    'end_date.date' => 'End date must be a valid date.',
                    'end_date.required_if' => 'End date is required when using period-based reconciliation.',
                    'end_date.after_or_equal' => 'End date must be on or after the start date.',
                ]);

                // For period mode, dates are optional if using entire document
                if ($request->input('mode') === 'by_period' && !$request->has(['start_date', 'end_date'])) {
                    // Allow period mode without dates (entire document mode)
                }
            } catch (\Illuminate\Validation\ValidationException $e) {
                Log::error('Validation failed', [
                    'errors' => $e->errors(),
                    'file' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : null
                ]);

                $userFriendlyErrors = $this->formatValidationErrors($e->errors());

                return response()->json([
                    'message' => 'Please correct the following issues and try again.',
                    'error_type' => 'validation_error',
                    'validation_errors' => $userFriendlyErrors,
                    'details' => $e->errors()
                ], 422);
            }

            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());
            $mode = $request->input('mode');

            Log::info('File validation passed', [
                'file_name' => $file->getClientOriginalName(),
                'extension' => $extension,
                'size' => $file->getSize(),
                'mode' => $mode
            ]);

            // Update progress: File upload complete
            $this->updateProgress($sessionId, [
                'step' => 'upload_complete',
                'progress' => 15,
                'message' => 'File uploaded successfully, preparing for processing...',
                'completed' => false
            ]);

            // Store file temporarily
            $path = $file->store('temp', 'local');
            $fullPath = storage_path('app/' . $path);

            Log::info('File stored temporarily', ['path' => $path, 'full_path' => $fullPath]);

            // Update progress: File storage complete
            $this->updateProgress($sessionId, [
                'step' => 'file_stored',
                'progress' => 25,
                'message' => 'File stored securely, starting parsing...',
                'completed' => false
            ]);

            // Parse file based on type
            Log::info('Starting file parsing', [
                'file_path' => $fullPath,
                'extension' => $extension,
                'file_exists' => file_exists($fullPath),
                'file_size' => file_exists($fullPath) ? filesize($fullPath) : 'unknown',
                'file_readable' => file_exists($fullPath) ? is_readable($fullPath) : 'unknown'
            ]);

            $documentData = $this->parseFile($fullPath, $extension);

            Log::info('File parsed successfully', [
                'record_count' => count($documentData),
                'sample_record' => !empty($documentData) ? array_slice($documentData, 0, 1) : null,
                'memory_after_parsing' => memory_get_usage(true),
                'parsing_time' => round(microtime(true) - $startTime, 2) . ' seconds'
            ]);

            // Update progress: Parsing complete
            $this->updateProgress($sessionId, [
                'step' => 'parsing_complete',
                'progress' => 45,
                'message' => 'File parsed successfully (' . count($documentData) . ' records found), validating data...',
                'completed' => false
            ]);

            if (empty($documentData)) {
                throw new \Exception('No data found in uploaded file');
            }

            // Validate file content structure and required columns
            $this->validateFileContent($documentData);

            // Update progress: Validation complete
            $this->updateProgress($sessionId, [
                'step' => 'validation_complete',
                'progress' => 55,
                'message' => 'Data validation completed, preparing for reconciliation...',
                'completed' => false
            ]);

            // Only limit processing for period-based reconciliation to maintain performance
        if ($mode === 'by_period' && count($documentData) > 500) {
            $documentData = array_slice($documentData, 0, 500);
            Log::info('File truncated to 500 records for period-based reconciliation performance', ['original_count' => count($documentData)]);
        }

            // Update progress: Starting reconciliation
            $this->updateProgress($sessionId, [
                'step' => 'reconciliation_start',
                'progress' => 65,
                'message' => 'Starting reconciliation process...',
                'completed' => false
            ]);

            // Perform reconciliation against database
            Log::info('Starting reconciliation processing', [
                'document_records_count' => count($documentData),
                'mode' => $mode,
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'memory_before_reconciliation' => memory_get_usage(true)
            ]);

            $result = $this->performReconciliation($documentData, $mode, $request->input('start_date'), $request->input('end_date'));

            Log::info('Reconciliation processing completed', [
                'result_summary' => [
                    'total_records' => $result['totalRecords'] ?? 0,
                    'matched' => $result['matched'] ?? 0,
                    'discrepancies' => $result['discrepancies'] ?? 0,
                    'net_variance' => $result['netVariance'] ?? 0
                ],
                'processing_time' => round(microtime(true) - $startTime, 2) . ' seconds',
                'memory_after_reconciliation' => memory_get_usage(true)
            ]);

            // Update progress: Reconciliation processing
            $this->updateProgress($sessionId, [
                'step' => 'reconciliation_processing',
                'progress' => 85,
                'message' => 'Processing reconciliation data...',
                'completed' => false
            ]);

            // Add metadata
            $result['comparisonTime'] = round(microtime(true) - $startTime, 2) . ' seconds';
            $result['timestamp'] = now()->toISOString();
            $result['user'] = $request->user() ? $request->user()->name : 'Anonymous User';

            // Save reconciliation report to database
            $reference = 'REC-' . now()->format('Ymd-His') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));

            // Optimize data storage to prevent packet size issues
            $discrepancyDetails = $result['records'] ?? [];
            $detailedRecords = $result['detailedRecords'] ?? [];

            // Limit stored data size to prevent database packet issues
            $maxDiscrepancies = 100; // Limit to first 100 discrepancies
            if (count($discrepancyDetails) > $maxDiscrepancies) {
                $discrepancyDetails = array_slice($discrepancyDetails, 0, $maxDiscrepancies);
                Log::info('Truncated discrepancy details for database storage', [
                    'original_count' => count($result['records']),
                    'stored_count' => $maxDiscrepancies
                ]);
            }

            // For detailed records, only store summary information
            $optimizedDetailedRecords = [];
            foreach (($result['detailedRecords'] ?? []) as $record) {
                $optimizedDetailedRecords[] = [
                    'transaction_id' => $record['transaction_id'] ?? null,
                    'has_discrepancies' => !empty($record['discrepancies']),
                    'discrepancy_count' => count($record['discrepancies'] ?? [])
                ];
            }

            $this->storeReconciliationRun(
                $result,
                $mode,
                $request->input('start_date'),
                $request->input('end_date'),
                $file->getClientOriginalName(),
                $file->getSize(),
                $reference
            );

            // Add reference to result
            $result['reference'] = $reference;

            // Clean up temp file
            Storage::disk('local')->delete($path);

            // Update progress: Complete
            $this->updateProgress($sessionId, [
                'step' => 'complete',
                'progress' => 100,
                'message' => 'Reconciliation completed successfully! Found ' . ($result['discrepancies'] ?? 0) . ' discrepancies.',
                'completed' => true,
                'result' => $result
            ]);

            Log::info('Reconciliation completed successfully', [
                'file' => $file->getClientOriginalName(),
                'reference' => $reference,
                'totalRecords' => $result['totalRecords'],
                'discrepancies' => $result['discrepancies'],
                'user' => $result['user']
            ]);

            return response()->json($result);

        } catch (\Exception $e) {
            // Update progress: Error occurred
            $this->updateProgress($sessionId, [
                'step' => 'error',
                'progress' => 0,
                'message' => 'Reconciliation failed: ' . $this->getUserFriendlyErrorMessage($e),
                'completed' => false,
                'error' => true
            ]);

            Log::error('Reconciliation failed', [
                'error' => $e->getMessage(),
                'file' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'Unknown',
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file_path' => $e->getFile(),
                'session_id' => $sessionId,
                'processing_time' => round(microtime(true) - $startTime, 2) . ' seconds',
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'request_data' => [
                    'mode' => $request->input('mode'),
                    'start_date' => $request->input('start_date'),
                    'end_date' => $request->input('end_date'),
                    'has_file' => $request->hasFile('file'),
                    'file_size' => $request->hasFile('file') ? $request->file('file')->getSize() : null
                ]
            ]);

            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);

            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'reconciliation_processing_error',
                'error_details' => [
                    'type' => get_class($e),
                    'line' => $e->getLine(),
                    'file' => basename($e->getFile()),
                    'session_id' => $sessionId,
                    'processing_time' => round(microtime(true) - $startTime, 2) . ' seconds'
                ]
            ], 500);
        }
    }

    private function parseFile($filePath, $extension)
    {
        switch ($extension) {
            case 'csv':
            case 'txt':
                return $this->parseCsv($filePath);
            case 'xlsx':
            case 'xls':
                return $this->parseExcel($filePath);
            case 'pdf':
                return $this->parsePdf($filePath);
            default:
                throw new \Exception('Unsupported file type. Only CSV, TXT, Excel, and PDF files are accepted.');
        }
    }

    /**
     * Validate file content structure and required columns
     *
     * @param array $documentData
     * @throws \Exception
     */
    private function validateFileContent($documentData)
    {
        if (empty($documentData)) {
            throw new \Exception('File contains no data rows');
        }

        // Get headers from first row
        $firstRow = $documentData[0];
        $headers = array_keys($firstRow);

        if (empty($headers)) {
            throw new \Exception('File contains no valid column headers');
        }

        // Define required columns (case-insensitive variations)
        $requiredColumns = [
            'transaction_id' => ['transaction_id', 'id', 'transaction id', 'txn id', 'transactionid'],
            'date' => ['date', 'transaction_date', 'transaction date', 'txn_date', 'txndate'],
            'amount' => ['amount', 'debit_amount', 'credit_amount', 'debit amount', 'credit amount', 'amt']
        ];

        $missingColumns = [];

        // Check for required columns
        foreach ($requiredColumns as $field => $possibleNames) {
            $found = false;
            foreach ($possibleNames as $name) {
                if (in_array(strtolower($name), array_map('strtolower', $headers))) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $missingColumns[] = ucfirst(str_replace('_', ' ', $field)) . ' (possible names: ' . implode(', ', $possibleNames) . ')';
            }
        }

        if (!empty($missingColumns)) {
            throw new \Exception('Missing required columns: ' . implode('; ', $missingColumns) . '. Please ensure your file includes Transaction ID, Date, and Amount columns.');
        }

        // Validate data structure for first few rows (sample validation)
        $sampleSize = min(10, count($documentData)); // Check first 10 rows or all if less
        $validationErrors = [];

        for ($i = 0; $i < $sampleSize; $i++) {
            $row = $documentData[$i];
            $rowNumber = $i + 1;

            // Validate Transaction ID (but don't fail - we'll handle missing IDs in processing)
            $transactionId = null;
            foreach (['transaction_id', 'id', 'Transaction ID', 'Txn ID', 'Transaction Id'] as $key) {
                if (isset($row[$key])) {
                    $transactionId = $row[$key];
                    break;
                }
            }

            // Note: We no longer fail validation for missing transaction IDs
            // They will be processed as discrepancies instead
            if (empty($transactionId)) {
                Log::info("Row {$rowNumber}: Missing Transaction ID - will be processed as discrepancy");
            }

            // Validate Date
            $dateValue = null;
            foreach (['date', 'transaction_date', 'Date', 'Transaction Date'] as $key) {
                if (isset($row[$key])) {
                    $dateValue = $row[$key];
                    break;
                }
            }

            if (!empty($dateValue)) {
                // Try to parse date
                $parsedDate = date_parse($dateValue);
                if ($parsedDate['error_count'] > 0 || !checkdate($parsedDate['month'], $parsedDate['day'], $parsedDate['year'])) {
                    $validationErrors[] = "Row {$rowNumber}: Invalid date format '{$dateValue}'";
                }
            }

            // Validate Amount fields
            $amountFields = ['amount', 'Amount', 'debit_amount', 'credit_amount', 'Debit Amount', 'Credit Amount'];
            $hasValidAmount = false;

            foreach ($amountFields as $field) {
                if (isset($row[$field]) && is_numeric($row[$field])) {
                    $hasValidAmount = true;
                    break;
                }
            }

            // Check for C/D + Amount combination
            $cdField = null;
            $amountField = null;
            foreach (['c/d', 'C/D', 'type', 'Type'] as $key) {
                if (isset($row[$key])) {
                    $cdField = $key;
                    break;
                }
            }
            foreach (['amount', 'Amount'] as $key) {
                if (isset($row[$key])) {
                    $amountField = $key;
                    break;
                }
            }

            if ($cdField && $amountField && is_numeric($row[$amountField])) {
                $cdValue = strtoupper(trim($row[$cdField]));
                if (in_array($cdValue, ['C', 'D'])) {
                    $hasValidAmount = true;
                }
            }

            if (!$hasValidAmount) {
                $validationErrors[] = "Row {$rowNumber}: No valid amount field found";
            }
        }

        if (!empty($validationErrors)) {
            throw new \Exception('Data validation errors: ' . implode('; ', array_slice($validationErrors, 0, 5))); // Show first 5 errors
        }

        Log::info('File content validation passed', [
            'total_rows' => count($documentData),
            'columns_found' => $headers
        ]);
    }

    private function parseCsv($filePath)
    {
        Log::info('Starting CSV parsing', ['file_path' => $filePath]);

        $data = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            // Read first line to detect delimiter
            $firstLine = fgets($handle);
            if ($firstLine === false) {
                fclose($handle);
                throw new \Exception('Empty file');
            }

            // Detect delimiter by counting occurrences
            $tabCount = substr_count($firstLine, "\t");
            $commaCount = substr_count($firstLine, ",");

            $delimiter = $tabCount > $commaCount ? "\t" : ",";
            Log::info('Detected delimiter', ['delimiter' => $delimiter === "\t" ? 'tab' : 'comma', 'tab_count' => $tabCount, 'comma_count' => $commaCount]);

            // Reset file pointer to beginning
            rewind($handle);

            // Skip BOM if present
            $bom = fread($handle, 3);
            if ($bom !== "\xef\xbb\xbf") {
                rewind($handle);
            }

            $headers = fgetcsv($handle, 1000, $delimiter);
            Log::info('CSV headers read', ['headers' => $headers]);

            if (!$headers || empty(array_filter($headers))) {
                fclose($handle);
                throw new \Exception('Invalid CSV format: No valid headers found');
            }

            // Clean headers
            $headers = array_map('trim', $headers);
            Log::info('Headers cleaned', ['clean_headers' => $headers]);

            $rowCount = 0;
            while (($row = fgetcsv($handle, 1000, $delimiter)) !== false) {
                $rowCount++;
                Log::info('Processing row', ['row_number' => $rowCount, 'row_data' => $row]);

                // Skip empty rows
                if (empty(array_filter($row))) {
                    Log::info('Skipping empty row', ['row_number' => $rowCount]);
                    continue;
                }

                // Pad or truncate row to match headers count
                $rowDataCount = count($row);
                $headerCount = count($headers);

                if ($rowDataCount < $headerCount) {
                    $row = array_pad($row, $headerCount, '');
                    Log::info('Padded row', ['original_count' => $rowDataCount, 'padded_count' => count($row)]);
                } elseif ($rowDataCount > $headerCount) {
                    $row = array_slice($row, 0, $headerCount);
                    Log::info('Truncated row', ['original_count' => $rowDataCount, 'truncated_count' => count($row)]);
                }

                $combined = array_combine($headers, $row);
                Log::info('Row combined', ['combined_data' => $combined]);
                $data[] = $combined;
            }
            fclose($handle);
            Log::info('CSV parsing completed', ['total_rows' => count($data)]);
        } else {
            throw new \Exception('Could not open CSV file for reading');
        }

        if (empty($data)) {
            throw new \Exception('CSV file contains no data rows');
        }

        return $data;
    }

    private function parseExcel($filePath)
    {
        // Using Maatwebsite\Excel to parse Excel files
        $data = Excel::toArray([], $filePath);
        if (empty($data) || empty($data[0])) {
            return [];
        }

        $headers = array_shift($data[0]);
        $rows = [];
        foreach ($data[0] as $row) {
            if (count($row) === count($headers)) {
                $rows[] = array_combine($headers, $row);
            }
        }
        return $rows;
    }

    private function parsePdf($filePath)
    {
        Log::info('Starting PDF parsing', ['file_path' => $filePath]);

        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($filePath);

            $text = '';
            // Extract text from all pages
            foreach ($pdf->getPages() as $page) {
                $text .= $page->getText() . "\n";
            }

            Log::info('PDF text extracted', ['text_length' => strlen($text)]);

            // Parse the extracted text to find transaction data
            $transactions = $this->parsePdfText($text);

            Log::info('PDF parsing completed', ['transaction_count' => count($transactions)]);
            return $transactions;

        } catch (\Exception $e) {
            Log::error('PDF parsing failed', [
                'error' => $e->getMessage(),
                'file_path' => $filePath
            ]);
            throw new \Exception('Failed to parse PDF: ' . $e->getMessage());
        }
    }

    private function parsePdfText($text)
    {
        $transactions = [];
        $lines = explode("\n", $text);

        // Common patterns for bank statement transactions
        $datePattern = '/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/';
        $amountPattern = '/(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})/';
        $transactionIdPattern = '/(TXN\d+|TRN\d+|REF\d+|\d{6,})/';

        $currentTransaction = [];
        $inTransactionBlock = false;

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Look for date at the beginning of the line (indicates start of transaction)
            if (preg_match($datePattern, $line, $dateMatches)) {
                // Save previous transaction if exists
                if (!empty($currentTransaction)) {
                    $transactions[] = $currentTransaction;
                }

                // Start new transaction
                $currentTransaction = [
                    'transaction_date' => $this->normalizeDate($dateMatches[1]),
                    'description' => '',
                    'debit_amount' => 0,
                    'credit_amount' => 0,
                    'balance' => 0,
                    'transaction_id' => '',
                    'reference_number' => ''
                ];

                // Remove date from line for further processing
                $line = preg_replace($datePattern, '', $line);
                $inTransactionBlock = true;
            }

            if ($inTransactionBlock && !empty($currentTransaction)) {
                // Look for amounts in the line
                if (preg_match_all($amountPattern, $line, $amountMatches)) {
                    $amounts = $amountMatches[1];

                    // Typically, bank statements have debit, credit, balance
                    if (count($amounts) >= 1) {
                        // Try to determine which amount is which based on position and context
                        $lineLower = strtolower($line);

                        if (strpos($lineLower, 'debit') !== false || strpos($lineLower, 'dr') !== false) {
                            $currentTransaction['debit_amount'] = (float) str_replace(',', '', $amounts[0]);
                        } elseif (strpos($lineLower, 'credit') !== false || strpos($lineLower, 'cr') !== false) {
                            $currentTransaction['credit_amount'] = (float) str_replace(',', '', $amounts[0]);
                        } elseif (strpos($lineLower, 'balance') !== false || strpos($lineLower, 'bal') !== false) {
                            $currentTransaction['balance'] = (float) str_replace(',', '', $amounts[0]);
                        } else {
                            // If no specific indicators, assume first amount is debit/credit, second is balance
                            if (count($amounts) >= 2) {
                                $currentTransaction['debit_amount'] = (float) str_replace(',', '', $amounts[0]);
                                $currentTransaction['balance'] = (float) str_replace(',', '', $amounts[1]);
                            } elseif (count($amounts) === 1) {
                                // Single amount - could be debit or credit, check if negative
                                $amount = (float) str_replace(',', '', $amounts[0]);
                                if ($amount < 0) {
                                    $currentTransaction['debit_amount'] = abs($amount);
                                } else {
                                    $currentTransaction['credit_amount'] = $amount;
                                }
                            }
                        }
                    }
                }

                // Look for transaction ID
                if (preg_match($transactionIdPattern, $line, $idMatches)) {
                    $currentTransaction['transaction_id'] = $idMatches[1];
                }

                // Add remaining text to description
                $cleanLine = preg_replace([$datePattern, $amountPattern, $transactionIdPattern], '', $line);
                $cleanLine = trim($cleanLine);
                if (!empty($cleanLine) && strlen($currentTransaction['description']) < 200) {
                    $currentTransaction['description'] .= (empty($currentTransaction['description']) ? '' : ' ') . $cleanLine;
                }
            }
        }

        // Add the last transaction
        if (!empty($currentTransaction)) {
            $transactions[] = $currentTransaction;
        }

        // Clean up transactions - remove incomplete ones
        $transactions = array_filter($transactions, function($transaction) {
            return !empty($transaction['transaction_date']) &&
                   (!empty($transaction['debit_amount']) || !empty($transaction['credit_amount']));
        });

        // Reset array keys
        $transactions = array_values($transactions);

        return $transactions;
    }

    private function normalizeDate($dateString)
    {
        // Try different date formats commonly found in bank statements
        $formats = [
            'd/m/Y', 'm/d/Y', 'Y/m/d', 'd-m-Y', 'm-d-Y', 'Y-m-d',
            'd/m/y', 'm/d/y', 'y/m/d', 'd-m-y', 'm-d-y', 'y-m-d'
        ];

        foreach ($formats as $format) {
            $date = \DateTime::createFromFormat($format, $dateString);
            if ($date !== false) {
                return $date->format('Y-m-d');
            }
        }

        // If no format matches, return as-is
        return $dateString;
    }

    private function findFieldKey($array, $fieldName)
    {
        $fieldName = strtolower(str_replace('_', ' ', $fieldName));
        foreach ($array as $key => $value) {
            if (strtolower(str_replace('_', ' ', $key)) === $fieldName) {
                return $key;
            }
        }
        return null;
    }

    private function parseDoc($filePath)
    {
        // Basic DOC parsing - this is simplified
        // For now, return empty as DOC parsing is complex
        Log::warning('DOC parsing not fully implemented');
        return [];
    }

    private function performReconciliation($documentData, $mode = 'by_transaction_id', $startDate = null, $endDate = null)
    {
        if ($mode === 'by_transaction_id') {
            Log::info('Routing to transaction ID presence reconciliation workflow', [
                'document_records_count' => count($documentData)
            ]);
            return $this->performTransactionIdPresenceReconciliation($documentData);
        }

        Log::info('Starting performReconciliation', [
            'document_records_count' => count($documentData),
            'mode' => $mode,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'memory_usage' => memory_get_usage(true)
        ]);

        $fieldDefinitions = [
            'account_number' => ['label' => 'Account Number', 'type' => 'string'],
            'account_name' => ['label' => 'Account Name', 'type' => 'string'],
            'transaction_date' => ['label' => 'Transaction Date', 'type' => 'date'],
            'transaction_type' => ['label' => 'Transaction Type', 'type' => 'string'],
            'status' => ['label' => 'Status', 'type' => 'string'],
            'description' => ['label' => 'Description', 'type' => 'string'],
            'reference_number' => ['label' => 'Reference Number', 'type' => 'string'],
            'debit_amount' => ['label' => 'Debit Amount', 'type' => 'decimal'],
            'credit_amount' => ['label' => 'Credit Amount', 'type' => 'decimal'],
            'balance' => ['label' => 'Balance', 'type' => 'decimal'],
        ];

        $totalRecords = count($documentData); // Count ALL rows in the file
        $matched = 0;
        $discrepancies = 0;
        $missing = 0;
        $mismatched = 0;
        $critical = 0;
        $high = 0;
        $medium = 0;
        $low = 0;
        $totalDebitVariance = 0.0;
        $totalCreditVariance = 0.0;
        $totalDocumentNet = 0.0;
        $totalDatabaseNet = 0.0;
        $records = [];
        $detailedRecords = [];
        $unrecognizedIds = [];

        $documentIds = [];
        foreach ($documentData as $docRecord) {
            $recordId = $docRecord['transaction_id'] ?? $docRecord['id'] ?? $docRecord['Transaction ID'] ?? $docRecord['Txn ID'] ?? $docRecord['Transaction Id'] ?? null;
            if ($recordId) {
                $documentIds[] = $recordId;
            }
        }

        $uniqueDocumentIds = array_unique($documentIds);

        Log::info('Extracted transaction IDs from uploaded file', [
            'total_document_records' => count($documentData),
            'unique_ids_count' => count($uniqueDocumentIds),
        ]);

        // For period mode, get all DB records in the period
        $query = \App\Models\Transaction::select([
            'transaction_id',
            'account_number',
            'account_name',
            'description',
            'reference_number',
            'debit_amount',
            'credit_amount',
            'balance',
            'transaction_type',
            'status',
            'transaction_date'
        ]);

        if ($startDate) {
            $query->where('transaction_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('transaction_date', '<=', $endDate);
        }

        $dbRecords = $query->get()->keyBy('transaction_id');

        $unrecognizedIds = array_values(array_diff($uniqueDocumentIds, $dbRecords->keys()->toArray()));

        // Track which DB records have been matched
        $matchedDbIds = [];

        foreach ($documentData as $docRecord) {
            $recordId = $docRecord['transaction_id'] ?? $docRecord['id'] ?? $docRecord['Transaction ID'] ?? $docRecord['Txn ID'] ?? $docRecord['Transaction Id'] ?? null;

            // Process ALL records, even those without transaction IDs
            if (!$recordId) {
                // Record without transaction ID - create discrepancy entry
                $missing++;
                $discrepancies++;
                $mismatched++;
                $high++; // Missing transaction ID is high severity

                // Create a record entry for missing transaction ID
                $recordFields = [];
                foreach ($fieldDefinitions as $field => $config) {
                    $docKey = $this->findFieldKey($docRecord, $field);
                    $docRaw = $docKey !== null ? $docRecord[$docKey] : null;

                    $documentDisplay = '-';
                    $databaseDisplay = 'Not in system (missing transaction ID)';
                    $differenceText = 'Transaction not in system - missing ID';
                    $severityLevel = 'high';
                    $hasDifference = true;

                    if ($config['type'] === 'decimal') {
                        if ($docRaw !== null && trim((string)$docRaw) !== '' && strtolower(trim((string)$docRaw)) !== 'n/a') {
                            $docNumeric = (float)str_replace([','], '', (string)$docRaw);
                            $documentDisplay = number_format($docNumeric, 2);
                        }
                    } elseif ($config['type'] === 'date') {
                        $docValue = $docRaw !== null ? trim((string)$docRaw) : null;
                        $normalizedDoc = $docValue !== null && $docValue !== '' && strtolower($docValue) !== 'n/a' ? $this->normalizeDate($docValue) : null;
                        if ($normalizedDoc !== null) {
                            $documentDisplay = $normalizedDoc;
                        }
                    } else {
                        if ($docRaw !== null && trim((string)$docRaw) !== '' && strtolower(trim((string)$docRaw)) !== 'n/a') {
                            $documentDisplay = trim((string)$docRaw);
                        }
                    }

                    $recordFields[$field] = [
                        'label' => $config['label'],
                        'documentValue' => $documentDisplay,
                        'databaseValue' => $databaseDisplay,
                        'difference' => $differenceText,
                        'severity' => $severityLevel,
                        'hasDifference' => $hasDifference,
                    ];
                }

                $recordEntry = [
                    'transaction_id' => 'NO_ID_' . (count($records) + 1), // Generate temporary ID for display
                    'source' => 'document', // File-only: in file but not in database (no ID to match)
                    'status' => 'Missing in database',
                    'fields' => $recordFields,
                    'document_net' => '0.00',
                    'database_net' => '0.00',
                    'net_change' => '0.00',
                    'discrepancy_count' => count($fieldDefinitions),
                    'document_record' => $docRecord, // Include full document record for display
                    'database_record' => null,
                ];

                $records[] = $recordEntry;
                $detailedRecords[] = $recordEntry;
                continue;
            }

            $dbRecord = $dbRecords->get($recordId);
            if (!$dbRecord) {
                // Transaction in file but not in database
                $missing++;
                $discrepancies++;
                $mismatched++;
                $high++; // Not in system is high severity

                // Create a record showing this transaction is missing from database
                $recordFields = [];
                foreach ($fieldDefinitions as $field => $config) {
                    $docKey = $this->findFieldKey($docRecord, $field);
                    $docRaw = $docKey !== null ? $docRecord[$docKey] : null;

                    $documentDisplay = '-';
                    $databaseDisplay = 'Not in system';
                    $differenceText = 'Transaction not in system';
                    $severityLevel = 'high';
                    $hasDifference = true;

                    if ($config['type'] === 'decimal') {
                        if ($docRaw !== null && trim((string)$docRaw) !== '' && strtolower(trim((string)$docRaw)) !== 'n/a') {
                            $docNumeric = (float)str_replace([','], '', (string)$docRaw);
                            $documentDisplay = number_format($docNumeric, 2);
                        }
                    } elseif ($config['type'] === 'date') {
                        $docValue = $docRaw !== null ? trim((string)$docRaw) : null;
                        $normalizedDoc = $docValue !== null && $docValue !== '' && strtolower($docValue) !== 'n/a' ? $this->normalizeDate($docValue) : null;
                        if ($normalizedDoc !== null) {
                            $documentDisplay = $normalizedDoc;
                        }
                    } else {
                        if ($docRaw !== null && trim((string)$docRaw) !== '' && strtolower(trim((string)$docRaw)) !== 'n/a') {
                            $documentDisplay = trim((string)$docRaw);
                        }
                    }

                    $recordFields[$field] = [
                        'label' => $config['label'],
                        'documentValue' => $documentDisplay,
                        'databaseValue' => $databaseDisplay,
                        'difference' => $differenceText,
                        'severity' => $severityLevel,
                        'hasDifference' => $hasDifference,
                    ];
                }

                $recordEntry = [
                    'transaction_id' => $recordId,
                    'source' => 'document', // File-only: in file but not in database
                    'status' => 'Missing in database',
                    'fields' => $recordFields,
                    'document_net' => '0.00',
                    'database_net' => '0.00',
                    'net_change' => '0.00',
                    'discrepancy_count' => count($fieldDefinitions), // All fields are discrepancies
                    'document_record' => $docRecord, // Include full document record for display
                    'database_record' => null,
                ];

                $records[] = $recordEntry;
                $detailedRecords[] = $recordEntry;
                continue;
            }

            // Mark this DB record as matched
            $matchedDbIds[] = $recordId;
            $matched++;

            $docTypeKey = $this->findFieldKey($docRecord, 'type');
            $docAmountKey = $this->findFieldKey($docRecord, 'amount');
            $docCdKey = $this->findFieldKey($docRecord, 'c/d');

            if ($docCdKey && $docAmountKey) {
                $type = strtoupper(trim($docRecord[$docCdKey]));
                $amount = (float)$docRecord[$docAmountKey];
                if ($type === 'C') {
                    $docRecord['credit_amount'] = $amount;
                    $docRecord['debit_amount'] = 0;
                } elseif ($type === 'D') {
                    $docRecord['debit_amount'] = $amount;
                    $docRecord['credit_amount'] = 0;
                }
            } elseif ($docTypeKey && $docAmountKey) {
                $type = strtoupper(trim($docRecord[$docTypeKey]));
                $amount = (float)$docRecord[$docAmountKey];
                if ($type === 'C') {
                    $docRecord['credit_amount'] = $amount;
                    $docRecord['debit_amount'] = 0;
                } elseif ($type === 'D') {
                    $docRecord['debit_amount'] = $amount;
                    $docRecord['credit_amount'] = 0;
                }
            }

            $recordFields = [];
            $recordDiscrepancies = 0;
            $documentDebit = 0.0;
            $documentCredit = 0.0;
            $databaseDebit = (float)($dbRecord->debit_amount ?? 0);
            $databaseCredit = (float)($dbRecord->credit_amount ?? 0);

            foreach ($fieldDefinitions as $field => $config) {
                $docKey = $this->findFieldKey($docRecord, $field);
                $docRaw = $docKey !== null ? $docRecord[$docKey] : null;
                $dbRaw = $dbRecord->$field ?? null;

                $documentDisplay = '-';
                $databaseDisplay = '-';
                $differenceText = 'Match';
                $severityLevel = 'match';
                $hasDifference = false;

                if ($config['type'] === 'decimal') {
                    $docNumeric = null;
                    if ($docRaw !== null && trim((string)$docRaw) !== '' && strtolower(trim((string)$docRaw)) !== 'n/a') {
                        $docNumeric = (float)str_replace([','], '', (string)$docRaw);
                    }
                    $dbNumeric = $dbRaw !== null ? (float)$dbRaw : 0.0;

                    if ($docNumeric !== null) {
                        $documentDisplay = number_format($docNumeric, 2);
                    }
                    if ($dbRaw !== null) {
                        $databaseDisplay = number_format($dbNumeric, 2);
                    }

                    if ($field === 'debit_amount') {
                        $documentDebit = $docNumeric ?? 0.0;
                    }
                    if ($field === 'credit_amount') {
                        $documentCredit = $docNumeric ?? 0.0;
                    }

                    if ($docNumeric === null) {
                        $differenceText = 'Missing in uploaded file';
                        $severityLevel = 'high';
                        $hasDifference = true;
                    } else {
                        $variance = $docNumeric - $dbNumeric;
                        if (abs($variance) > 0.01) {
                            $differenceText = number_format($variance, 2);
                            $hasDifference = true;

                            if (abs($variance) >= 1000) {
                                $severityLevel = 'critical';
                            } elseif (abs($variance) >= 100) {
                                $severityLevel = 'high';
                            } elseif (abs($variance) >= 10) {
                                $severityLevel = 'medium';
                            } else {
                                $severityLevel = 'low';
                            }

                            if ($field === 'debit_amount') {
                                $totalDebitVariance += $variance;
                            } elseif ($field === 'credit_amount') {
                                $totalCreditVariance += $variance;
                            }
                        } else {
                            $differenceText = '0.00';
                        }
                    }
                } elseif ($config['type'] === 'date') {
                    $docValue = $docRaw !== null ? trim((string)$docRaw) : null;
                    $dbValue = $dbRaw !== null ? trim((string)$dbRaw) : null;

                    $normalizedDoc = $docValue !== null && $docValue !== '' && strtolower($docValue) !== 'n/a' ? $this->normalizeDate($docValue) : null;
                    $normalizedDb = $dbValue !== null && $dbValue !== '' ? $this->normalizeDate($dbValue) : null;

                    if ($normalizedDoc !== null) {
                        $documentDisplay = $normalizedDoc;
                    }
                    if ($normalizedDb !== null) {
                        $databaseDisplay = $normalizedDb;
                    }

                    if ($normalizedDoc === null) {
                        $differenceText = 'Missing in uploaded file';
                        $severityLevel = 'medium';
                        $hasDifference = true;
                    } elseif ($normalizedDb === null) {
                        $differenceText = 'Missing in database';
                        $severityLevel = 'medium';
                        $hasDifference = true;
                    } elseif (strcasecmp($normalizedDoc, $normalizedDb) !== 0) {
                        $differenceText = 'Date mismatch';
                        $severityLevel = 'medium';
                        $hasDifference = true;
                    }
                } else {
                    $docValue = null;
                    if ($docRaw !== null && trim((string)$docRaw) !== '' && strtolower(trim((string)$docRaw)) !== 'n/a') {
                        $docValue = trim((string)$docRaw);
                    }
                    $dbValue = $dbRaw !== null && trim((string)$dbRaw) !== '' ? trim((string)$dbRaw) : null;

                    if ($docValue !== null) {
                        $documentDisplay = $docValue;
                    }
                    if ($dbValue !== null) {
                        $databaseDisplay = $dbValue;
                    }

                    if ($docValue === null) {
                        $differenceText = 'Missing in uploaded file';
                        $severityLevel = 'medium';
                        $hasDifference = true;
                    } elseif ($dbValue === null) {
                        $differenceText = 'Missing in database';
                        $severityLevel = 'medium';
                        $hasDifference = true;
                    } elseif (strcasecmp($docValue, $dbValue) !== 0) {
                        $differenceText = 'Value mismatch';
                        $severityLevel = in_array($field, ['account_number', 'account_name']) ? 'high' : 'low';
                        $hasDifference = true;
                    }
                }

                if ($hasDifference) {
                    $discrepancies++;
                    $mismatched++;
                    $recordDiscrepancies++;

                    switch ($severityLevel) {
                        case 'critical':
                            $critical++;
                            break;
                        case 'high':
                            $high++;
                            break;
                        case 'medium':
                            $medium++;
                            break;
                        case 'low':
                            $low++;
                            break;
                    }
                }

                $recordFields[$field] = [
                    'label' => $config['label'],
                    'documentValue' => $documentDisplay,
                    'databaseValue' => $databaseDisplay,
                    'difference' => $differenceText,
                    'severity' => $severityLevel,
                    'hasDifference' => $hasDifference,
                ];
            }

            $documentNet = $documentCredit - $documentDebit;
            $databaseNet = $databaseCredit - $databaseDebit;
            $netChangeValue = $documentNet - $databaseNet;

            $totalDocumentNet += $documentNet;
            $totalDatabaseNet += $databaseNet;

            $recordEntry = [
                'transaction_id' => $recordId,
                'fields' => $recordFields,
                'document_net' => number_format($documentNet, 2),
                'database_net' => number_format($databaseNet, 2),
                'net_change' => number_format($netChangeValue, 2),
                'discrepancy_count' => $recordDiscrepancies,
            ];

            $records[] = $recordEntry;

            if ($recordDiscrepancies > 0) {
                $detailedRecords[] = $recordEntry;
            }
        }

        // For period mode, add records for DB transactions not in the uploaded file
        if ($mode === 'by_period') {
            foreach ($dbRecords as $dbId => $dbRecord) {
                if (!in_array($dbId, $matchedDbIds)) {
                    // Transaction in database but not in uploaded file
                    $missing++;
                    $discrepancies++;
                    $mismatched++;
                    $high++; // Not in file is high severity

                    $recordFields = [];
                    foreach ($fieldDefinitions as $field => $config) {
                        $dbRaw = $dbRecord->$field ?? null;

                        $documentDisplay = 'Not in file';
                        $databaseDisplay = '-';
                        $differenceText = 'Transaction not in file';
                        $severityLevel = 'high';
                        $hasDifference = true;

                        if ($config['type'] === 'decimal') {
                            if ($dbRaw !== null) {
                                $dbNumeric = (float)$dbRaw;
                                $databaseDisplay = number_format($dbNumeric, 2);
                            }
                        } elseif ($config['type'] === 'date') {
                            $dbValue = $dbRaw !== null ? trim((string)$dbRaw) : null;
                            $normalizedDb = $dbValue !== null && $dbValue !== '' ? $this->normalizeDate($dbValue) : null;
                            if ($normalizedDb !== null) {
                                $databaseDisplay = $normalizedDb;
                            }
                        } else {
                            if ($dbRaw !== null && trim((string)$dbRaw) !== '') {
                                $databaseDisplay = trim((string)$dbRaw);
                            }
                        }

                        $recordFields[$field] = [
                            'label' => $config['label'],
                            'documentValue' => $documentDisplay,
                            'databaseValue' => $databaseDisplay,
                            'difference' => $differenceText,
                            'severity' => $severityLevel,
                            'hasDifference' => $hasDifference,
                        ];
                    }

                    $databaseDebit = (float)($dbRecord->debit_amount ?? 0);
                    $databaseCredit = (float)($dbRecord->credit_amount ?? 0);
                    $databaseNet = $databaseCredit - $databaseDebit;

                    $totalDatabaseNet += $databaseNet;

                    $recordEntry = [
                        'transaction_id' => $dbId,
                        'source' => 'database', // Database-only: in database but not in file
                        'status' => 'Missing in uploaded file',
                        'fields' => $recordFields,
                        'document_net' => '0.00',
                        'database_net' => number_format($databaseNet, 2),
                        'net_change' => number_format(0 - $databaseNet, 2),
                        'discrepancy_count' => count($fieldDefinitions), // All fields are discrepancies
                        'document_record' => null,
                        'database_record' => $dbRecord->toArray(), // Include full database record for display
                    ];

                    $records[] = $recordEntry;
                    $detailedRecords[] = $recordEntry;
                }
            }
        }

        $netVariance = $totalDebitVariance + $totalCreditVariance;
        $balanceStatus = abs($netVariance) < 0.01 ? 'In Balance' : 'Out of Balance';
        $unrecognizedCount = count($unrecognizedIds);

        $summary = [
            'total_document_net' => number_format($totalDocumentNet, 2),
            'total_database_net' => number_format($totalDatabaseNet, 2),
            'total_net_change' => number_format($totalDocumentNet - $totalDatabaseNet, 2),
            'total_transactions' => count($records),
            'discrepancy_count' => $discrepancies,
        ];

        $result = [
            'totalRecords' => $totalRecords, // Always the count from uploaded file
            'matched' => $matched,
            'discrepancies' => $discrepancies,
            'missing' => $missing,
            'mismatched' => $mismatched,
            'docOnlyCount' => $missing,
            'dbOnlyCount' => $mismatched,
            'critical' => $critical,
            'high' => $high,
            'medium' => $medium,
            'low' => $low,
            'totalDebitVariance' => $totalDebitVariance,
            'totalCreditVariance' => $totalCreditVariance,
            'netVariance' => $netVariance,
            'balanceStatus' => $balanceStatus,
            'records' => array_values($records),
            'detailedRecords' => array_values($detailedRecords),
            'unrecognizedIds' => $unrecognizedIds,
            'unrecognizedCount' => $unrecognizedCount,
            'summary' => $summary,
            'fileRecords' => $totalRecords, // Explicitly track file records
        ];

        Log::info('performReconciliation completed', [
            'result_summary' => [
                'total_records' => $totalRecords,
                'matched' => $matched,
                'discrepancies' => $discrepancies,
                'net_variance' => $netVariance,
                'balance_status' => $balanceStatus,
                'unrecognized_count' => $unrecognizedCount
            ],
            'memory_usage' => memory_get_usage(true)
        ]);

        return $result;
    }

    private function performTransactionIdPresenceReconciliation(array $documentData)
    {
        $fieldDefinitions = [
            'account_number' => ['label' => 'Account Number', 'type' => 'string'],
            'account_name' => ['label' => 'Account Name', 'type' => 'string'],
            'transaction_date' => ['label' => 'Transaction Date', 'type' => 'date'],
            'transaction_type' => ['label' => 'Transaction Type', 'type' => 'string'],
            'description' => ['label' => 'Description', 'type' => 'string'],
            'reference_number' => ['label' => 'Reference Number', 'type' => 'string'],
            'debit_amount' => ['label' => 'Debit Amount', 'type' => 'decimal'],
            'credit_amount' => ['label' => 'Credit Amount', 'type' => 'decimal'],
            'balance' => ['label' => 'Balance', 'type' => 'decimal'],
        ];

        $totalRecords = count($documentData);
        $documentRecords = [];
        $documentRecordsWithoutId = [];
        $totalDocumentNet = 0.0;

        foreach ($documentData as $index => $record) {
            $transactionId = $this->extractTransactionIdFromArray($record);
            $totalDocumentNet += $this->calculateNetFromArray($record);

            if ($transactionId) {
                $documentRecords[$transactionId] = $record;
            } else {
                $documentRecordsWithoutId[] = [
                    'transaction_id' => 'FILE_ONLY_NO_ID_' . str_pad((string)($index + 1), 4, '0', STR_PAD_LEFT),
                    'record' => $record,
                ];
            }
        }

        $dbRecords = \App\Models\Transaction::select([
            'transaction_id',
            'account_number',
            'account_name',
            'description',
            'reference_number',
            'debit_amount',
            'credit_amount',
            'balance',
            'transaction_type',
            'status',
            'transaction_date'
        ])->get()->keyBy('transaction_id');

        $totalDatabaseNet = 0.0;
        foreach ($dbRecords as $dbRecord) {
            $totalDatabaseNet += $this->calculateNetFromModel($dbRecord);
        }

        $matched = 0;
        $records = [];
        $docOnlyCount = 0;
        $dbOnlyCount = 0;

        foreach ($documentRecords as $transactionId => $docRecord) {
            if ($dbRecords->has($transactionId)) {
                $matched++;
                continue;
            }

            $docOnlyCount++;
            $records[] = $this->buildPresenceRecord($transactionId, $docRecord, null, $fieldDefinitions, 'document');
        }

        foreach ($documentRecordsWithoutId as $placeholder) {
            $docOnlyCount++;
            $records[] = $this->buildPresenceRecord($placeholder['transaction_id'], $placeholder['record'], null, $fieldDefinitions, 'document');
        }

        foreach ($dbRecords as $transactionId => $dbRecord) {
            if (array_key_exists($transactionId, $documentRecords)) {
                continue;
            }

            $dbOnlyCount++;
            $records[] = $this->buildPresenceRecord($transactionId, null, $dbRecord, $fieldDefinitions, 'database');
        }

        $discrepancies = count($records);
        $balanceStatus = $discrepancies === 0 ? 'In Balance' : 'Out of Balance';

        $summary = [
            'total_document_net' => number_format($totalDocumentNet, 2),
            'total_database_net' => number_format($totalDatabaseNet, 2),
            'total_net_change' => number_format($totalDocumentNet - $totalDatabaseNet, 2),
            'total_transactions' => $totalRecords,
            'discrepancy_count' => $discrepancies,
        ];

        return [
            'totalRecords' => $totalRecords,
            'matched' => $matched,
            'discrepancies' => $discrepancies,
            'missing' => $docOnlyCount,
            'mismatched' => $dbOnlyCount,
            'critical' => 0,
            'high' => $discrepancies,
            'medium' => 0,
            'low' => 0,
            'totalDebitVariance' => 0,
            'totalCreditVariance' => 0,
            'netVariance' => $totalDocumentNet - $totalDatabaseNet,
            'balanceStatus' => $balanceStatus,
            'records' => array_values($records),
            'detailedRecords' => array_values($records),
            'unrecognizedIds' => [],
            'unrecognizedCount' => 0,
            'summary' => $summary,
            'fileRecords' => $totalRecords,
            'docOnlyCount' => $docOnlyCount,
            'dbOnlyCount' => $dbOnlyCount,
        ];
    }

    private function extractTransactionIdFromArray(array $record): ?string
    {
        $candidates = [
            'transaction_id',
            'id',
            'Transaction ID',
            'Txn ID',
            'Transaction Id',
            'reference',
            'reference_number'
        ];

        foreach ($candidates as $candidate) {
            if (isset($record[$candidate]) && trim((string)$record[$candidate]) !== '') {
                return trim((string)$record[$candidate]);
            }
        }

        return null;
    }

    private function calculateNetFromArray(array $record): float
    {
        $debitKey = $this->findFieldKey($record, 'debit_amount');
        $creditKey = $this->findFieldKey($record, 'credit_amount');
        $amountKey = $this->findFieldKey($record, 'amount');

        $debit = $debitKey !== null ? $this->normalizeNumericValue($record[$debitKey]) : 0.0;
        $credit = $creditKey !== null ? $this->normalizeNumericValue($record[$creditKey]) : 0.0;

        if ($credit === 0.0 && $debit === 0.0 && $amountKey !== null) {
            return $this->normalizeNumericValue($record[$amountKey]);
        }

        return $credit - $debit;
    }

    private function calculateNetFromModel($record): float
    {
        $debit = (float)($record->debit_amount ?? 0);
        $credit = (float)($record->credit_amount ?? 0);
        return $credit - $debit;
    }

    private function normalizeNumericValue($value): float
    {
        if ($value === null) {
            return 0.0;
        }

        $stringValue = trim((string)$value);
        if ($stringValue === '' || strtolower($stringValue) === 'n/a') {
            return 0.0;
        }

        $normalized = str_replace([',', ' '], '', $stringValue);
        return (float)$normalized;
    }

    private function formatFieldValue($value, string $type): string
    {
        if ($value === null) {
            return '-';
        }

        $stringValue = trim((string)$value);
        if ($stringValue === '' || strtolower($stringValue) === 'n/a') {
            return '-';
        }

        switch ($type) {
            case 'decimal':
                return number_format($this->normalizeNumericValue($stringValue), 2);
            case 'date':
                return $this->normalizeDate($stringValue);
            default:
                return $stringValue;
        }
    }

    private function buildPresenceFields(array $fieldDefinitions, ?array $docRecord, $dbRecord): array
    {
        $fields = [];
        foreach ($fieldDefinitions as $field => $config) {
            $docValue = null;
            $dbValue = null;

            if ($docRecord !== null) {
                $docKey = $this->findFieldKey($docRecord, $field);
                $docValue = $docKey !== null ? $docRecord[$docKey] : null;
            }

            if ($dbRecord !== null) {
                $dbValue = $dbRecord->$field ?? null;
            }

            $fields[$field] = [
                'label' => $config['label'],
                'documentValue' => $docRecord !== null
                    ? $this->formatFieldValue($docValue, $config['type'])
                    : 'Not in uploaded file',
                'databaseValue' => $dbRecord !== null
                    ? $this->formatFieldValue($dbValue, $config['type'])
                    : 'Not in database',
                'difference' => $docRecord !== null && $dbRecord === null
                    ? 'Missing in database'
                    : ($docRecord === null && $dbRecord !== null
                        ? 'Missing in uploaded file'
                        : 'Match'),
                'severity' => 'high',
                'hasDifference' => true,
            ];
        }

        return $fields;
    }

    private function buildPresenceRecord(string $transactionId, ?array $docRecord, $dbRecord, array $fieldDefinitions, string $source): array
    {
        $documentNetValue = $docRecord ? $this->calculateNetFromArray($docRecord) : 0.0;
        $databaseNetValue = $dbRecord ? $this->calculateNetFromModel($dbRecord) : 0.0;

        return [
            'transaction_id' => $transactionId,
            'source' => $source,
            'status' => $source === 'document' ? 'Missing in database' : 'Missing in uploaded file',
            'fields' => $this->buildPresenceFields($fieldDefinitions, $docRecord, $dbRecord),
            'document_net' => number_format($documentNetValue, 2),
            'database_net' => number_format($databaseNetValue, 2),
            'net_change' => number_format($documentNetValue - $databaseNetValue, 2),
            'discrepancy_count' => 1,
            'document_record' => $docRecord,
            'database_record' => $dbRecord ? $dbRecord->toArray() : null,
        ];
    }

    /**
     * Generate statement (filter transactions)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateStatement(Request $request)
    {
        try {
            $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
            ]);

            // This endpoint just validates the filters and returns success
            // The actual filtering happens in the frontend when fetching transactions
            return response()->json([
                'message' => 'Statement filters applied successfully',
                'filters' => [
                    'start_date' => $request->input('start_date'),
                    'end_date' => $request->input('end_date'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Statement generation failed', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'statement_generation_error'
            ], 500);
        }
    }

    /**
     * Export PDF report
     *
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
     */
    public function exportPdf(Request $request)
    {
        try {
            $request->validate([
                'transactions' => 'required|array',
                'summary' => 'nullable|array',
                'filters' => 'nullable|array'
            ]);

            $transactions = $request->input('transactions', []);
            $summary = $request->input('summary', []);
            $filters = $request->input('filters', []);

            // Prepare report data for PDF
            $reportData = [
                'reference' => 'EXPORT-' . now()->format('Ymd-His'),
                'timestamp' => now()->toISOString(),
                'user' => $request->user()->name,
                'comparisonTime' => 'N/A (Export)',
                'totalRecords' => count($transactions),
                'matched' => count($transactions), // All shown transactions are "matched"
                'discrepancies' => 0,
                'balanceStatus' => 'N/A',
                'totalDebitVariance' => 0,
                'totalCreditVariance' => 0,
                'netVariance' => 0,
                'records' => [],
                'transactions' => $transactions,
                'summary' => $summary,
                'filters' => $filters
            ];

            // Generate PDF
            $pdf = Pdf::loadView('reports.reconciliation', compact('reportData'));
            $filename = 'npontu-statement-' . now()->format('Y-m-d_H-i-s') . '.pdf';

            return $pdf->download($filename);

        } catch (\Exception $e) {
            Log::error('PDF export failed', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'pdf_export_error'
            ], 500);
        }
    }

    /**
     * Export data as CSV
     *
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
     */
    public function exportData(Request $request)
    {
        try {
            $request->validate([
                'transactions' => 'required|array',
                'summary' => 'nullable|array',
                'format' => 'required|in:csv,xlsx'
            ]);

            $transactions = $request->input('transactions', []);
            $format = $request->input('format', 'csv');

            if ($format === 'csv') {
                $filename = 'npontu-data-' . now()->format('Y-m-d_H-i-s') . '.csv';
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                ];

                $callback = function() use ($transactions) {
                    $file = fopen('php://output', 'w');

                    // CSV headers
                    fputcsv($file, [
                        'Transaction ID',
                        'Account Number',
                        'Account Name',
                        'Debit Amount',
                        'Credit Amount',
                        'Transaction Type',
                        'Transaction Date',
                        'Description',
                        'Reference Number',
                        'Balance',
                        'Status'
                    ]);

                    // CSV data
                    foreach ($transactions as $transaction) {
                        fputcsv($file, [
                            $transaction['transaction_id'] ?? '',
                            $transaction['account_number'] ?? '',
                            $transaction['account_name'] ?? '',
                            $transaction['debit_amount'] ?? 0,
                            $transaction['credit_amount'] ?? 0,
                            $transaction['transaction_type'] ?? '',
                            $transaction['transaction_date'] ?? '',
                            $transaction['description'] ?? '',
                            $transaction['reference_number'] ?? '',
                            $transaction['balance'] ?? 0,
                            $transaction['status'] ?? ''
                        ]);
                    }

                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            } else {
                // For XLSX, we'd need additional libraries, return CSV for now
                return $this->exportData($request->merge(['format' => 'csv']));
            }

        } catch (\Exception $e) {
            Log::error('Data export failed', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'data_export_error'
            ], 500);
        }
    }

    /**
     * Download reconciliation report
     *
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
     */
    public function downloadReport(Request $request)
    {
        try {
            $request->validate([
                'reference' => 'nullable|string',
                'reportData' => 'nullable|array',
                'format' => 'required|in:pdf,xlsx'
            ]);

            $reference = $request->input('reference');
            $reportData = $request->input('reportData');
            $format = $request->input('format');

            // If reference is provided, prefer stored report payload
            if ($reference) {
                $report = ReconciliationRun::where('reference', $reference)->first();
                if (!$report) {
                    return response()->json(['message' => 'Report not found'], 404);
                }
                $reportData = $report->payload ?? [];
                $reportData['reference'] = $reference;
                $reportData['timestamp'] = $reportData['timestamp']
                    ?? ($report->reconciliation_date
                        ? $report->reconciliation_date->toISOString()
                        : null);
                $reportData['user'] = $reportData['user'] ?? $report->user_name;
            }

            if (!$reportData) {
                return response()->json([
                    'message' => 'No report data provided.',
                    'error_type' => 'report_download_error'
                ], 422);
            }

            if ($format === 'pdf') {
                // Generate PDF report
                $pdf = Pdf::loadView('reports.reconciliation', compact('reportData'));
                $filename = 'reconciliation_report_' . ($reference ?: now()->format('Y-m-d_H-i-s')) . '.pdf';
                return $pdf->download($filename);
            } else {
                // Generate Excel report
                return Excel::download(new ReconciliationReportExport($reportData), 'reconciliation_report_' . ($reference ?: now()->format('Y-m-d_H-i-s')) . '.xlsx');
            }

        } catch (\Exception $e) {
            Log::error('Report download failed', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'report_download_error'
            ], 500);
        }
    }

    /**
     * Get reconciliation reports history
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReports(Request $request)
    {
        try {
            $reports = ReconciliationRun::orderBy('reconciliation_date', 'desc')
                ->paginate(20);

            return response()->json($reports);
        } catch (\Exception $e) {
            Log::error('Failed to fetch reports', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'reports_fetch_error'
            ], 500);
        }
    }

    /**
     * Get discrepancy trends over time
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDiscrepancyTrends(Request $request)
    {
        try {
            $period = $request->input('period', '30'); // days
            $startDate = now()->subDays($period);

            $trends = ReconciliationRun::where('reconciliation_date', '>=', $startDate)
                ->orderBy('reconciliation_date')
                ->get()
                ->map(function ($report) {
                    $summary = $report->summary ?? [];
                    $totalRecords = $summary['totalRecords'] ?? $summary['total_records'] ?? 0;
                    $discrepancies = $summary['discrepancies'] ?? $summary['docOnlyCount'] ?? 0;
                    return [
                        'date' => $report->reconciliation_date->format('Y-m-d'),
                        'discrepancies' => $discrepancies,
                        'total_records' => $totalRecords,
                        'discrepancy_rate' => $totalRecords > 0
                            ? round(($discrepancies / $totalRecords) * 100, 2)
                            : 0,
                        'total_debit_variance' => abs($summary['totalDebitVariance'] ?? 0),
                        'total_credit_variance' => abs($summary['totalCreditVariance'] ?? 0),
                        'net_variance' => abs($summary['netVariance'] ?? 0),
                    ];
                });

            return response()->json($trends);
        } catch (\Exception $e) {
            Log::error('Failed to fetch discrepancy trends', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'trends_fetch_error'
            ], 500);
        }
    }

    /**
     * Get specific reconciliation report
     *
     * @param Request $request
     * @param string $reference
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReport(Request $request, $reference)
    {
        try {
            $report = ReconciliationRun::where('reference', $reference)->first();

            if (!$report) {
                return response()->json(['message' => 'Report not found'], 404);
            }

            return response()->json($report);
        } catch (\Exception $e) {
            Log::error('Failed to fetch report', ['error' => $e->getMessage(), 'reference' => $reference]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'report_fetch_error'
            ], 500);
        }
    }

    /**
     * Get transactions with filtering and pagination
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTransactions(Request $request)
    {
        try {
            Log::info('getTransactions called', [
                'all_params' => $request->all(),
                'per_page' => $request->input('per_page', 50),
                'page' => $request->input('page', 1),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'account_number' => $request->input('account_number'),
                'transaction_type' => $request->input('transaction_type')
            ]);

            $query = \App\Models\Transaction::query();

            // Apply filters
            if ($request->has('start_date') && $request->filled('start_date')) {
                $query->where('transaction_date', '>=', $request->input('start_date'));
            }

            if ($request->has('end_date') && $request->filled('end_date')) {
                $query->where('transaction_date', '<=', $request->input('end_date'));
            }

            if ($request->has('account_number') && $request->filled('account_number')) {
                $query->where('account_number', 'like', '%' . $request->input('account_number') . '%');
            }

            if ($request->has('transaction_type') && $request->filled('transaction_type')) {
                $query->where('transaction_type', $request->input('transaction_type'));
            }

            // Pagination - limit per_page to maximum 50 for performance
            $perPage = min((int) $request->input('per_page', 50), 50);
            $page = $request->input('page', 1);

            // Check if transactions table exists
            if (!\Illuminate\Support\Facades\Schema::hasTable('transactions')) {
                Log::error('Transactions table does not exist');
                return response()->json([
                    'message' => 'Transactions table not found. Please run database migrations.',
                    'error_type' => 'transactions_table_missing'
                ], 500);
            }

            Log::info('Query before pagination', [
                'total_count' => $query->count(),
                'per_page' => $perPage,
                'page' => $page
            ]);

            $transactions = $query->orderBy('transaction_date', 'desc')
                                  ->orderBy('id', 'desc')
                                  ->paginate($perPage, ['*'], 'page', $page);

            Log::info('Pagination result', [
                'returned_count' => $transactions->count(),
                'total' => $transactions->total(),
                'per_page' => $transactions->perPage(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage()
            ]);

            return response()->json($transactions);

        } catch (\Exception $e) {
            Log::error('Failed to fetch transactions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'transactions_fetch_error',
                'error_details' => [
                    'type' => get_class($e),
                    'line' => $e->getLine(),
                    'file' => basename($e->getFile())
                ]
            ], 500);
        }
    }

    /**
     * Get transaction summary statistics
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTransactionSummary(Request $request)
    {
        try {
            $baseQuery = \App\Models\Transaction::query();

            // Apply date filters if provided
            if ($request->has('start_date') && $request->filled('start_date')) {
                $baseQuery->where('transaction_date', '>=', $request->input('start_date'));
            }

            if ($request->has('end_date') && $request->filled('end_date')) {
                $baseQuery->where('transaction_date', '<=', $request->input('end_date'));
            }

            // Clone queries for different calculations to avoid query state issues
            $firstTransaction = (clone $baseQuery)->orderBy('transaction_date', 'asc')->orderBy('id', 'asc')->first();
            $lastTransaction = (clone $baseQuery)->orderBy('transaction_date', 'desc')->orderBy('id', 'desc')->first();

            $summary = [
                'total_transactions' => (clone $baseQuery)->count(),
                'total_debit_amount' => (clone $baseQuery)->sum('debit_amount') ?? 0,
                'total_credit_amount' => (clone $baseQuery)->sum('credit_amount') ?? 0,
                'opening_balance' => $firstTransaction ? (float) $firstTransaction->balance : 0,
                'closing_balance' => $lastTransaction ? (float) $lastTransaction->balance : 0,
                'debit_transactions' => (clone $baseQuery)->where('debit_amount', '>', 0)->count(),
                'credit_transactions' => (clone $baseQuery)->where('credit_amount', '>', 0)->count(),
                'date_range' => [
                    'start' => (clone $baseQuery)->min('transaction_date'),
                    'end' => (clone $baseQuery)->max('transaction_date')
                ]
            ];

            return response()->json($summary);

        } catch (\Exception $e) {
            Log::error('Failed to fetch transaction summary', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'summary_fetch_error'
            ], 500);
        }
    }

    /**
     * Email reconciliation report
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function emailReport(Request $request)
    {
        try {
            $request->validate([
                'reportData' => 'required|array',
                'email' => 'required|email'
            ]);

            $reportData = $request->input('reportData');
            $email = $request->input('email');

            // Generate simplified PDF report for email attachment
            $pdf = Pdf::loadView('reports.reconciliation', compact('reportData'))
                     ->setPaper('a4', 'portrait')
                     ->setOptions([
                         'defaultFont' => 'sans-serif',
                         'isHtml5ParserEnabled' => false,
                         'isRemoteEnabled' => false,
                         'dpi' => 96,
                         'defaultMediaType' => 'print'
                     ]);
            $filename = 'reconciliation_report_' . ($reportData['reference'] ?? now()->format('Y-m-d_H-i-s')) . '.pdf';

            // Store PDF temporarily for email attachment
            $tempPath = 'temp/' . $filename;
            Storage::disk('local')->put($tempPath, $pdf->output());

            // Send email with PDF attachment
            Mail::raw('Please find attached your reconciliation report. This is an automated message from the Reconciliation System.', function ($message) use ($email, $filename, $tempPath, $reportData) {
                $message->to($email)
                        ->subject('Reconciliation Report - ' . ($reportData['reference'] ?? 'Generated Report'))
                        ->attach(storage_path('app/' . $tempPath), [
                            'as' => $filename,
                            'mime' => 'application/pdf'
                        ]);
            });

            // Clean up temporary file
            Storage::disk('local')->delete($tempPath);

            Log::info('Reconciliation report emailed successfully', [
                'email' => $email,
                'reference' => $reportData['reference'] ?? 'N/A'
            ]);

            return response()->json(['message' => 'Report sent successfully to ' . $email]);

        } catch (\Exception $e) {
            Log::error('Report email failed', [
                'error' => $e->getMessage(),
                'email' => $request->input('email'),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to send report: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Format validation errors into user-friendly messages
     *
     * @param array $errors
     * @return array
     */
    private function formatValidationErrors(array $errors)
    {
        $formatted = [];

        foreach ($errors as $field => $messages) {
            foreach ($messages as $message) {
                $formatted[] = [
                    'field' => $field,
                    'message' => $this->getUserFriendlyValidationMessage($field, $message)
                ];
            }
        }

        return $formatted;
    }

    /**
     * Convert validation messages to user-friendly format
     *
     * @param string $field
     * @param string $message
     * @return string
     */
    private function getUserFriendlyValidationMessage(string $field, string $message)
    {
        // File validation messages
        if ($field === 'file') {
            if (strpos($message, 'required') !== false) {
                return 'Please select a file to upload for reconciliation.';
            }
            if (strpos($message, 'file') !== false && strpos($message, 'must be a valid file') !== false) {
                return 'The selected item is not a valid file. Please choose a proper file.';
            }
            if (strpos($message, 'mimes') !== false) {
                return 'Invalid file type. Only CSV, Excel (.xlsx/.xls), and PDF files are accepted.';
            }
            if (strpos($message, 'max') !== false) {
                return 'File is too large. Maximum file size is 5MB.';
            }
        }

        // Mode validation messages
        if ($field === 'mode') {
            if (strpos($message, 'required') !== false) {
                return 'Please select a reconciliation mode (by period or by transaction ID).';
            }
            if (strpos($message, 'in') !== false) {
                return 'Invalid reconciliation mode selected.';
            }
        }

        // Date validation messages
        if (in_array($field, ['start_date', 'end_date'])) {
            if (strpos($message, 'date') !== false) {
                return ucfirst(str_replace('_', ' ', $field)) . ' must be a valid date.';
            }
            if (strpos($message, 'required_if') !== false) {
                return ucfirst(str_replace('_', ' ', $field)) . ' is required when using period-based reconciliation.';
            }
            if (strpos($message, 'after_or_equal') !== false) {
                return 'End date must be on or after the start date.';
            }
        }

        // Return original message if no specific formatting found
        return ucfirst($message);
    }

    /**
     * Convert technical exceptions to user-friendly error messages
     *
     * @param \Exception $e
     * @return string
     */
    private function getUserFriendlyErrorMessage(\Exception $e)
    {
        $message = $e->getMessage();

        // File upload related errors
        if (strpos($message, 'No data found in uploaded file') !== false) {
            return 'The uploaded file appears to be empty or contains no transaction data. Please check the file and try again.';
        }

        if (strpos($message, 'Unsupported file type') !== false) {
            return 'Unsupported file format. Please upload a CSV, Excel (.xlsx/.xls), or PDF file.';
        }

        if (strpos($message, 'Missing required columns') !== false) {
            return 'The file is missing required columns. Please ensure your file includes Transaction ID, Date, and Amount columns.';
        }

        if (strpos($message, 'File contains no valid column headers') !== false) {
            return 'Unable to read column headers from the file. Please check the file format and try again.';
        }

        if (strpos($message, 'Data validation errors') !== false) {
            return 'Some data in the file is invalid. Please check that dates are properly formatted and amounts are numeric.';
        }

        if (strpos($message, 'Could not open CSV file') !== false) {
            return 'Unable to read the uploaded file. The file may be corrupted or in an unsupported format.';
        }

        if (strpos($message, 'Failed to parse PDF') !== false) {
            return 'Unable to extract data from the PDF file. Please ensure it\'s a valid bank statement PDF.';
        }

        // Database related errors
        if (strpos($message, 'SQLSTATE[23000]') !== false && strpos($message, 'Duplicate entry') !== false) {
            return 'The uploaded file contains transaction IDs that already exist in the database. Please ensure all transaction IDs are unique or remove duplicate entries from your file.';
        }
        if (strpos($message, 'SQLSTATE') !== false || strpos($message, 'database') !== false) {
            return 'A database error occurred while processing your request. Please try again in a few moments.';
        }

        // Processing errors
        if (strpos($message, 'timeout') !== false || strpos($message, 'timed out') !== false) {
            return 'The reconciliation process took too long to complete. Please try with a smaller file or contact support.';
        }

        // Memory/storage errors
        if (strpos($message, 'Allowed memory size') !== false) {
            return 'The file is too large to process. Please try with a smaller file (maximum 5MB).';
        }

        if (strpos($message, 'disk space') !== false || strpos($message, 'storage') !== false) {
            return 'Insufficient storage space to process the file. Please contact support.';
        }

        // Generic fallback
        return 'An unexpected error occurred during reconciliation. Please try again or contact support if the problem persists.';
    }
}
