<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesIncentiveProfilePayload;
use App\Models\IncentiveProfile;
use Illuminate\Foundation\Http\FormRequest;

class UpdateIncentiveProfileRequest extends FormRequest
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
        return $this->incentiveProfileRules($this->profile());
    }

    private function profile(): IncentiveProfile
    {
        $profile = $this->route('incentive_profile');

        abort_unless($profile instanceof IncentiveProfile, 404);

        return $profile;
    }
}
