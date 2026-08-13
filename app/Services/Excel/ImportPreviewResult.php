<?php

namespace App\Services\Excel;

class ImportPreviewResult
{
    /**
     * @param  array<int, array{name: string, columns: array<int, string>, rows: array<int, array<string, mixed>>}>  $sheets
     * @param  array<int, string>  $errors
     * @param  array<string, int>  $summary
     */
    public function __construct(
        public readonly array $sheets,
        public readonly array $errors,
        public readonly array $summary,
    ) {}

    public function hasErrors(): bool
    {
        return ($this->summary['errors'] ?? 0) > 0 || $this->errors !== [];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return [
            'kind' => count($this->sheets) > 1 ? 'workbook' : 'table',
            'sheets' => $this->sheets,
        ];
    }
}
