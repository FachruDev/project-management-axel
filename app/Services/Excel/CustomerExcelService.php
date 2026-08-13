<?php

namespace App\Services\Excel;

use App\Models\Customer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class CustomerExcelService
{
    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['name', 'email', 'company_name', 'company_address', 'is_active'];
    }

    public function preview(UploadedFile|string $file): ImportPreviewResult
    {
        $rows = ExcelWorkbook::sheets($file, 'Customers import')[0] ?? [];
        $headingErrors = ExcelWorkbook::headingErrors($rows, $this->headings(), 'Customers sheet', true);

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
            $name = ExcelRow::string($row, 'name');
            $companyName = ExcelRow::string($row, 'company_name');
            $email = ExcelRow::string($row, 'email');

            if ($name === null) {
                $rowErrors[] = "Customers row {$line}: name is required.";
            }

            if ($companyName === null) {
                $rowErrors[] = "Customers row {$line}: company_name is required.";
            }

            $customer = $email !== null
                ? Customer::query()->where('email', $email)->first()
                : ($name !== null && $companyName !== null
                    ? Customer::query()->where('name', $name)->where('company_name', $companyName)->first()
                    : null);

            array_push($errors, ...$rowErrors);

            $previewRows[] = [
                'row' => $line,
                'action' => $customer instanceof Customer ? 'update' : 'create',
                'status' => $rowErrors === [] ? 'valid' : 'error',
                'key' => $email ?? trim(($name ?? '').' / '.($companyName ?? '')),
                'values' => [
                    'name' => $name,
                    'email' => $email,
                    'company_name' => $companyName,
                    'company_address' => ExcelRow::string($row, 'company_address'),
                    'is_active' => ExcelRow::bool($row, 'is_active'),
                ],
                'errors' => $rowErrors,
            ];
        }

        return $this->previewResult($previewRows, $errors);
    }

    public function import(UploadedFile|string $file): ImportSummary
    {
        $rows = ExcelWorkbook::sheets($file, 'Customers import')[0] ?? [];
        $errors = [];
        $created = 0;
        $updated = 0;
        $headingErrors = ExcelWorkbook::headingErrors($rows, $this->headings(), 'Customers sheet', true);

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
                $name = ExcelRow::string($row, 'name');
                $companyName = ExcelRow::string($row, 'company_name');
                $email = ExcelRow::string($row, 'email');

                if ($name === null) {
                    $rowErrors[] = "Customers row {$line}: name is required.";
                }

                if ($companyName === null) {
                    $rowErrors[] = "Customers row {$line}: company_name is required.";
                }

                if ($rowErrors !== []) {
                    array_push($errors, ...$rowErrors);

                    continue;
                }

                $customer = $email !== null
                    ? Customer::query()->where('email', $email)->first()
                    : Customer::query()->where('name', $name)->where('company_name', $companyName)->first();

                $payload = [
                    'name' => $name,
                    'email' => $email,
                    'company_name' => $companyName,
                    'company_address' => ExcelRow::string($row, 'company_address'),
                    'is_active' => ExcelRow::bool($row, 'is_active'),
                ];

                if ($customer instanceof Customer) {
                    $customer->update($payload);
                    $updated++;

                    continue;
                }

                Customer::create($payload);
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
            ['Budi Santoso', 'budi.customer@example.com', 'PT Contoh Sukses', 'Jl. Contoh No. 1, Jakarta', 1],
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
                'name' => 'Customers',
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
