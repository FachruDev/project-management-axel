<?php

namespace App\Services\Excel;

use App\Imports\RawExcelImport;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use Throwable;

class ExcelWorkbook
{
    /**
     * @return array<int, array<int, array<string, mixed>>>
     */
    public static function sheets(UploadedFile $file, string $context): array
    {
        try {
            return Excel::toArray(new RawExcelImport, $file);
        } catch (Throwable $exception) {
            throw new ExcelImportException([
                "{$context}: file could not be read. Make sure it is a valid .xlsx/.xls/.csv file downloaded from the latest template.",
                'Parser error: '.$exception->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $requiredHeadings
     * @return array<int, string>
     */
    public static function headingErrors(array $rows, array $requiredHeadings, string $sheet, bool $requireData = false): array
    {
        if ($rows === []) {
            return $requireData
                ? ["{$sheet}: no data rows found. Keep the header row and add at least one data row."]
                : [];
        }

        $headings = array_keys($rows[0] ?? []);
        $missing = array_values(array_diff($requiredHeadings, $headings));

        if ($missing === []) {
            return [];
        }

        return [
            "{$sheet}: missing required columns: ".implode(', ', $missing).'. Download the latest template and keep the header row unchanged.',
        ];
    }
}
