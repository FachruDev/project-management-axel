<?php

namespace App\Http\Requests;

use App\Enums\IncentiveProfileStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIncentiveProfileStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage_incentive_profiles') === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(IncentiveProfileStatus::class)],
        ];
    }
}
