<?php

namespace App\Http\Requests;

use App\Models\WorkingDayRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkingDayRuleRequest extends FormRequest
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
        $workingDayRule = $this->route('working_day_rule');
        $workingDayRuleId = $workingDayRule instanceof WorkingDayRule ? $workingDayRule->id : null;

        return [
            'day_of_week' => ['required', 'integer', 'between:1,7', Rule::unique('working_day_rules', 'day_of_week')->ignore($workingDayRuleId)],
            'is_working' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
