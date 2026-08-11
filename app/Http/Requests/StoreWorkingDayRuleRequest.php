<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkingDayRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage_working_calendar') === true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'day_of_week' => ['required', 'integer', 'between:1,7', Rule::unique('working_day_rules', 'day_of_week')],
            'is_working' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
