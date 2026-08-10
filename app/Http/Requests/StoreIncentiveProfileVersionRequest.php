<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncentiveProfileVersionRequest extends FormRequest
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
        return [];
    }
}
