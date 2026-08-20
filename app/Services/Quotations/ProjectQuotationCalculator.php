<?php

namespace App\Services\Quotations;

use App\Enums\ProjectQuotationType;

class ProjectQuotationCalculator
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{items: array<int, array<string, mixed>>, subtotal: float, tax: float, grand_total: float}
     */
    public function calculate(ProjectQuotationType $type, array $items, float $taxPercent): array
    {
        $calculatedItems = [];
        $subtotal = 0.0;

        foreach (array_values($items) as $index => $item) {
            $qty = $this->nullableFloat($item['qty'] ?? null);
            $unitPrice = $this->nullableFloat($item['unit_price'] ?? null);
            $discountPercent = $this->nullableFloat($item['discount'] ?? $item['discount_percent'] ?? 0) ?? 0.0;
            $manualAmount = $this->nullableFloat($item['amount'] ?? null);
            $amount = $this->amount($qty, $unitPrice, $discountPercent, $manualAmount);
            $subtotal += $amount;

            $calculatedItems[] = [
                'sort_order' => $index + 1,
                'category' => $type->category(),
                'unit' => (string) ($item['unit'] ?? 'mandays'),
                'description' => (string) ($item['description'] ?? ''),
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'discount_percent' => $discountPercent,
                'amount' => $amount,
            ];
        }

        $subtotal = round($subtotal, 2);
        $tax = round($subtotal * $taxPercent / 100, 2);

        return [
            'items' => $calculatedItems,
            'subtotal' => $subtotal,
            'tax' => $tax,
            'grand_total' => round($subtotal + $tax, 2),
        ];
    }

    private function amount(?float $qty, ?float $unitPrice, float $discountPercent, ?float $manualAmount): float
    {
        if ($qty !== null && $unitPrice !== null) {
            $base = $qty * $unitPrice;

            return round($base - ($base * $discountPercent / 100), 2);
        }

        return round($manualAmount ?? 0, 2);
    }

    private function nullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }
}
