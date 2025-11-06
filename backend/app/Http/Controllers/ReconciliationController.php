<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\ReconciliationReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Smalot\PdfParser\Parser;

class ReconciliationController extends Controller
{
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
            $result['user'] = $request->user()->name;

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

            try {
                ReconciliationReport::create([
                    'reference' => $reference,
                    'reconciliation_date' => now(),
                    'total_debit' => (float) ($result['totalDebitVariance'] ?? 0),
                    'total_credit' => (float) ($result['totalCreditVariance'] ?? 0),
                    'net_change' => (float) ($result['netVariance'] ?? 0),
                    'reconciliation_mode' => $mode,
                    'period_start' => $mode === 'by_period' ? $startDate : null,
                    'period_end' => $mode === 'by_period' ? $endDate : null,
                    'total_records' => (int) $result['totalRecords'],
                    'matched_records' => (int) $result['matched'],
                    'discrepancies' => (int) $result['discrepancies'],
                    'discrepancy_details' => $result['records'],
                    'detailed_records' => $result['detailedRecords'] ?? [],
                    'status' => 'completed',
                ]);
                Log::info('Reconciliation report created successfully', ['reference' => $reference]);
            } catch (\Exception $dbError) {
                Log::error('Failed to create reconciliation report', [
                    'error' => $dbError->getMessage(),
                    'reference' => $reference,
                    'data' => [
                        'total_debit' => (float) ($result['totalDebitVariance'] ?? 0),
                        'total_credit' => (float) ($result['totalCreditVariance'] ?? 0),
                        'net_change' => (float) ($result['netVariance'] ?? 0),
                        'total_records' => (int) $result['totalRecords'],
                        'matched_records' => (int) $result['matched'],
                        'discrepancies' => (int) $result['discrepancies'],
                    ]
                ]);
                // Continue without saving to database for now
                Log::info('Continuing without database save');
            }

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

            // Check for potential data quality issues
            $completeRecordData = [
                'transaction_id' => $recordId,
                'document_record' => null, // No document for manual reconciliation
                'database_record' => $dbRecord->toArray(),
                'discrepancies' => []
            ];

            // Check for negative balances (potential issue)
            if ($dbRecord->balance < -1000) {
                $discrepancies++;
                $high++;

                $discrepancy = [
                    'id' => $recordId,
                    'field' => 'Balance',
                    'documentValue' => 'N/A',
                    'databaseValue' => number_format($dbRecord->balance, 2),
                    'difference' => 'Negative balance detected',
                    'type' => 'Data Quality',
                    'severity' => 'high',
                    'account' => $dbRecord->account_number
                ];

                $records[] = $discrepancy;
                $completeRecordData['discrepancies'][] = $discrepancy;
            }

            // Check for transactions with both debit and credit (data inconsistency)
            if ($dbRecord->debit_amount > 0 && $dbRecord->credit_amount > 0) {
                $discrepancies++;
                $critical++;

                $discrepancy = [
                    'id' => $recordId,
                    'field' => 'Transaction Amounts',
                    'documentValue' => 'N/A',
                    'databaseValue' => 'Debit: ' . number_format($dbRecord->debit_amount, 2) . ', Credit: ' . number_format($dbRecord->credit_amount, 2),
                    'difference' => 'Transaction has both debit and credit amounts',
                    'type' => 'Data Inconsistency',
                    'severity' => 'critical',
                    'account' => $dbRecord->account_number
                ];

                $records[] = $discrepancy;
                $completeRecordData['discrepancies'][] = $discrepancy;
            }

            // Check for missing descriptions
            if (empty(trim($dbRecord->description))) {
                $discrepancies++;
                $medium++;

                $discrepancy = [
                    'id' => $recordId,
                    'field' => 'Description',
                    'documentValue' => 'N/A',
                    'databaseValue' => 'Empty',
                    'difference' => 'Missing transaction description',
                    'type' => 'Missing Data',
                    'severity' => 'medium',
                    'account' => $dbRecord->account_number
                ];

                $records[] = $discrepancy;
                $completeRecordData['discrepancies'][] = $discrepancy;
            }

            // Check for unusual amounts (> €10,000)
            $totalAmount = $dbRecord->debit_amount + $dbRecord->credit_amount;
            if ($totalAmount > 10000) {
                $discrepancies++;
                $low++;

                $discrepancy = [
                    'id' => $recordId,
                    'field' => 'Amount',
                    'documentValue' => 'N/A',
                    'databaseValue' => number_format($totalAmount, 2),
                    'difference' => 'Large transaction amount detected',
                    'type' => 'Amount Alert',
                    'severity' => 'low',
                    'account' => $dbRecord->account_number
                ];

                $records[] = $discrepancy;
                $completeRecordData['discrepancies'][] = $discrepancy;
            }

            $detailedRecords[] = $completeRecordData;
        }

        $netVariance = $totalDebitVariance + $totalCreditVariance;
        $balanceStatus = abs($netVariance) < 0.01 ? 'In Balance' : 'Out of Balance';

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
            'detailedRecords' => $detailedRecords
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
            $documentData = $this->parseFile($fullPath, $extension);

            Log::info('File parsed successfully', [
                'record_count' => count($documentData),
                'sample_record' => !empty($documentData) ? array_slice($documentData, 0, 1) : null
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
            // Allow unlimited records for transaction ID based reconciliation
            elseif ($mode === 'by_transaction_id') {
                Log::info('Processing all records for transaction ID based reconciliation', ['record_count' => count($documentData)]);
            }

            // Update progress: Starting reconciliation
            $this->updateProgress($sessionId, [
                'step' => 'reconciliation_start',
                'progress' => 65,
                'message' => 'Starting reconciliation process...',
                'completed' => false
            ]);

            // Perform reconciliation against database
            $result = $this->performReconciliation($documentData, $mode, $request->input('start_date'), $request->input('end_date'));

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
            $result['user'] = $request->user()->name;

            // Save reconciliation report to database
            $reference = 'REC-' . now()->format('Ymd-His') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));

            ReconciliationReport::create([
                'reference' => $reference,
                'reconciliation_date' => now(),
                'total_debit' => $result['totalDebitVariance'] ?? 0,
                'total_credit' => $result['totalCreditVariance'] ?? 0,
                'net_change' => $result['netVariance'] ?? 0,
                'reconciliation_mode' => $mode,
                'period_start' => $mode === 'by_period' ? $request->input('start_date') : null,
                'period_end' => $mode === 'by_period' ? $request->input('end_date') : null,
                'total_records' => $result['totalRecords'],
                'matched_records' => $result['matched'],
                'discrepancies' => $result['discrepancies'],
                'discrepancy_details' => $result['records'],
                'detailed_records' => $result['detailedRecords'], // Store complete record details
                'status' => 'completed',
            ]);

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
                'file_path' => $e->getFile()
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
            throw new \Exception('Missing required columns: ' . implode('; ', $missingColumns));
        }

        // Validate data structure for first few rows (sample validation)
        $sampleSize = min(10, count($documentData)); // Check first 10 rows or all if less
        $validationErrors = [];

        for ($i = 0; $i < $sampleSize; $i++) {
            $row = $documentData[$i];
            $rowNumber = $i + 1;

            // Validate Transaction ID
            $transactionId = null;
            foreach (['transaction_id', 'id', 'Transaction ID', 'Txn ID', 'Transaction Id'] as $key) {
                if (isset($row[$key])) {
                    $transactionId = $row[$key];
                    break;
                }
            }

            if (empty($transactionId)) {
                $validationErrors[] = "Row {$rowNumber}: Missing Transaction ID";
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
        $totalRecords = count($documentData);
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
        $detailedRecords = []; // Store complete record details for reporting

        // Always get all records first, then filter by period if needed during matching
        $dbRecords = \App\Models\Transaction::select(['transaction_id', 'account_number', 'account_name', 'description', 'reference_number', 'debit_amount', 'credit_amount', 'balance', 'transaction_type', 'status', 'transaction_date'])
            ->get()
            ->keyBy('transaction_id');

        foreach ($documentData as $docRecord) {
            // Always identify records by transaction_id first (case-insensitive matching)
            $recordId = $docRecord['transaction_id'] ?? $docRecord['id'] ?? $docRecord['Transaction ID'] ?? $docRecord['Txn ID'] ?? $docRecord['Transaction Id'] ?? null;

            if (!$recordId) {
                $missing++;
                $records[] = [
                    'id' => 'Unknown',
                    'field' => 'Record ID',
                    'documentValue' => 'Missing',
                    'databaseValue' => null,
                    'difference' => 'No record ID in document',
                    'type' => 'Missing',
                    'severity' => 'critical',
                    'account' => $docRecord['account'] ?? $docRecord['account_number'] ?? 'Unknown'
                ];
                $critical++;
                continue;
            }

            // For period mode, filter database records by date range first (only if dates are provided)
            if ($mode === 'by_period' && $startDate && $endDate) {
                $filteredRecords = $dbRecords->filter(function($record) use ($startDate, $endDate) {
                    return $record->transaction_date >= $startDate && $record->transaction_date <= $endDate;
                });
                $dbRecordsForMatching = $filteredRecords;
            } else {
                $dbRecordsForMatching = $dbRecords;
            }

            if (!isset($dbRecordsForMatching[$recordId])) {
                $missing++;
                $records[] = [
                    'id' => $recordId,
                    'field' => 'Record',
                    'documentValue' => 'Present',
                    'databaseValue' => null,
                    'difference' => 'Record not found in database' . ($mode === 'by_period' ? ' for selected period' : ''),
                    'type' => 'Missing',
                    'severity' => 'high',
                    'account' => $docRecord['account'] ?? 'Unknown'
                ];
                $high++;
                continue;
            }

            $dbRecord = $dbRecordsForMatching[$recordId];
            $matched++;

            // Store complete record data for detailed reporting
            $completeRecordData = [
                'transaction_id' => $recordId,
                'document_record' => $docRecord,
                'database_record' => $dbRecord->toArray(),
                'discrepancies' => []
            ];

            // Compare fields that exist in both document and database
            $fieldsToCompare = [
                'account_number' => 'string',
                'account_name' => 'string',
                'description' => 'string',
                'reference_number' => 'string'
            ];

            // Normalize financial fields: handle combined amount and type (C/D) or separate debit/credit amounts
            $docTypeKey = $this->findFieldKey($docRecord, 'type');
            $docAmountKey = $this->findFieldKey($docRecord, 'amount');
            $docCdKey = $this->findFieldKey($docRecord, 'c/d');

            // Handle C/D column format (like in the CSV)
            if ($docCdKey && $docAmountKey) {
                $type = strtoupper(trim($docRecord[$docCdKey]));
                $amount = (float) $docRecord[$docAmountKey];
                if ($type === 'C') {
                    $docRecord['credit_amount'] = $amount;
                    $docRecord['debit_amount'] = 0;
                } elseif ($type === 'D') {
                    $docRecord['debit_amount'] = $amount;
                    $docRecord['credit_amount'] = 0;
                }
            }
            // Handle legacy type + amount format
            elseif ($docTypeKey && $docAmountKey) {
                $type = strtoupper(trim($docRecord[$docTypeKey]));
                $amount = (float) $docRecord[$docAmountKey];
                if ($type === 'C') {
                    $docRecord['credit_amount'] = $amount;
                    $docRecord['debit_amount'] = 0;
                } elseif ($type === 'D') {
                    $docRecord['debit_amount'] = $amount;
                    $docRecord['credit_amount'] = 0;
                }
            }

            // Check for financial fields if they exist in document (case insensitive)
            $financialFields = [];
            $docRecordLower = array_change_key_case($docRecord, CASE_LOWER);
            if (isset($docRecordLower['debit_amount']) || isset($docRecordLower['debit amount'])) $financialFields['debit_amount'] = 'decimal';
            if (isset($docRecordLower['credit_amount']) || isset($docRecordLower['credit amount'])) $financialFields['credit_amount'] = 'decimal';
            if (isset($docRecordLower['balance'])) $financialFields['balance'] = 'decimal';

            // Compare financial fields
            foreach ($financialFields as $field => $type) {
                // Handle case insensitive field names
                $docKey = $this->findFieldKey($docRecord, $field);
                $docValue = $docKey !== null ? (float) $docRecord[$docKey] : 0;
                $dbValue = isset($dbRecord->$field) ? (float) $dbRecord->$field : 0;

                if (abs($docValue - $dbValue) > 0.01) { // Allow for small floating point differences
                    $variance = $docValue - $dbValue;
                    $discrepancies++;
                    $mismatched++;

                    // Calculate variance impact
                    if ($field === 'debit_amount') {
                        $totalDebitVariance += $variance;
                    } elseif ($field === 'credit_amount') {
                        $totalCreditVariance += $variance;
                    }

                    // Determine severity based on variance amount
                    $severity = 'low';
                    if (abs($variance) >= 1000) {
                        $severity = 'critical';
                        $critical++;
                    } elseif (abs($variance) >= 100) {
                        $severity = 'high';
                        $high++;
                    } elseif (abs($variance) >= 10) {
                        $severity = 'medium';
                        $medium++;
                    } else {
                        $low++;
                    }

                    $discrepancy = [
                        'id' => $recordId,
                        'field' => ucfirst(str_replace('_', ' ', $field)),
                        'documentValue' => number_format($docValue, 2),
                        'databaseValue' => number_format($dbValue, 2),
                        'difference' => number_format($variance, 2),
                        'type' => 'Variance',
                        'severity' => $severity,
                        'account' => $docRecord['account'] ?? $recordId
                    ];

                    $records[] = $discrepancy;
                    $completeRecordData['discrepancies'][] = $discrepancy;
                }
            }

            // Compare text fields
            foreach ($fieldsToCompare as $field => $type) {
                $docKey = $this->findFieldKey($docRecord, $field);
                $docValue = $docKey !== null ? trim($docRecord[$docKey]) : '';
                $dbValue = trim($dbRecord->$field ?? '');

                if (strtolower($docValue) !== strtolower($dbValue)) {
                    $discrepancies++;
                    $mismatched++;

                    // Determine severity for text mismatches
                    $severity = 'low';
                    if (in_array($field, ['account_number', 'account_name'])) {
                        $severity = 'high';
                        $high++;
                    } elseif (in_array($field, ['description', 'reference_number'])) {
                        $severity = 'medium';
                        $medium++;
                    } else {
                        $low++;
                    }

                    $discrepancy = [
                        'id' => $recordId,
                        'field' => ucfirst(str_replace('_', ' ', $field)),
                        'documentValue' => $docValue,
                        'databaseValue' => $dbValue,
                        'difference' => 'Text mismatch',
                        'type' => 'Mismatch',
                        'severity' => $severity,
                        'account' => $docRecord['account_number'] ?? $recordId
                    ];

                    $records[] = $discrepancy;
                    $completeRecordData['discrepancies'][] = $discrepancy;
                }
            }

            // Compare any additional fields that might exist
            $additionalFields = ['transaction_type', 'status'];
            foreach ($additionalFields as $field) {
                $docKey = $this->findFieldKey($docRecord, $field);
                if ($docKey !== null) {
                    $docValue = trim($docRecord[$docKey]);
                    $dbValue = isset($dbRecord->$field) ? trim($dbRecord->$field) : '';

                    if (strtolower($docValue) !== strtolower($dbValue)) {
                        $discrepancies++;
                        $mismatched++;

                        $severity = in_array($field, ['transaction_type']) ? 'high' : 'medium';
                        ${$severity}++;

                        $discrepancy = [
                            'id' => $recordId,
                            'field' => ucfirst(str_replace('_', ' ', $field)),
                            'documentValue' => $docValue,
                            'databaseValue' => $dbValue,
                            'difference' => 'Field mismatch',
                            'type' => 'Mismatch',
                            'severity' => $severity,
                            'account' => $docRecord['account_number'] ?? $docRecord['account'] ?? $recordId
                        ];

                        $records[] = $discrepancy;
                        $completeRecordData['discrepancies'][] = $discrepancy;
                    }
                }
            }

            // Add complete record data to detailed records array
            $detailedRecords[] = $completeRecordData;
        }

        $netVariance = $totalDebitVariance + $totalCreditVariance;
        $balanceStatus = abs($netVariance) < 0.01 ? 'In Balance' : 'Out of Balance';

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
            'detailedRecords' => $detailedRecords // Include complete record details
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
                'reportData' => 'required|array',
                'format' => 'required|in:pdf,xlsx'
            ]);

            $reference = $request->input('reference');
            $reportData = $request->input('reportData');
            $format = $request->input('format');

            // If reference is provided, fetch from database
            if ($reference) {
                $report = ReconciliationReport::where('reference', $reference)->first();
                if ($report) {
                    $reportData = [
                        'reference' => $report->reference,
                        'reconciliation_date' => $report->reconciliation_date->toISOString(),
                        'total_debit' => $report->total_debit,
                        'total_credit' => $report->total_credit,
                        'net_change' => $report->net_change,
                        'reconciliation_mode' => $report->reconciliation_mode,
                        'period_start' => $report->period_start ? $report->period_start->toISOString() : null,
                        'period_end' => $report->period_end ? $report->period_end->toISOString() : null,
                        'total_records' => $report->total_records,
                        'matched' => $report->matched_records,
                        'discrepancies' => $report->discrepancies,
                        'records' => $report->discrepancy_details ?? [],
                        'comparisonTime' => 'N/A (from database)',
                        'timestamp' => $report->created_at->toISOString(),
                        'user' => $request->user()->name,
                    ];
                }
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
            $reports = ReconciliationReport::orderBy('created_at', 'desc')
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

            $trends = ReconciliationReport::where('created_at', '>=', $startDate)
                ->orderBy('created_at')
                ->select([
                    'created_at',
                    'discrepancies',
                    'total_records',
                    'total_debit',
                    'total_credit',
                    'net_change'
                ])
                ->get()
                ->map(function ($report) {
                    return [
                        'date' => $report->created_at->format('Y-m-d'),
                        'discrepancies' => $report->discrepancies,
                        'total_records' => $report->total_records,
                        'discrepancy_rate' => $report->total_records > 0
                            ? round(($report->discrepancies / $report->total_records) * 100, 2)
                            : 0,
                        'total_debit_variance' => abs($report->total_debit),
                        'total_credit_variance' => abs($report->total_credit),
                        'net_variance' => abs($report->net_change)
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
            $report = ReconciliationReport::where('reference', $reference)->first();

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
            Log::error('Failed to fetch transactions', ['error' => $e->getMessage()]);
            $userFriendlyMessage = $this->getUserFriendlyErrorMessage($e);
            return response()->json([
                'message' => $userFriendlyMessage,
                'error_type' => 'transactions_fetch_error'
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
            $query = \App\Models\Transaction::query();

            // Apply date filters if provided
            if ($request->has('start_date') && $request->filled('start_date')) {
                $query->where('transaction_date', '>=', $request->input('start_date'));
            }

            if ($request->has('end_date') && $request->filled('end_date')) {
                $query->where('transaction_date', '<=', $request->input('end_date'));
            }

            $firstTransaction = $query->orderBy('transaction_date', 'asc')->orderBy('id', 'asc')->first();
            $lastTransaction = $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc')->first();

            $summary = [
                'total_transactions' => $query->count(),
                'total_debit_amount' => $query->sum('debit_amount'),
                'total_credit_amount' => $query->sum('credit_amount'),
                'opening_balance' => $firstTransaction ? $firstTransaction->balance : 0,
                'closing_balance' => $lastTransaction ? $lastTransaction->balance : 0,
                'debit_transactions' => $query->where('debit_amount', '>', 0)->count(),
                'credit_transactions' => $query->where('credit_amount', '>', 0)->count(),
                'date_range' => [
                    'start' => $query->min('transaction_date'),
                    'end' => $query->max('transaction_date')
                ]
            ];

            return response()->json($summary);

        } catch (\Exception $e) {
            Log::error('Failed to fetch transaction summary', ['error' => $e->getMessage()]);
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
