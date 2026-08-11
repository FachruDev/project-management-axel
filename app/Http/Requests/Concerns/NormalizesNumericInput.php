<?php

namespace App\Http\Requests\Concerns;

trait NormalizesNumericInput
{
    protected function normalizeDecimalInput(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $value = trim($value);

        if ($value === '') {
            return $value;
        }

        return str_replace(',', '.', $value);
    }

    protected function normalizeNullableIntegerBound(mixed $value, bool $zeroIsOpenEnded = false): mixed
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return $value;
        }

        $normalized = trim((string) $value);

        if ($normalized === '' || $normalized === '-') {
            return null;
        }

        if ($zeroIsOpenEnded && $normalized === '0') {
            return null;
        }

        return $normalized;
    }

    protected function normalizePercentInput(mixed $value): mixed
    {
        $value = $this->normalizeDecimalInput($value);

        if (! is_numeric($value)) {
            return $value;
        }

        return (string) (((float) $value) / 100);
    }
}
