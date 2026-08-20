<?php

namespace App\Http\Requests;

use App\Enums\ProjectQuotationStatus;
use App\Enums\ProjectQuotationType;
use App\Http\Requests\Concerns\NormalizesNumericInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectQuotationRequest extends FormRequest
{
    use NormalizesNumericInput;

    public function authorize(): bool
    {
        return $this->user()?->can('manage_project_quotations') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'quotation_type' => ['required', Rule::enum(ProjectQuotationType::class)],
            'quotation_date' => ['required', 'date'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_address' => ['nullable', 'string', 'max:2000'],
            'customer_identifier' => ['nullable', 'string', 'max:120'],
            'cc' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string'],
            'term_of_payment_date' => ['nullable', 'date'],
            'valid_until_date' => ['nullable', 'date'],
            'note' => ['nullable', 'string'],
            'prepared_by_name' => ['nullable', 'string', 'max:120'],
            'approved_by_name' => ['nullable', 'string', 'max:120'],
            'ppn_pph_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'qr_target_url' => ['nullable', 'url', 'max:255'],
            'status' => ['required', Rule::enum(ProjectQuotationStatus::class)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.unit' => ['required', 'string', 'max:50'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['nullable', 'numeric', 'min:0'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $items = collect($this->input('items', []))
            ->map(function (mixed $item): mixed {
                if (! is_array($item)) {
                    return $item;
                }

                return [
                    ...$item,
                    'qty' => $this->nullableDecimal($item['qty'] ?? null),
                    'unit_price' => $this->nullableDecimal($item['unit_price'] ?? null),
                    'discount' => $this->nullablePercent($item['discount'] ?? $item['discount_percent'] ?? null),
                    'amount' => $this->nullableDecimal($item['amount'] ?? null),
                ];
            })
            ->all();

        $this->merge([
            'project_id' => $this->nullableInteger($this->input('project_id')),
            'ppn_pph_percent' => $this->nullablePercent($this->input('ppn_pph_percent')),
            'items' => $items,
        ]);
    }

    private function nullableDecimal(mixed $value): mixed
    {
        $value = $this->normalizeDecimalInput($value);

        return $value === '' ? null : $value;
    }

    private function nullableInteger(mixed $value): mixed
    {
        if ($value === '') {
            return null;
        }

        return $value;
    }

    private function nullablePercent(mixed $value): mixed
    {
        if (is_string($value)) {
            $value = rtrim(trim($value), '%');
        }

        return $this->nullableDecimal($value);
    }
}
