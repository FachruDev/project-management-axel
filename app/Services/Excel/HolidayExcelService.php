<?php

namespace App\Services\Excel;

use App\Enums\HolidayType;
use App\Imports\RawExcelImport;
use App\Models\Holiday;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class HolidayExcelService
{
    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['date', 'name', 'type', 'is_working', 'description', 'is_active'];
    }

    public function import(UploadedFile $file): ImportSummary
    {
        $rows = Excel::toArray(new RawExcelImport, $file)[0] ?? [];
        $errors = [];
        $created = 0;
        $updated = 0;

        return DB::transaction(function () use ($rows, &$errors, &$created, &$updated): ImportSummary {
            foreach ($rows as $index => $row) {
                if (ExcelRow::blank($row)) {
                    continue;
                }

                $line = $index + 2;
                $rowErrors = [];
                $date = ExcelRow::date($row, 'date');
                $name = ExcelRow::string($row, 'name');
                $type = ExcelRow::string($row, 'type') ?? HolidayType::National->value;

                if ($date === null) {
                    $rowErrors[] = "Holidays row {$line}: valid date is required.";
                }

                if ($name === null) {
                    $rowErrors[] = "Holidays row {$line}: name is required.";
                }

                if (! in_array($type, [HolidayType::National->value, HolidayType::Company->value], true)) {
                    $rowErrors[] = "Holidays row {$line}: type must be national or company.";
                }

                if ($rowErrors !== []) {
                    array_push($errors, ...$rowErrors);

                    continue;
                }

                $holiday = Holiday::query()->whereDate('date', $date)->first();
                $payload = [
                    'date' => $date,
                    'name' => $name,
                    'type' => $type,
                    'is_working' => ExcelRow::bool($row, 'is_working', false),
                    'description' => ExcelRow::string($row, 'description'),
                    'is_active' => ExcelRow::bool($row, 'is_active'),
                ];

                if ($holiday instanceof Holiday) {
                    $holiday->update($payload);
                    $updated++;

                    continue;
                }

                Holiday::create($payload);
                $created++;
            }

            if ($errors !== []) {
                throw new ExcelImportException($errors);
            }

            return new ImportSummary($created, $updated);
        });
    }
}
