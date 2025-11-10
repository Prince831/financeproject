<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'transaction_id' => 'TXN' . $this->faker->unique()->numberBetween(100000, 999999),
            'account_number' => 'Npontu Technologies Switching Account',
            'account_name' => 'Npontu Technologies',
            'description' => $this->faker->randomElement([
                'Payment received',
                'Transfer received',
                'Bill payment',
                'Topup received',
                'Customer payment',
                'Account credit',
                'Funds transfer',
                'Payment from customer'
            ]),
            'reference_number' => $this->faker->unique()->numerify('##########'),
            'debit_amount' => $this->faker->randomFloat(2, 0, 50000),
            'credit_amount' => $this->faker->randomFloat(2, 0, 50000),
            'balance' => $this->faker->randomFloat(2, -50000, 100000),
            'transaction_type' => $this->faker->randomElement(['Credit', 'Debit']),
            'status' => 'confirmed',
            'transaction_date' => $this->faker->dateTimeBetween('-6 months', 'now'),
        ];
    }
}
