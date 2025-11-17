# Reconciliation Process - Usage Guide

The reconciliation system is fully integrated and can be used in multiple ways:

## 1. Web Interface (Primary Method)

### Steps:
1. Log into the portal
2. Select "By Transaction ID" mode
3. Click "Upload Kowri File"
4. Select your CSV/Excel file
5. Click "Reconcile"
6. View the results in the report

### Supported File Formats:
- CSV (.csv)
- Excel (.xlsx, .xls)
- Text (.txt)
- PDF (.pdf)

### Required Columns:
- **Transaction ID** (or variations: `transaction_id`, `Transaction ID`, `Transaction ID/Reference`, etc.)
- **Date** (or variations: `date`, `transaction_date`, `Date and Time`, etc.)
- **Amount** (or variations: `amount`, `debit_amount`, `credit_amount`, etc.)

## 2. Command Line - Artisan Command (Integrated)

### Basic Usage:
```bash
php artisan reconcile:file /path/to/your/file.csv
```

### With Options:
```bash
php artisan reconcile:file /path/to/file.csv \
  --mode=by_transaction_id \
  --date-tolerance=0 \
  --amount-tolerance=0
```

### For Period Mode:
```bash
php artisan reconcile:file /path/to/file.csv \
  --mode=by_period \
  --start-date=2025-10-01 \
  --end-date=2025-10-31 \
  --date-tolerance=1 \
  --amount-tolerance=0.01
```

### Options:
- `--mode`: Reconciliation mode (`by_period` or `by_transaction_id`)
- `--start-date`: Start date for period mode (YYYY-MM-DD)
- `--end-date`: End date for period mode (YYYY-MM-DD)
- `--date-tolerance`: Date tolerance in days (default: 0)
- `--amount-tolerance`: Amount tolerance (default: 0)

## 3. Wrapper Script (Legacy Support)

The wrapper script now uses the integrated Artisan command:

```bash
php run_full_reconciliation.php /path/to/your/file.csv
```

This is equivalent to using the Artisan command directly.

## Reconciliation Results

The system provides:

1. **Uploaded File Records**: Total count of records in your file
2. **Matched**: Records found in both file and database
3. **File-Only (Missing in Database)**: Records in file but not in database
4. **Database-Only (Not in File)**: Records in database but not in file
5. **Total Discrepancies**: Sum of file-only and database-only
6. **Match Rate**: Percentage of matched records
7. **Balance Status**: Overall reconciliation status

## Integration Details

### Core Components:

1. **ReconciliationController** (`app/Http/Controllers/ReconciliationController.php`)
   - Main reconciliation logic
   - Handles file parsing, validation, and processing
   - Methods:
     - `reconcile()` - Web API endpoint
     - `reconcileManual()` - Manual reconciliation endpoint
     - `performTransactionIdPresenceReconciliation()` - Transaction ID matching
     - `performReconciliation()` - Period-based reconciliation

2. **ReconcileFile Command** (`app/Console/Commands/ReconcileFile.php`)
   - Artisan command for command-line reconciliation
   - Uses the same logic as the web interface
   - Provides formatted output

3. **File Parsing**:
   - CSV/TXT: Custom parser with flexible delimiter detection
   - Excel: Uses Maatwebsite\Excel library
   - PDF: Text extraction and parsing
   - Automatic column name detection (case-insensitive)

4. **Transaction ID Extraction**:
   - Supports multiple column name variations
   - Case-insensitive matching
   - Handles special characters (slashes, spaces, underscores)

## Example Output

```
=== RECONCILIATION RESULTS ===

Uploaded File Records: 996
Matched: 994
File-Only (Missing in Database): 2
Database-Only (Not in File): 0
Total Discrepancies: 2
Balance Status: Out of Balance

Match Rate: 99.80%
Discrepancy Rate: 0.20%
```

## Notes

- All reconciliation runs are saved to the `reconciliation_runs` table
- Each run gets a unique reference number
- Full reconciliation payload is stored for later retrieval
- Reports can be downloaded as PDF or Excel
- History can be viewed in the portal's history dropdown

## Troubleshooting

### File Not Parsing:
- Check file format (CSV, Excel, TXT, or PDF)
- Ensure required columns exist (Transaction ID, Date, Amount)
- Check file encoding (UTF-8 recommended)

### No Matches Found:
- Verify transaction IDs in file match database format
- Check for extra spaces or special characters
- Ensure database has transactions with matching IDs

### Performance Issues:
- Large files (>1000 rows) may take longer
- Consider splitting very large files
- Check server memory limits

