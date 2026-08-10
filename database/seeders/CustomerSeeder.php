<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = [
            [
                'name' => 'Internal IT Requester',
                'email' => 'it.requester@galenium.com',
                'company_name' => 'PT Galenium Pharmasia Laboratories',
                'company_address' => 'Jakarta, Indonesia',
            ],
            [
                'name' => 'Operations Representative',
                'email' => 'operations@galenium.com',
                'company_name' => 'PT Galenium Pharmasia Laboratories',
                'company_address' => 'Jakarta, Indonesia',
            ],
            [
                'name' => 'Quality Assurance Representative',
                'email' => 'qa@galenium.com',
                'company_name' => 'PT Galenium Pharmasia Laboratories',
                'company_address' => 'Jakarta, Indonesia',
            ],
        ];

        foreach ($customers as $customer) {
            Customer::updateOrCreate(
                ['email' => $customer['email']],
                [
                    ...$customer,
                    'is_active' => true,
                ],
            );
        }
    }
}
