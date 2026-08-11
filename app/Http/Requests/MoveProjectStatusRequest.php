<?php

namespace App\Http\Requests;

use App\Enums\ProjectStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveProjectStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manage_projects') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'target_status' => [
                'required',
                'string',
                Rule::in([
                    ProjectStatus::Planning->value,
                    ProjectStatus::Ongoing->value,
                    ProjectStatus::AwaitingBast->value,
                    ProjectStatus::ReadyToClose->value,
                    ProjectStatus::Closed->value,
                ]),
            ],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
