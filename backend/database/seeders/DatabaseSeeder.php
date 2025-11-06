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
        $this->call(UserSeeder::class);

        // Generate mock transaction data in CSV format - October 1, 2025 and beyond
        $csvLines = [
            "Date\tService\tReference\tAmount\tcommission\tAmount to Settle\tCurrency\tC/D\tPaid At\tPaid By\tPayer Contact\tTransaction Id\tStatus\tNarration\tReceipt No\tComment",
            "01/10/2025 08:24\tKowri Services\tsmarfo@npontu.com\t99100\t0\t0\tGHS\tC\tDreamOval\tPhilip Essel\tphilip.essel@kowri.app\t112001P8f3a4b1759309378\tCONFIRMED\tTopup of Npontu Technologies Switching Account account by DreamOval\tN/A\tN/A",
            "01/10/2025 09:03\tMTN Money MADAPI\t2.33548E+11\t9542\t0\t9542\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112002P9c5d6e1759309472\tCONFIRMED\tWARC Africa\t65991463250\tN/A",
            "01/10/2025 09:04\tMTN Money MADAPI\t2.33594E+11\t654.48\t0\t654.48\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112003Pf7g8h91759309516\tCONFIRMED\tWARC Africa\t65991580215\tN/A",
            "01/10/2025 09:05\tMTN Money MADAPI\t2.33532E+11\t90.9\t0\t90.9\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112004Pj1k2l31759309658\tCONFIRMED\tWARC Africa\t65991632391\tN/A",
            "01/10/2025 09:07\tMTN Money MADAPI\t2.33247E+11\t2036\t0\t2036\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112005Pm3n4o51759309767\tCONFIRMED\tWARC Africa\t65991808466\tN/A",
            "01/10/2025 09:09\tMTN Money MADAPI\t2.33541E+11\t1181.7\t0\t1181.7\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112006Pq5r6s71759309798\tCONFIRMED\tWARC Africa\t65991942222\tN/A",
            "01/10/2025 09:10\tMTN Money MADAPI\t2.33556E+11\t909\t0\t909\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112007Pt7u8v91759309814\tCONFIRMED\tWARC Africa\t65991980004\tN/A",
            "01/10/2025 09:10\tMTN Money MADAPI\t2.33556E+11\t36.36\t0\t36.36\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112008Pw9x0y11759309834\tCONFIRMED\tWARC Africa\t65991998252\tN/A",
            "01/10/2025 09:10\tMTN Money MADAPI\t2.33597E+11\t454.5\t0\t454.5\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112009Pz1a2b31759309848\tCONFIRMED\tWARC Africa\t65992024316\tN/A",
            "01/10/2025 09:10\tMTN Money MADAPI\t2.33547E+11\t172.71\t0\t172.71\tGHS\tD\tNpontu Technologies Switching Account\tWARC Africa\tN/A\t112010Pc3d4e51759309862\tCONFIRMED\tWARC Africa\t65992042128\tN/A"
        ];

        // Services for mock data
        $services = ['MTN Money MADAPI', 'Telecel Cash', 'Kowri Services', 'Airtel Money', 'Vodafone Cash'];
        $paidByOptions = ['WARC Africa', 'DreamOval', 'Philip Essel', 'Customer A', 'Customer B', 'Customer C'];
        $payerContacts = ['N/A', 'customer1@example.com', 'customer2@example.com', '+233123456789', '+233987654321'];
        $narrations = [
            'WARC Africa', 'Topup of Npontu Technologies Switching Account account by DreamOval',
            'Payment from customer', 'Service fee', 'Transfer received', 'Bill payment'
        ];

        // Generate additional mock CSV lines
        $startTimestamp = strtotime('2025-10-01 09:00:00');
        for ($i = 12; $i <= 998; $i++) {
            $timestamp = $startTimestamp + ($i * 60); // Increment by 1 minute
            $date = date('d/m/Y H:i', $timestamp);
            $service = $services[array_rand($services)];
            $reference = rand(1, 2) === 1 ? '2.' . rand(33200, 33599) . 'E+11' : 'customer' . rand(100, 999) . '@example.com';
            $amount = rand(10, 50000) + (rand(0, 99) / 100); // Random amount 10.00 to 50000.99
            $commission = 0;
            $amountToSettle = $amount;
            $currency = 'GHS';
            $cd = rand(0, 1) ? 'D' : 'C'; // Debit or Credit
            $paidAt = $cd === 'C' ? 'DreamOval' : 'Npontu Technologies Switching Account';
            $paidBy = $paidByOptions[array_rand($paidByOptions)];
            $payerContact = $payerContacts[array_rand($payerContacts)];
            $transactionId = '112' . str_pad($i, 3, '0', STR_PAD_LEFT) . 'P' . substr(md5($i), 0, 6) . rand(1000000000, 9999999999);
            $status = 'CONFIRMED';
            $narration = $narrations[array_rand($narrations)];
            $receiptNo = rand(10000000000, 99999999999);
            $comment = rand(0, 1) ? 'N/A' : 'The service request is processed successfully.';

            $csvLines[] = "$date\t$service\t$reference\t$amount\t$commission\t$amountToSettle\t$currency\t$cd\t$paidAt\t$paidBy\t$payerContact\t$transactionId\t$status\t$narration\t$receiptNo\t$comment";
        }

        $csvData = implode("\n", $csvLines);

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


        // Insert all transactions from CSV data (skip duplicates)
        foreach ($realTransactions as $transaction) {
            Transaction::firstOrCreate(
                ['transaction_id' => $transaction['transaction_id']],
                $transaction
            );
        }
    }
}
