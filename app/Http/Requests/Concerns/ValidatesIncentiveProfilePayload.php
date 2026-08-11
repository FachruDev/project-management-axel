<?php

namespace App\Http\Requests\Concerns;

use App\Models\IncentiveProfile;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

trait ValidatesIncentiveProfilePayload
{
    use NormalizesNumericInput;

    protected function prepareForValidation(): void
    {
        if (! $this->has('code')) {
            return;
        }

        $this->merge([
            'code' => str($this->input('code'))->trim()->upper()->toString(),
            'support_percent' => $this->normalizePercentInput($this->input('support_percent')),
            'manday_rules' => $this->normalizeMandayRuleInputs($this->ruleRows('manday_rules')),
            'pic_level_rules' => $this->normalizePicLevelRuleInputs($this->ruleRows('pic_level_rules')),
            'project_role_rules' => $this->normalizeProjectRoleRuleInputs($this->ruleRows('project_role_rules')),
            'delivery_rules' => $this->normalizeDeliveryRuleInputs($this->ruleRows('delivery_rules')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function incentiveProfileRules(?IncentiveProfile $profile = null): array
    {
        return [
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('incentive_profiles', 'code')
                    ->where(fn ($query) => $query->where('version', $this->integer('version')))
                    ->ignore($profile?->id),
            ],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'version' => ['required', 'integer', 'min:1'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'support_percent' => ['required', 'numeric', 'between:0,1'],
            'manday_rules' => ['required', 'array', 'min:1'],
            'manday_rules.*.min_mandays' => ['required', 'integer', 'min:1'],
            'manday_rules.*.max_mandays' => ['nullable', 'integer', 'min:1'],
            'manday_rules.*.base_score' => ['required', 'numeric', 'min:0'],
            'pic_level_rules' => ['required', 'array', 'min:1'],
            'pic_level_rules.*.level_code' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/'],
            'pic_level_rules.*.level_name' => ['required', 'string', 'max:100'],
            'pic_level_rules.*.points' => ['required', 'numeric', 'min:0'],
            'project_role_rules' => ['required', 'array', 'min:1'],
            'project_role_rules.*.role_code' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/'],
            'project_role_rules.*.role_name' => ['required', 'string', 'max:100'],
            'project_role_rules.*.points' => ['required', 'numeric', 'min:0'],
            'project_role_rules.*.is_support' => ['required', 'boolean'],
            'delivery_rules' => ['required', 'array', 'min:1'],
            'delivery_rules.*.name' => ['required', 'string', 'max:100'],
            'delivery_rules.*.min_difference_days' => ['nullable', 'integer'],
            'delivery_rules.*.max_difference_days' => ['nullable', 'integer'],
            'delivery_rules.*.multiplier' => ['required', 'numeric', 'min:0'],
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

                $this->validateMandayRules($validator);
                $this->validateUniqueRuleCodes($validator, 'pic_level_rules', 'level_code');
                $this->validateUniqueRuleCodes($validator, 'project_role_rules', 'role_code');
                $this->validateDeliveryRules($validator);
            },
        ];
    }

    private function validateMandayRules(Validator $validator): void
    {
        $rules = collect($this->ruleRows('manday_rules'))
            ->sortBy('min_mandays')
            ->values();

        $expectedMinMandays = 1;

        foreach ($rules as $index => $rule) {
            $minMandays = (int) $rule['min_mandays'];
            $maxMandays = $rule['max_mandays'] === null ? null : (int) $rule['max_mandays'];
            $isLast = $index === $rules->count() - 1;

            if ($minMandays !== $expectedMinMandays) {
                $validator->errors()->add('manday_rules', 'Manday rules must start from 1 and be contiguous.');

                return;
            }

            if ($maxMandays !== null && $maxMandays < $minMandays) {
                $validator->errors()->add('manday_rules', 'Manday max must be greater than or equal to min.');

                return;
            }

            if (! $isLast && $maxMandays === null) {
                $validator->errors()->add('manday_rules', 'Only the last manday rule may have an open-ended max.');

                return;
            }

            if ($isLast && $maxMandays !== null) {
                $validator->errors()->add('manday_rules', 'The last manday rule must have an open-ended max.');

                return;
            }

            if ($maxMandays !== null) {
                $expectedMinMandays = $maxMandays + 1;
            }
        }
    }

    private function validateUniqueRuleCodes(Validator $validator, string $arrayKey, string $codeKey): void
    {
        $codes = collect($this->ruleRows($arrayKey))
            ->pluck($codeKey)
            ->map(fn (mixed $code): string => mb_strtolower((string) $code))
            ->filter();

        if ($codes->count() !== $codes->unique()->count()) {
            $validator->errors()->add($arrayKey, 'Rule codes must be unique within a profile.');
        }
    }

    private function validateDeliveryRules(Validator $validator): void
    {
        $ranges = collect($this->ruleRows('delivery_rules'))
            ->map(function (array $rule): array {
                return [
                    'min' => $rule['min_difference_days'] === null ? null : (int) $rule['min_difference_days'],
                    'max' => $rule['max_difference_days'] === null ? null : (int) $rule['max_difference_days'],
                ];
            })
            ->sortBy(fn (array $range): int => $range['min'] ?? PHP_INT_MIN)
            ->values();

        $previousMax = null;

        foreach ($ranges as $index => $range) {
            if ($range['min'] !== null && $range['max'] !== null && $range['max'] < $range['min']) {
                $validator->errors()->add('delivery_rules', 'Delivery max must be greater than or equal to min.');

                return;
            }

            if ($index > 0 && ($previousMax === null || $range['min'] === null || $range['min'] <= $previousMax)) {
                $validator->errors()->add('delivery_rules', 'Delivery rules must not overlap.');

                return;
            }

            $previousMax = $range['max'];
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function ruleRows(string $key): array
    {
        $value = $this->input($key, []);

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter($value, is_array(...)));
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     * @return array<int, array<string, mixed>>
     */
    private function normalizeMandayRuleInputs(array $rules): array
    {
        return array_map(fn (array $rule): array => [
            ...$rule,
            'min_mandays' => $this->normalizeNullableIntegerBound($rule['min_mandays'] ?? null),
            'max_mandays' => $this->normalizeNullableIntegerBound($rule['max_mandays'] ?? null, zeroIsOpenEnded: true),
            'base_score' => $this->normalizeDecimalInput($rule['base_score'] ?? null),
        ], $rules);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     * @return array<int, array<string, mixed>>
     */
    private function normalizePicLevelRuleInputs(array $rules): array
    {
        return array_map(fn (array $rule): array => [
            ...$rule,
            'points' => $this->normalizeDecimalInput($rule['points'] ?? null),
        ], $rules);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     * @return array<int, array<string, mixed>>
     */
    private function normalizeProjectRoleRuleInputs(array $rules): array
    {
        return array_map(fn (array $rule): array => [
            ...$rule,
            'points' => $this->normalizeDecimalInput($rule['points'] ?? null),
        ], $rules);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     * @return array<int, array<string, mixed>>
     */
    private function normalizeDeliveryRuleInputs(array $rules): array
    {
        return array_map(function (array $rule): array {
            $min = $this->normalizeNullableIntegerBound($rule['min_difference_days'] ?? null);
            $max = $this->normalizeNullableIntegerBound($rule['max_difference_days'] ?? null);

            if ($min === '0' && is_numeric($max) && (int) $max < 0) {
                $min = null;
            }

            return [
                ...$rule,
                'min_difference_days' => $min,
                'max_difference_days' => $max,
                'multiplier' => $this->normalizeDecimalInput($rule['multiplier'] ?? null),
            ];
        }, $rules);
    }
}
