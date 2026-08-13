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

    public function import(UploadedFile $file): ImportSummary
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
}
