<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;

class ReconciliationController extends Controller
{
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
            $request->validate([
                'file' => 'required|file|mimes:pdf,xlsx,xls,csv,doc,docx|max:10240', // 10MB max
            ]);

            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());

            // Store file temporarily
            $path = $file->store('temp', 'local');
            $fullPath = storage_path('app/' . $path);

            // Parse file based on type
            $documentData = $this->parseFile($fullPath, $extension);

            if (empty($documentData)) {
                throw new \Exception('No data found in uploaded file');
            }

            // Perform reconciliation against database
            $result = $this->performReconciliation($documentData);

            // Add metadata
            $result['comparisonTime'] = round(microtime(true) - $startTime, 2) . ' seconds';
            $result['timestamp'] = now()->toISOString();
            $result['user'] = 'Anonymous'; // Remove auth check for unauthenticated access

            // Clean up temp file
            Storage::disk('local')->delete($path);

            Log::info('Reconciliation completed successfully', [
                'file' => $file->getClientOriginalName(),
                'totalRecords' => $result['totalRecords'],
                'discrepancies' => $result['discrepancies'],
                'user' => $result['user']
            ]);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Reconciliation failed', [
                'error' => $e->getMessage(),
                'file' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : 'Unknown'
            ]);

            return response()->json([
                'message' => 'Reconciliation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    private function parseFile($filePath, $extension)
    {
        switch ($extension) {
            case 'csv':
                return $this->parseCsv($filePath);
            case 'xlsx':
            case 'xls':
                return $this->parseExcel($filePath);
            case 'pdf':
                return $this->parsePdf($filePath);
            case 'doc':
            case 'docx':
                return $this->parseDoc($filePath);
            default:
                throw new \Exception('Unsupported file type');
        }
    }

    private function parseCsv($filePath)
    {
        $data = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            $headers = fgetcsv($handle, 1000, ',');
            if (!$headers) {
                throw new \Exception('Invalid CSV format');
            }

            while (($row = fgetcsv($handle, 1000, ',')) !== false) {
                if (count($row) === count($headers)) {
                    $data[] = array_combine($headers, $row);
                }
            }
            fclose($handle);
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

    private function parseDoc($filePath)
    {
        // Basic DOC parsing - this is simplified
        // For now, return empty as DOC parsing is complex
        Log::warning('DOC parsing not fully implemented');
        return [];
    }

    private function performReconciliation($documentData)
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

        // Get all transactions from database keyed by transaction_id
        $dbRecords = \App\Models\Transaction::all()->keyBy('transaction_id');

        foreach ($documentData as $docRecord) {
            // Assume CSV has columns: transaction_id, account_number, account_name, debit_amount, credit_amount, etc.
            $recordId = $docRecord['transaction_id'] ?? $docRecord['id'] ?? null;

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
                    'account' => $docRecord['account'] ?? 'Unknown'
                ];
                $critical++;
                continue;
            }

            if (!isset($dbRecords[$recordId])) {
                $missing++;
                $records[] = [
                    'id' => $recordId,
                    'field' => 'Record',
                    'documentValue' => 'Present',
                    'databaseValue' => null,
                    'difference' => 'Record not found in database',
                    'type' => 'Missing',
                    'severity' => 'high',
                    'account' => $docRecord['account'] ?? 'Unknown'
                ];
                $high++;
                continue;
            }

            $dbRecord = $dbRecords[$recordId];
            $matched++;

            // Compare fields that exist in both document and database
            $fieldsToCompare = [
                'account_number' => 'string',
                'account_name' => 'string',
                'description' => 'string',
                'reference_number' => 'string'
            ];

            // Check for financial fields if they exist in document
            $financialFields = [];
            if (isset($docRecord['debit_amount'])) $financialFields['debit_amount'] = 'decimal';
            if (isset($docRecord['credit_amount'])) $financialFields['credit_amount'] = 'decimal';
            if (isset($docRecord['balance'])) $financialFields['balance'] = 'decimal';

            // Compare financial fields
            foreach ($financialFields as $field => $type) {
                $docValue = isset($docRecord[$field]) ? (float) $docRecord[$field] : 0;
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

                    $records[] = [
                        'id' => $recordId,
                        'field' => ucfirst(str_replace('_', ' ', $field)),
                        'documentValue' => number_format($docValue, 2),
                        'databaseValue' => number_format($dbValue, 2),
                        'difference' => number_format($variance, 2),
                        'type' => 'Variance',
                        'severity' => $severity,
                        'account' => $docRecord['account'] ?? $recordId
                    ];
                }
            }

            // Compare text fields
            foreach ($fieldsToCompare as $field => $type) {
                $docValue = trim($docRecord[$field] ?? '');
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

                    $records[] = [
                        'id' => $recordId,
                        'field' => ucfirst(str_replace('_', ' ', $field)),
                        'documentValue' => $docValue,
                        'databaseValue' => $dbValue,
                        'difference' => 'Text mismatch',
                        'type' => 'Mismatch',
                        'severity' => $severity,
                        'account' => $docRecord['account_number'] ?? $recordId
                    ];
                }
            }

            // Compare any additional fields that might exist
            $additionalFields = ['transaction_type', 'status'];
            foreach ($additionalFields as $field) {
                if (isset($docRecord[$field])) {
                    $docValue = trim($docRecord[$field]);
                    $dbValue = isset($dbRecord->$field) ? trim($dbRecord->$field) : '';

                    if (strtolower($docValue) !== strtolower($dbValue)) {
                        $discrepancies++;
                        $mismatched++;

                        $severity = in_array($field, ['transaction_type']) ? 'high' : 'medium';
                        ${$severity}++;

                        $records[] = [
                            'id' => $recordId,
                            'field' => ucfirst(str_replace('_', ' ', $field)),
                            'documentValue' => $docValue,
                            'databaseValue' => $dbValue,
                            'difference' => 'Field mismatch',
                            'type' => 'Mismatch',
                            'severity' => $severity,
                            'account' => $docRecord['account_number'] ?? $recordId
                        ];
                    }
                }
            }
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
            'records' => $records
        ];
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
                'reportData' => 'required|array',
                'format' => 'required|in:pdf,xlsx'
            ]);

            $reportData = $request->input('reportData');
            $format = $request->input('format');

            if ($format === 'pdf') {
                // Generate PDF report
                $pdf = Pdf::loadView('reports.reconciliation', compact('reportData'));
                $filename = 'reconciliation_report_' . now()->format('Y-m-d_H-i-s') . '.pdf';
                return $pdf->download($filename);
            } else {
                // Generate Excel report
                return Excel::download(new ReconciliationReportExport($reportData), 'reconciliation_report_' . now()->format('Y-m-d_H-i-s') . '.xlsx');
            }

        } catch (\Exception $e) {
            Log::error('Report download failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to generate report'], 500);
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
                'reportData' => 'required|array'
            ]);

            $reportData = $request->input('reportData');
            // For unauthenticated access, skip email functionality or use a default
            return response()->json(['message' => 'Email functionality disabled for unauthenticated access'], 403);

            return response()->json(['message' => 'Report sent successfully']);

        } catch (\Exception $e) {
            Log::error('Report email failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to send report'], 500);
        }
    }
}
