<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Transaction;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // Real transaction data from CSV - October 1, 2025 transactions first
        $csvData = "Date\tService\tReference\tAmount\tcommission\tAmount to Settle\tCurrency\tC/D\tPaid At\tPaid By\tPayer Contact\tTransaction Id\tStatus\tNarration\tReceipt No\tComment
01/10/2025 08:24\tKowri Services\tsmarfo@npontu.com\t99100\t0\t0\tGHS\tC\tDreamOval\tPhilip Essel\tphilip.essel@kowri.app\t6.36391E+14\tCONFIRMED\tTopup of Npontu Technologies Switching Account account by DreamOval\tN/A\tN/A
01/10/2025 09:03\tMTN Money MADAPI\t2.33548E+11\t9542\t0\t9542\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112547POpMWX1759309378\tCONFIRMED\tWARC Africa\t65991463250\tN/A
01/10/2025 09:04\tMTN Money MADAPI\t2.33594E+11\t654.48\t0\t654.48\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112512PQriP41759309472\tCONFIRMED\tWARC Africa\t65991580215\tN/A
01/10/2025 09:05\tMTN Money MADAPI\t2.33532E+11\t90.9\t0\t90.9\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112519PZxPmh1759309516\tCONFIRMED\tWARC Africa\t65991632391\tN/A
01/10/2025 09:07\tMTN Money MADAPI\t2.33247E+11\t2036\t0\t2036\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112535PIfGmp1759309658\tCONFIRMED\tWARC Africa\t65991808466\tN/A
01/10/2025 09:09\tMTN Money MADAPI\t2.33541E+11\t1181.7\t0\t1181.7\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112539PHBmJO1759309767\tCONFIRMED\tWARC Africa\t65991942222\tN/A
01/10/2025 09:10\tMTN Money MADAPI\t2.33556E+11\t909\t0\t909\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112510PR8QzW1759309798\tCONFIRMED\tWARC Africa\t65991980004\tN/A
01/10/2025 09:10\tMTN Money MADAPI\t2.33556E+11\t36.36\t0\t36.36\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112514Pm7BsX1759309814\tCONFIRMED\tWARC Africa\t65991998252\tN/A
01/10/2025 09:10\tMTN Money MADAPI\t2.33597E+11\t454.5\t0\t454.5\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112548P7ROhg1759309834\tCONFIRMED\tWARC Africa\t65992024316\tN/A
01/10/2025 09:10\tMTN Money MADAPI\t2.33547E+11\t172.71\t0\t172.71\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112528PBXh1W1759309848\tCONFIRMED\tWARC Africa\t65992042128\tN/A";

        $realTransactions = [];
        $lines = explode("\n", $csvData);
        $headers = str_getcsv(array_shift($lines), "\t");

        foreach ($lines as $line) {
            if (empty(trim($line))) continue;
            $data = str_getcsv($line, "\t");

            $record = array_combine($headers, $data);
            $amount = (float) $record['Amount'];
            $type = strtoupper($record['C/D']);

            // Convert DD/MM/YYYY HH:MM to YYYY-MM-DD HH:MM:SS
            $dateTimeParts = explode(' ', $record['Date']);
            $dateParts = explode('/', $dateTimeParts[0]);
            $date = $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0] . ' ' . $dateTimeParts[1] . ':00';

            $transaction = [
                'transaction_id' => $record['Transaction Id'],
                'account_number' => 'Npontu Technologies Switching Account',
                'account_name' => 'Npontu Technologies',
                'debit_amount' => ($type === 'D') ? $amount : 0.00,
                'credit_amount' => ($type === 'C') ? $amount : 0.00,
                'transaction_type' => ($type === 'D') ? 'Debit' : 'Credit',
                'transaction_date' => $date,
                'description' => $record['Narration'],
                'reference_number' => $record['Reference'],
                'balance' => 0.00, // Will be calculated
                'status' => strtolower($record['Status']),
            ];

            $realTransactions[] = $transaction;
        }

        // Calculate running balance
        $balance = 0;
        foreach ($realTransactions as &$transaction) {
            if ($transaction['transaction_type'] === 'Credit') {
                $balance += $transaction['credit_amount'];
            } else {
                $balance -= $transaction['debit_amount'];
            }
            $transaction['balance'] = $balance;
        }

        // Sample transaction data based on the provided image (moved to later dates)
        $transactions = [
            [
                'transaction_id' => 'TXN001',
                'account_number' => '1001-001',
                'account_name' => 'John Doe',
                'debit_amount' => 1500.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-15',
                'description' => 'Salary payment',
                'reference_number' => 'SAL-2025-001',
                'balance' => 1500.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN002',
                'account_number' => '1001-001',
                'account_name' => 'John Doe',
                'debit_amount' => 0.00,
                'credit_amount' => 250.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-16',
                'description' => 'ATM withdrawal',
                'reference_number' => 'ATM-2025-001',
                'balance' => 1250.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN003',
                'account_number' => '1001-002',
                'account_name' => 'Jane Smith',
                'debit_amount' => 800.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-15',
                'description' => 'Transfer from savings',
                'reference_number' => 'TRF-2025-001',
                'balance' => 800.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN004',
                'account_number' => '1001-002',
                'account_name' => 'Jane Smith',
                'debit_amount' => 0.00,
                'credit_amount' => 150.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-17',
                'description' => 'Online purchase',
                'reference_number' => 'WEB-2025-001',
                'balance' => 650.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN005',
                'account_number' => '1001-003',
                'account_name' => 'Bob Johnson',
                'debit_amount' => 2000.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-14',
                'description' => 'Business deposit',
                'reference_number' => 'DEP-2025-001',
                'balance' => 2000.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN006',
                'account_number' => '1001-003',
                'account_name' => 'Bob Johnson',
                'debit_amount' => 0.00,
                'credit_amount' => 500.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-18',
                'description' => 'Check payment',
                'reference_number' => 'CHK-2025-001',
                'balance' => 1500.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN007',
                'account_number' => '1001-004',
                'account_name' => 'Alice Brown',
                'debit_amount' => 1200.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-16',
                'description' => 'Investment return',
                'reference_number' => 'INV-2025-001',
                'balance' => 1200.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN008',
                'account_number' => '1001-004',
                'account_name' => 'Alice Brown',
                'debit_amount' => 0.00,
                'credit_amount' => 300.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-19',
                'description' => 'Utility bill payment',
                'reference_number' => 'UTIL-2025-001',
                'balance' => 900.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN009',
                'account_number' => '1001-005',
                'account_name' => 'Charlie Wilson',
                'debit_amount' => 750.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-17',
                'description' => 'Freelance payment',
                'reference_number' => 'FR-2025-001',
                'balance' => 750.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN010',
                'account_number' => '1001-005',
                'account_name' => 'Charlie Wilson',
                'debit_amount' => 0.00,
                'credit_amount' => 125.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-20',
                'description' => 'Subscription service',
                'reference_number' => 'SUB-2025-001',
                'balance' => 625.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN011',
                'account_number' => '1001-001',
                'account_name' => 'John Doe',
                'debit_amount' => 0.00,
                'credit_amount' => 75.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-21',
                'description' => 'Bank fee',
                'reference_number' => 'FEE-2025-001',
                'balance' => 1175.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN012',
                'account_number' => '1001-002',
                'account_name' => 'Jane Smith',
                'debit_amount' => 400.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-22',
                'description' => 'Cash deposit',
                'reference_number' => 'CD-2025-001',
                'balance' => 1050.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN013',
                'account_number' => '1001-003',
                'account_name' => 'Bob Johnson',
                'debit_amount' => 0.00,
                'credit_amount' => 200.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-23',
                'description' => 'Refund',
                'reference_number' => 'REF-2025-001',
                'balance' => 1700.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN014',
                'account_number' => '1001-004',
                'account_name' => 'Alice Brown',
                'debit_amount' => 600.00,
                'credit_amount' => 0.00,
                'transaction_type' => 'Debit',
                'transaction_date' => '2025-01-24',
                'description' => 'Insurance payment',
                'reference_number' => 'INS-2025-001',
                'balance' => 1500.00,
                'status' => 'posted',
            ],
            [
                'transaction_id' => 'TXN015',
                'account_number' => '1001-005',
                'account_name' => 'Charlie Wilson',
                'debit_amount' => 0.00,
                'credit_amount' => 50.00,
                'transaction_type' => 'Credit',
                'transaction_date' => '2025-01-25',
                'description' => 'Interest earned',
                'reference_number' => 'INT-2025-001',
                'balance' => 675.00,
                'status' => 'posted',
            ],
        ];

        // Create additional transactions to reach ~500 records
        $additionalTransactions = [];

        // Generate more diverse transactions
        $customers = [
            ['account' => '1001-001', 'name' => 'John Doe'],
            ['account' => '1001-002', 'name' => 'Jane Smith'],
            ['account' => '1001-003', 'name' => 'Bob Johnson'],
            ['account' => '1001-004', 'name' => 'Alice Brown'],
            ['account' => '1001-005', 'name' => 'Charlie Wilson'],
            ['account' => '1001-006', 'name' => 'David Lee'],
            ['account' => '1001-007', 'name' => 'Emma Davis'],
            ['account' => '1001-008', 'name' => 'Frank Miller'],
            ['account' => '1001-009', 'name' => 'Grace Wilson'],
            ['account' => '1001-010', 'name' => 'Henry Taylor'],
        ];

        $debitDescriptions = [
            'Salary payment', 'Business deposit', 'Investment return', 'Transfer from savings',
            'Cash deposit', 'Insurance payment', 'Freelance payment', 'Loan repayment',
            'Tax refund', 'Bonus payment', 'Commission', 'Dividend payment',
            'Rental income', 'Sale proceeds', 'Grant received', 'Reimbursement'
        ];

        $creditDescriptions = [
            'ATM withdrawal', 'Online purchase', 'Utility bill payment', 'Bank fee',
            'Subscription service', 'Check payment', 'Credit card payment', 'Insurance premium',
            'Loan payment', 'Tax payment', 'Subscription renewal', 'Service charge',
            'ATM fee', 'Overdraft fee', 'Wire transfer fee', 'Check printing fee'
        ];

        $startDate = strtotime('2025-01-01');
        $endDate = strtotime('2025-12-31');

        // Generate ~485 more transactions
        for ($i = 16; $i <= 500; $i++) {
            $customer = $customers[array_rand($customers)];
            $isDebit = rand(0, 1);
            $randomDate = date('Y-m-d', rand($startDate, $endDate));

            $transaction = [
                'transaction_id' => 'TXN' . str_pad($i, 3, '0', STR_PAD_LEFT),
                'account_number' => $customer['account'],
                'account_name' => $customer['name'],
                'transaction_date' => $randomDate,
                'status' => 'posted',
            ];

            if ($isDebit) {
                $amount = rand(10, 5000) + (rand(0, 99) / 100); // Random amount 10.00 to 5000.99
                $transaction['debit_amount'] = $amount;
                $transaction['credit_amount'] = 0.00;
                $transaction['transaction_type'] = 'Debit';
                $transaction['description'] = $debitDescriptions[array_rand($debitDescriptions)];
                $transaction['reference_number'] = strtoupper(substr($transaction['description'], 0, 3)) . '-' . date('Y', strtotime($randomDate)) . '-' . str_pad($i, 3, '0', STR_PAD_LEFT);
            } else {
                $amount = rand(5, 1000) + (rand(0, 99) / 100); // Random amount 5.00 to 1000.99
                $transaction['debit_amount'] = 0.00;
                $transaction['credit_amount'] = $amount;
                $transaction['transaction_type'] = 'Credit';
                $transaction['description'] = $creditDescriptions[array_rand($creditDescriptions)];
                $transaction['reference_number'] = strtoupper(substr($transaction['description'], 0, 3)) . '-' . date('Y', strtotime($randomDate)) . '-' . str_pad($i, 3, '0', STR_PAD_LEFT);
            }

            // Calculate running balance (simplified - in real app this would be more complex)
            $transaction['balance'] = rand(100, 10000) + (rand(0, 99) / 100);

            $additionalTransactions[] = $transaction;
        }

        // Insert real October transactions first (skip duplicates)
        foreach ($realTransactions as $transaction) {
            Transaction::firstOrCreate(
                ['transaction_id' => $transaction['transaction_id']],
                $transaction
            );
        }

        // Insert sample transactions (moved to later dates, skip duplicates)
        foreach ($transactions as $transaction) {
            Transaction::firstOrCreate(
                ['transaction_id' => $transaction['transaction_id']],
                $transaction
            );
        }

        // Insert additional transactions in chunks to avoid memory issues
        foreach (array_chunk($additionalTransactions, 50) as $chunk) {
            Transaction::insert($chunk);
        }
    }
}
