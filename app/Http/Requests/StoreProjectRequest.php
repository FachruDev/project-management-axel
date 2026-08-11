<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesNumericInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    use NormalizesNumericInput;

    public function authorize(): bool
    {
        return $this->user()?->can('manage_projects') === true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'project_date' => ['required', 'date'],
            'customer_ids' => ['required', 'array', 'min:1'],
            'customer_ids.*' => ['integer', Rule::exists('customers', 'id')],
            'primary_customer_id' => ['nullable', 'integer', Rule::exists('customers', 'id')],
            'mandays' => ['required', 'numeric', 'min:0.01'],
            'incentive_profile_id' => ['required', 'integer', Rule::exists('incentive_profiles', 'id')],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'mandays' => $this->normalizeDecimalInput($this->input('mandays')),
        ]);
    }
}
