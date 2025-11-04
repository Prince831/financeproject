<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Models\ReconciliationReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;

class ReconciliationController extends Controller
{
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
            $result['user'] = 'Anonymous';

            // Save reconciliation report to database
            $reference = 'MANUAL-' . now()->format('Ymd-His') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));

            ReconciliationReport::create([
                'reference' => $reference,
                'reconciliation_date' => now(),
                'total_debit' => $result['totalDebitVariance'] ?? 0,
                'total_credit' => $result['totalCreditVariance'] ?? 0,
                'net_change' => $result['netVariance'] ?? 0,
                'reconciliation_mode' => $mode,
                'period_start' => $mode === 'by_period' ? $startDate : null,
                'period_end' => $mode === 'by_period' ? $endDate : null,
                'total_records' => $result['totalRecords'],
                'matched_records' => $result['matched'],
                'discrepancies' => $result['discrepancies'],
                'discrepancy_details' => $result['records'],
                'detailed_records' => $result['detailedRecords'] ?? [],
                'status' => 'completed',
            ]);

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

            return response()->json([
                'message' => 'Manual reconciliation failed: ' . $e->getMessage(),
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

        try {
            Log::info('Starting reconciliation process', [
                'has_file' => $request->hasFile('file'),
                'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'No file',
                'mode' => $request->input('mode'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'all_input' => $request->all()
            ]);

            try {
                $request->validate([
                    'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:5120', // 5MB max for faster processing
                    'mode' => 'required|in:by_period,by_transaction_id',
                    'start_date' => 'nullable|date|required_if:mode,by_period',
                    'end_date' => 'nullable|date|required_if:mode,by_period|after_or_equal:start_date',
                ], [
                    'file.required' => 'A file must be uploaded for reconciliation.',
                    'file.file' => 'The uploaded item must be a valid file.',
                    'file.mimes' => 'Only CSV, XLS, XLSX, and TXT files are accepted.',
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
                return response()->json([
                    'error' => 'Validation failed',
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

            // Store file temporarily
            $path = $file->store('temp', 'local');
            $fullPath = storage_path('app/' . $path);

            Log::info('File stored temporarily', ['path' => $path, 'full_path' => $fullPath]);

            // Parse file based on type
            $documentData = $this->parseFile($fullPath, $extension);

            Log::info('File parsed successfully', [
                'record_count' => count($documentData),
                'sample_record' => !empty($documentData) ? array_slice($documentData, 0, 1) : null
            ]);

            if (empty($documentData)) {
                throw new \Exception('No data found in uploaded file');
            }

            // Only limit processing for period-based reconciliation to maintain performance
            if ($mode === 'by_period' && count($documentData) > 500) {
                $documentData = array_slice($documentData, 0, 500);
                Log::info('File truncated to 500 records for period-based reconciliation performance', ['original_count' => count($documentData)]);
            }
            // Allow unlimited records for transaction ID based reconciliation
            elseif ($mode === 'by_transaction_id') {
                Log::info('Processing all records for transaction ID based reconciliation', ['record_count' => count($documentData)]);
            }

            // Perform reconciliation against database
            $result = $this->performReconciliation($documentData, $mode, $request->input('start_date'), $request->input('end_date'));

            // Add metadata
            $result['comparisonTime'] = round(microtime(true) - $startTime, 2) . ' seconds';
            $result['timestamp'] = now()->toISOString();
            $result['user'] = 'Anonymous'; // Remove auth check for unauthenticated access

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

            Log::info('Reconciliation completed successfully', [
                'file' => $file->getClientOriginalName(),
                'reference' => $reference,
                'totalRecords' => $result['totalRecords'],
                'discrepancies' => $result['discrepancies'],
                'user' => $result['user']
            ]);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Reconciliation failed', [
                'error' => $e->getMessage(),
                'file' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'Unknown',
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file_path' => $e->getFile()
            ]);

            return response()->json([
                'message' => 'Reconciliation failed: ' . $e->getMessage(),
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
            default:
                throw new \Exception('Unsupported file type. Only CSV, TXT, and Excel files are accepted.');
        }
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
        // Basic PDF parsing - this is simplified, you might need more robust parsing
        // For now, return empty as PDF parsing is complex
        Log::warning('PDF parsing not fully implemented');
        return [];
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
                'user' => 'Anonymous',
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
            return response()->json(['message' => 'Failed to export PDF: ' . $e->getMessage()], 500);
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
            return response()->json(['message' => 'Failed to export data: ' . $e->getMessage()], 500);
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
                        'user' => 'Anonymous',
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
            return response()->json(['message' => 'Failed to generate report'], 500);
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
            return response()->json(['message' => 'Failed to fetch reports'], 500);
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
            return response()->json(['message' => 'Failed to fetch trends'], 500);
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
            return response()->json(['message' => 'Failed to fetch report'], 500);
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

            // Pagination
            $perPage = $request->input('per_page', 50);
            $page = $request->input('page', 1);

            $transactions = $query->orderBy('transaction_date', 'desc')
                                 ->orderBy('id', 'desc')
                                 ->paginate($perPage, ['*'], 'page', $page);

            return response()->json($transactions);

        } catch (\Exception $e) {
            Log::error('Failed to fetch transactions', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch transactions'], 500);
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
            return response()->json(['message' => 'Failed to fetch summary'], 500);
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
}
