<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Npontu Technologies - Account Statement Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1a202c;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            margin: 20px auto;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        /* Header Section */
        .header {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            padding: 40px 40px 30px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .company-info {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .logo {
            width: 60px;
            height: 60px;
            background: rgba(255,255,255,0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20px;
            backdrop-filter: blur(10px);
        }
        .logo-text {
            font-size: 24px;
            font-weight: 700;
            color: white;
        }
        .company-details h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            color: white;
        }
        .company-details p {
            font-size: 16px;
            margin: 5px 0 0 0;
            opacity: 0.9;
        }
        .report-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .meta-item {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }
        .meta-label {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.8);
            margin-bottom: 5px;
        }
        .meta-value {
            font-size: 14px;
            font-weight: 500;
            color: white;
        }
        /* Content Section */
        .content {
            padding: 40px;
        }

        /* Summary Cards */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.2s ease;
        }
        .summary-card:hover {
            transform: translateY(-2px);
        }
        .summary-card h3 {
            margin: 0 0 15px 0;
            color: #64748b;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #0ea5e9;
            margin-bottom: 5px;
        }
        .summary-card .subtitle {
            font-size: 12px;
            color: #94a3b8;
            font-weight: 500;
        }

        /* Financial Summary */
        .financial-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .financial-card {
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
        }
        .financial-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
        }
        .debit-card {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }
        .debit-card::before { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .credit-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }
        .credit-card::before { background: linear-gradient(90deg, #22c55e, #16a34a); }
        .net-card {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }
        .net-card::before { background: linear-gradient(90deg, #3b82f6, #2563eb); }
        .financial-card h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            color: #374151;
        }
        .financial-card .value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .debit-card .value { color: #dc2626; }
        .credit-card .value { color: #16a34a; }
        .net-card .value { color: #2563eb; }
        .financial-card .subtitle {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
        }
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
            <div class="header-content">
                <div class="company-info">
                    <div class="logo">
                        <div class="logo-text">NT</div>
                    </div>
                    <div class="company-details">
                        <h1>Npontu Technologies</h1>
                        <p>Financial Technology Solutions</p>
                    </div>
                </div>
                <div class="report-meta">
                    <div class="meta-item">
                        <div class="meta-label">Report Reference</div>
                        <div class="meta-value">{{ $reportData['reference'] ?? 'N/A' }}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Generated Date</div>
                        <div class="meta-value">{{ date('M j, Y \a\t g:i A', strtotime($reportData['timestamp'])) }}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Processing Time</div>
                        <div class="meta-value">{{ $reportData['comparisonTime'] ?? 'N/A' }}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Generated By</div>
                        <div class="meta-value">{{ $reportData['user'] ?? 'System' }}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="content">

            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Records</h3>
                    <div class="value">{{ number_format($reportData['totalRecords']) }}</div>
                    <div class="subtitle">Transactions Processed</div>
                </div>
                <div class="summary-card">
                    <h3>Matched Records</h3>
                    <div class="value">{{ number_format($reportData['matched']) }}</div>
                    <div class="subtitle">Successfully Matched</div>
                </div>
                <div class="summary-card">
                    <h3>Discrepancies</h3>
                    <div class="value">{{ number_format($reportData['discrepancies']) }}</div>
                    <div class="subtitle">Require Attention</div>
                </div>
                <div class="summary-card">
                    <h3>Balance Status</h3>
                    <div class="value">{{ $reportData['balanceStatus'] ?? 'Unknown' }}</div>
                    <div class="subtitle">Reconciliation Status</div>
                </div>
            </div>

            <div class="financial-summary">
                <div class="financial-card debit-card">
                    <h3>Total Debit Variance</h3>
                    <div class="value">€{{ number_format(abs($reportData['totalDebitVariance'] ?? 0), 2) }}</div>
                    <div class="subtitle">Debit Amount Differences</div>
                </div>
                <div class="financial-card credit-card">
                    <h3>Total Credit Variance</h3>
                    <div class="value">€{{ number_format(abs($reportData['totalCreditVariance'] ?? 0), 2) }}</div>
                    <div class="subtitle">Credit Amount Differences</div>
                </div>
                <div class="financial-card net-card">
                    <h3>Net Change</h3>
                    <div class="value">€{{ number_format(abs($reportData['netVariance'] ?? 0), 2) }}</div>
                    <div class="subtitle">Total Variance Amount</div>
                </div>
            </div>

            @if(isset($reportData['transactions']) && !empty($reportData['transactions']))
            <div class="transactions-section">
                <h2>Transaction Details</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Description</th>
                                <th>Reference</th>
                                <th style="text-align: right;">Debit</th>
                                <th style="text-align: right;">Credit</th>
                                <th style="text-align: right;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($reportData['transactions'] as $transaction)
                            <tr>
                                <td>{{ date('M j, Y g:i A', strtotime($transaction['transaction_date'])) }}</td>
                                <td>{{ $transaction['description'] }}</td>
                                <td>{{ $transaction['reference_number'] }}</td>
                                <td class="amount-cell debit-amount" style="text-align: right;">
                                    {{ $transaction['debit_amount'] > 0 ? '€' . number_format($transaction['debit_amount'], 2) : '-' }}
                                </td>
                                <td class="amount-cell credit-amount" style="text-align: right;">
                                    {{ $transaction['credit_amount'] > 0 ? '€' . number_format($transaction['credit_amount'], 2) : '-' }}
                                </td>
                                <td class="amount-cell balance-amount" style="text-align: right;">
                                    €{{ number_format($transaction['balance'], 2) }}
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
            @endif

            <div class="discrepancies-section">
                <h2>Discrepancy Analysis</h2>

                @if(empty($reportData['records']))
                    <div class="no-discrepancies">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <h3>Perfect Reconciliation</h3>
                        <p>All records matched successfully with no discrepancies found!</p>
                    </div>
                @else
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Account</th>
                                    <th>Field</th>
                                    <th>Expected Value</th>
                                    <th>Actual Value</th>
                                    <th>Variance</th>
                                    <th>Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($reportData['records'] as $record)
                                <tr>
                                    <td><strong>{{ $record['id'] }}</strong></td>
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
                    </div>
                @endif
            </div>

        </div>

        <div class="footer">
            <p><strong>Npontu Technologies Reconciliation System</strong> • Report generated on {{ date('F j, Y \a\t g:i A T') }}</p>
            <p style="margin-top: 5px; font-size: 12px; opacity: 0.8;">This is an automated financial reconciliation report. Please review all discrepancies carefully.</p>
        </div>
    </div>
</body>
</html>