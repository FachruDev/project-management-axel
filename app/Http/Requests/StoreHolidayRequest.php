<?php

namespace App\Http\Requests;

use App\Enums\HolidayType;
use App\Models\Holiday;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreHolidayRequest extends FormRequest
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
            'date' => ['required', 'date'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(array_column(HolidayType::cases(), 'value'))],
            'is_working' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if (Holiday::query()->whereDate('date', $this->date('date')->toDateString())->exists()) {
                    $validator->errors()->add('date', 'The holiday date has already been taken.');
                }
            },
        ];
    }
}
