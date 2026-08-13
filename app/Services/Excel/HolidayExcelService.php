<?php

namespace App\Services\Excel;

use App\Enums\HolidayType;
use App\Models\Holiday;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class HolidayExcelService
{
    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['date', 'name', 'type', 'is_working', 'description', 'is_active'];
    }

    public function preview(UploadedFile|string $file): ImportPreviewResult
    {
        $rows = ExcelWorkbook::sheets($file, 'Holidays import')[0] ?? [];
        $headingErrors = ExcelWorkbook::headingErrors($rows, $this->headings(), 'Holidays sheet', true);

        if ($headingErrors !== []) {
            return $this->previewResult([], $headingErrors);
        }

        $previewRows = [];
        $errors = [];

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

            $holiday = $date === null ? null : Holiday::query()->whereDate('date', $date)->first();
            array_push($errors, ...$rowErrors);

            $previewRows[] = [
                'row' => $line,
                'action' => $holiday instanceof Holiday ? 'update' : 'create',
                'status' => $rowErrors === [] ? 'valid' : 'error',
                'key' => $date ?? $name,
                'values' => [
                    'date' => $date,
                    'name' => $name,
                    'type' => $type,
                    'is_working' => ExcelRow::bool($row, 'is_working', false),
                    'description' => ExcelRow::string($row, 'description'),
                    'is_active' => ExcelRow::bool($row, 'is_active'),
                ],
                'errors' => $rowErrors,
            ];
        }

        return $this->previewResult($previewRows, $errors);
    }

    public function import(UploadedFile|string $file): ImportSummary
    {
        $rows = ExcelWorkbook::sheets($file, 'Holidays import')[0] ?? [];
        $errors = [];
        $created = 0;
        $updated = 0;
        $headingErrors = ExcelWorkbook::headingErrors($rows, $this->headings(), 'Holidays sheet', true);

        if ($headingErrors !== []) {
            throw new ExcelImportException($headingErrors);
        }

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

    /**
     * @return array<int, array<int, mixed>>
     */
    public function sampleRows(): array
    {
        return [
            ['2026-08-17', 'Hari Kemerdekaan', HolidayType::National->value, 0, 'Libur nasional', 1],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     */
    private function previewResult(array $rows, array $errors): ImportPreviewResult
    {
        return new ImportPreviewResult(
            [[
                'name' => 'Holidays',
                'columns' => $this->headings(),
                'rows' => $rows,
            ]],
            $errors,
            [
                'total' => count($rows),
                'valid' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'valid')),
                'errors' => count($errors),
                'creates' => count(array_filter($rows, fn (array $row): bool => $row['action'] === 'create' && $row['status'] === 'valid')),
                'updates' => count(array_filter($rows, fn (array $row): bool => $row['action'] === 'update' && $row['status'] === 'valid')),
                'skips' => 0,
            ],
        );
    }
}
