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

    public function import(UploadedFile $file): ImportSummary
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
}
