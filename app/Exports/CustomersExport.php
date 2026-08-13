<?php

namespace App\Exports;

use App\Models\Customer;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class CustomersExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping
{
    /**
     * @return Collection<int, Customer>
     */
    public function collection(): Collection
    {
        return Customer::query()
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['name', 'email', 'company_name', 'company_address', 'is_active'];
    }

    /**
     * @return array<int, mixed>
     */
    public function map($row): array
    {
        return [
            $row->name,
            $row->email,
            $row->company_name,
            $row->company_address,
            $row->is_active ? 1 : 0,
        ];
    }
}
