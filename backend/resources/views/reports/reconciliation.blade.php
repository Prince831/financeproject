<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reconciliation Report - {{ $reportData['reference'] ?? 'Generated Report' }}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #6c757d;
            margin: 5px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #495057;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-card .value {
            font-size: 20px;
            font-weight: bold;
            color: #007bff;
        }
        .financial-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .financial-card {
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .debit-card {
            background: #fff5f5;
            border: 1px solid #fed7d7;
        }
        .credit-card {
            background: #f0fff4;
            border: 1px solid #c6f6d5;
        }
        .net-card {
            background: #ebf8ff;
            border: 1px solid #bee3f8;
        }
        .financial-card h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .financial-card .value {
            font-size: 20px;
            font-weight: bold;
        }
        .debit-card .value { color: #e53e3e; }
        .credit-card .value { color: #38a169; }
        .net-card .value { color: #3182ce; }
        .discrepancies-section {
            margin-top: 30px;
        }
        .discrepancies-section h2 {
            color: #495057;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-size: 12px;
        }
        th, td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background: #007bff;
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        .severity-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .severity-critical { background: #fed7d7; color: #c53030; }
        .severity-high { background: #feb2b2; color: #9b2c2c; }
        .severity-medium { background: #fbd38d; color: #744210; }
        .severity-low { background: #c6f6d5; color: #22543d; }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .no-discrepancies {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        .no-discrepancies svg {
            width: 48px;
            height: 48px;
            margin-bottom: 15px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reconciliation Report</h1>
            <p><strong>Reference:</strong> {{ $reportData['reference'] ?? 'N/A' }}</p>
            <p><strong>Generated:</strong> {{ date('F j, Y \a\t g:i A', strtotime($reportData['timestamp'])) }}</p>
            <p><strong>User:</strong> {{ $reportData['user'] ?? 'Anonymous' }}</p>
            <p><strong>Processing Time:</strong> {{ $reportData['comparisonTime'] ?? 'N/A' }}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Records</h3>
                <div class="value">{{ number_format($reportData['totalRecords']) }}</div>
            </div>
            <div class="summary-card">
                <h3>Matched Records</h3>
                <div class="value">{{ number_format($reportData['matched']) }}</div>
            </div>
            <div class="summary-card">
                <h3>Discrepancies</h3>
                <div class="value">{{ number_format($reportData['discrepancies']) }}</div>
            </div>
            <div class="summary-card">
                <h3>Balance Status</h3>
                <div class="value">{{ $reportData['balanceStatus'] ?? 'Unknown' }}</div>
            </div>
        </div>

        <div class="financial-summary">
            <div class="financial-card debit-card">
                <h3>Total Debit Variance</h3>
                <div class="value">${{ number_format($reportData['totalDebitVariance'] ?? 0, 2) }}</div>
            </div>
            <div class="financial-card credit-card">
                <h3>Total Credit Variance</h3>
                <div class="value">${{ number_format($reportData['totalCreditVariance'] ?? 0, 2) }}</div>
            </div>
            <div class="financial-card net-card">
                <h3>Net Change</h3>
                <div class="value">${{ number_format($reportData['netVariance'] ?? 0, 2) }}</div>
            </div>
        </div>

        <div class="discrepancies-section">
            <h2>Discrepancy Details</h2>

            @if(empty($reportData['records']))
                <div class="no-discrepancies">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <h3>No Discrepancies Found</h3>
                    <p>All records matched successfully!</p>
                </div>
            @else
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Account</th>
                            <th>Field</th>
                            <th>Document Value</th>
                            <th>Database Value</th>
                            <th>Difference</th>
                            <th>Severity</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($reportData['records'] as $record)
                        <tr>
                            <td>{{ $record['id'] }}</td>
                            <td>{{ $record['account'] ?? 'N/A' }}</td>
                            <td>{{ $record['field'] }}</td>
                            <td>{{ $record['documentValue'] }}</td>
                            <td>{{ $record['databaseValue'] ?? '-' }}</td>
                            <td>{{ $record['difference'] }}</td>
                            <td>
                                <span class="severity-badge severity-{{ strtolower($record['severity']) }}">
                                    {{ $record['severity'] }}
                                </span>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>

        <div class="footer">
            <p>This report was generated by the Reconciliation System on {{ date('F j, Y \a\t g:i A') }}</p>
        </div>
    </div>
</body>
</html>