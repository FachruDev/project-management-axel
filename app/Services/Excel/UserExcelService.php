<?php

namespace App\Services\Excel;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class UserExcelService
{
    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['name', 'email', 'external_id', 'department_code', 'roles', 'password', 'is_active'];
    }

    public function preview(UploadedFile|string $file): ImportPreviewResult
    {
        $rows = ExcelWorkbook::sheets($file, 'Users import')[0] ?? [];
        $headingErrors = ExcelWorkbook::headingErrors($rows, $this->headings(), 'Users sheet', true);

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
            $email = ExcelRow::string($row, 'email');
            $externalId = ExcelRow::string($row, 'external_id');
            $password = ExcelRow::string($row, 'password');
            $user = $email === null ? null : User::query()->where('email', $email)->first();

            if ($name === null) {
                $rowErrors[] = "Users row {$line}: name is required.";
            }

            if ($email === null) {
                $rowErrors[] = "Users row {$line}: email is required.";
            }

            if (! $user instanceof User && $password === null) {
                $rowErrors[] = "Users row {$line}: password is required for new users.";
            }

            $departmentCode = ExcelRow::string($row, 'department_code');

            if ($departmentCode !== null && ! Department::query()->where('code', $departmentCode)->exists()) {
                $rowErrors[] = "Users row {$line}: department_code {$departmentCode} was not found.";
            }

            $roleNames = $this->roleNames(ExcelRow::string($row, 'roles'));
            $unknownRoles = array_values(array_diff($roleNames, Role::query()->whereIn('name', $roleNames)->pluck('name')->all()));

            if ($unknownRoles !== []) {
                $rowErrors[] = "Users row {$line}: unknown roles ".implode(', ', $unknownRoles).'.';
            }

            array_push($errors, ...$rowErrors);

            $previewRows[] = [
                'row' => $line,
                'action' => $user instanceof User ? 'update' : 'create',
                'status' => $rowErrors === [] ? 'valid' : 'error',
                'key' => $email ?? $name,
                'values' => [
                    'name' => $name,
                    'email' => $email,
                    'external_id' => $externalId,
                    'department_code' => $departmentCode,
                    'roles' => implode(', ', $roleNames),
                    'password' => $password === null ? null : '[provided]',
                    'is_active' => ExcelRow::bool($row, 'is_active'),
                ],
                'errors' => $rowErrors,
            ];
        }

        return $this->previewResult($previewRows, $errors);
    }

    public function import(UploadedFile|string $file): ImportSummary
    {
        $rows = ExcelWorkbook::sheets($file, 'Users import')[0] ?? [];
        $errors = [];
        $created = 0;
        $updated = 0;
        $headingErrors = ExcelWorkbook::headingErrors($rows, $this->headings(), 'Users sheet', true);

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
                $email = ExcelRow::string($row, 'email');
                $externalId = ExcelRow::string($row, 'external_id');
                $password = ExcelRow::string($row, 'password');
                $user = $email === null ? null : User::query()->where('email', $email)->first();

                if ($name === null) {
                    $rowErrors[] = "Users row {$line}: name is required.";
                }

                if ($email === null) {
                    $rowErrors[] = "Users row {$line}: email is required.";
                }

                if (! $user instanceof User && $password === null) {
                    $rowErrors[] = "Users row {$line}: password is required for new users.";
                }

                $departmentId = null;
                $departmentCode = ExcelRow::string($row, 'department_code');

                if ($departmentCode !== null) {
                    $department = Department::query()->where('code', $departmentCode)->first();

                    if (! $department instanceof Department) {
                        $rowErrors[] = "Users row {$line}: department_code {$departmentCode} was not found.";
                    } else {
                        $departmentId = $department->id;
                    }
                }

                $roleNames = $this->roleNames(ExcelRow::string($row, 'roles'));
                $unknownRoles = array_values(array_diff($roleNames, Role::query()->whereIn('name', $roleNames)->pluck('name')->all()));

                if ($unknownRoles !== []) {
                    $rowErrors[] = "Users row {$line}: unknown roles ".implode(', ', $unknownRoles).'.';
                }

                if ($rowErrors !== []) {
                    array_push($errors, ...$rowErrors);

                    continue;
                }

                $payload = [
                    'name' => $name,
                    'email' => $email,
                    'external_id' => $externalId,
                    'department_id' => $departmentId,
                    'is_active' => ExcelRow::bool($row, 'is_active'),
                ];

                if ($password !== null) {
                    $payload['password'] = $password;
                }

                if ($user instanceof User) {
                    $user->update($payload);
                    $updated++;
                } else {
                    $user = User::create($payload);
                    $created++;
                }

                $user->syncRoles($roleNames);
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
            ['Admin Contoh', 'admin.contoh@example.com', 'EXT-001', 'IT', 'admin,support', 'change-me-123', 1],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function roleNames(?string $value): array
    {
        if ($value === null) {
            return [];
        }

        return collect(explode(',', $value))
            ->map(fn (string $role): string => trim($role))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $errors
     */
    private function previewResult(array $rows, array $errors): ImportPreviewResult
    {
        return new ImportPreviewResult(
            [[
                'name' => 'Users',
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
