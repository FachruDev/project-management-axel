<?php

namespace App\Exports;

use App\Models\Holiday;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class HolidaysExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping
{
    /**
     * @return Collection<int, Holiday>
     */
    public function collection(): Collection
    {
        return Holiday::query()
            ->orderBy('date')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['date', 'name', 'type', 'is_working', 'description', 'is_active'];
    }

    /**
     * @return array<int, mixed>
     */
    public function map($row): array
    {
        return [
            $row->date?->toDateString(),
            $row->name,
            $row->type?->value,
            $row->is_working ? 1 : 0,
            $row->description,
            $row->is_active ? 1 : 0,
        ];
    }
}
