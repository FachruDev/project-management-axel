<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesIncentiveProfilePayload;
use Illuminate\Foundation\Http\FormRequest;

class StoreIncentiveProfileRequest extends FormRequest
{
    use ValidatesIncentiveProfilePayload;

    public function authorize(): bool
    {
        return $this->user()?->can('manage_incentive_profiles') === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->incentiveProfileRules();
    }
}
