<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Create admin user for testing
        User::firstOrCreate(
            ['email' => 'admin@npontu.com'],
            [
                'name' => 'Admin User',
                'email' => 'admin@npontu.com',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Create additional test users
        $testUsers = [
            [
                'name' => 'John Finance',
                'email' => 'john.finance@npontu.com',
                'password' => Hash::make('finance123'),
            ],
            [
                'name' => 'Sarah Accounting',
                'email' => 'sarah.accounting@npontu.com',
                'password' => Hash::make('accounting123'),
            ],
            [
                'name' => 'Mike Operations',
                'email' => 'mike.operations@npontu.com',
                'password' => Hash::make('operations123'),
            ],
        ];

        foreach ($testUsers as $userData) {
            User::firstOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, ['email_verified_at' => now()])
            );
        }

        $this->command->info('User seeder completed successfully!');
        $this->command->info('Test accounts created:');
        $this->command->info('- admin@npontu.com (password: password123)');
        $this->command->info('- john.finance@npontu.com (password: finance123)');
        $this->command->info('- sarah.accounting@npontu.com (password: accounting123)');
        $this->command->info('- mike.operations@npontu.com (password: operations123)');
    }
}
