<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class UsersExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping
{
    /**
     * @return Collection<int, User>
     */
    public function collection(): Collection
    {
        return User::query()
            ->with(['department', 'roles'])
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['name', 'email', 'external_id', 'department_code', 'roles', 'password', 'is_active'];
    }

    /**
     * @return array<int, mixed>
     */
    public function map($row): array
    {
        return [
            $row->name,
            $row->email,
            $row->external_id,
            $row->department?->code,
            $row->roles->pluck('name')->implode(','),
            '',
            $row->is_active ? 1 : 0,
        ];
    }
}
