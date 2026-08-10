<?php

namespace App\Services\Incentives;

use App\Enums\IncentiveProfileStatus;
use App\Models\IncentiveProfile;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class IncentiveProfileService
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function create(array $data, User $actor): IncentiveProfile
    {
        return DB::transaction(function () use ($data, $actor): IncentiveProfile {
            $profile = IncentiveProfile::create([
                ...$this->profileAttributes($data),
                'status' => IncentiveProfileStatus::Draft,
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);

            $this->syncRules($profile, $data);

            return $this->loadProfile($profile);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function update(IncentiveProfile $profile, array $data, User $actor): IncentiveProfile
    {
        $this->ensureEditable($profile);

        return DB::transaction(function () use ($profile, $data, $actor): IncentiveProfile {
            $profile->forceFill([
                ...$this->profileAttributes($data),
                'updated_by' => $actor->id,
            ])->save();

            $this->syncRules($profile, $data);

            return $this->loadProfile($profile);
        });
    }

    /**
     * @throws ValidationException
     */
    public function updateStatus(IncentiveProfile $profile, IncentiveProfileStatus $status, User $actor): IncentiveProfile
    {
        $currentStatus = $profile->currentStatus();

        if ($currentStatus === IncentiveProfileStatus::Archived) {
            $this->fail('status', 'Archived incentive profile is read-only.');
        }

        if ($currentStatus === IncentiveProfileStatus::Active && $status !== IncentiveProfileStatus::Inactive) {
            $this->fail('status', 'Active incentive profile can only be changed to inactive.');
        }

        if ($status === IncentiveProfileStatus::Draft && $currentStatus !== IncentiveProfileStatus::Draft) {
            $this->fail('status', 'Only draft incentive profile can keep draft status.');
        }

        $profile->forceFill([
            'status' => $status,
            'updated_by' => $actor->id,
        ])->save();

        return $this->loadProfile($profile);
    }

    /**
     * @throws ValidationException
     */
    public function delete(IncentiveProfile $profile): void
    {
        if ($profile->isActive()) {
            $this->fail('profile', 'Active incentive profile cannot be deleted.');
        }

        if ($profile->hasUsage()) {
            $this->fail('profile', 'Incentive profile already used by project or calculation.');
        }

        $profile->delete();
    }

    public function createVersion(IncentiveProfile $profile, User $actor): IncentiveProfile
    {
        return DB::transaction(function () use ($profile, $actor): IncentiveProfile {
            $profile = $this->loadProfile($profile);
            $nextVersion = ((int) IncentiveProfile::where('code', $profile->code)->max('version')) + 1;

            $newProfile = IncentiveProfile::create([
                'code' => $profile->code,
                'name' => $profile->name,
                'description' => $profile->description,
                'version' => $nextVersion,
                'status' => IncentiveProfileStatus::Draft,
                'effective_from' => $profile->effective_from,
                'effective_to' => $profile->effective_to,
                'support_percent' => $profile->support_percent,
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);

            $newProfile->mandayRules()->createMany(
                $profile->mandayRules->map(fn ($rule): array => Arr::only($rule->attributesToArray(), [
                    'min_mandays',
                    'max_mandays',
                    'base_score',
                    'sort_order',
                ]))->all()
            );

            $newProfile->picLevelRules()->createMany(
                $profile->picLevelRules->map(fn ($rule): array => Arr::only($rule->attributesToArray(), [
                    'level_code',
                    'level_name',
                    'points',
                ]))->all()
            );

            $newProfile->projectRoleRules()->createMany(
                $profile->projectRoleRules->map(fn ($rule): array => Arr::only($rule->attributesToArray(), [
                    'role_code',
                    'role_name',
                    'points',
                    'is_support',
                ]))->all()
            );

            $newProfile->deliveryRules()->createMany(
                $profile->deliveryRules->map(fn ($rule): array => Arr::only($rule->attributesToArray(), [
                    'name',
                    'min_difference_days',
                    'max_difference_days',
                    'multiplier',
                    'sort_order',
                ]))->all()
            );

            return $this->loadProfile($newProfile);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function profileAttributes(array $data): array
    {
        return [
            'code' => Str::of((string) $data['code'])->trim()->upper()->toString(),
            'name' => Str::of((string) $data['name'])->trim()->toString(),
            'description' => blank($data['description'] ?? null) ? null : (string) $data['description'],
            'version' => (int) $data['version'],
            'effective_from' => $data['effective_from'],
            'effective_to' => $data['effective_to'] ?? null,
            'support_percent' => $data['support_percent'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncRules(IncentiveProfile $profile, array $data): void
    {
        $profile->mandayRules()->delete();
        $profile->picLevelRules()->delete();
        $profile->projectRoleRules()->delete();
        $profile->deliveryRules()->delete();

        $profile->mandayRules()->createMany($this->mandayRuleAttributes($data));
        $profile->picLevelRules()->createMany($this->picLevelRuleAttributes($data));
        $profile->projectRoleRules()->createMany($this->projectRoleRuleAttributes($data));
        $profile->deliveryRules()->createMany($this->deliveryRuleAttributes($data));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function mandayRuleAttributes(array $data): array
    {
        return collect($this->ruleRows($data, 'manday_rules'))
            ->sortBy('min_mandays')
            ->values()
            ->map(fn (array $rule, int $index): array => [
                'min_mandays' => (int) $rule['min_mandays'],
                'max_mandays' => $rule['max_mandays'] === null ? null : (int) $rule['max_mandays'],
                'base_score' => $rule['base_score'],
                'sort_order' => $index + 1,
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function picLevelRuleAttributes(array $data): array
    {
        return collect($this->ruleRows($data, 'pic_level_rules'))
            ->values()
            ->map(fn (array $rule): array => [
                'level_code' => Str::of((string) $rule['level_code'])->trim()->lower()->toString(),
                'level_name' => Str::of((string) $rule['level_name'])->trim()->toString(),
                'points' => $rule['points'],
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function projectRoleRuleAttributes(array $data): array
    {
        return collect($this->ruleRows($data, 'project_role_rules'))
            ->values()
            ->map(fn (array $rule): array => [
                'role_code' => Str::of((string) $rule['role_code'])->trim()->lower()->toString(),
                'role_name' => Str::of((string) $rule['role_name'])->trim()->toString(),
                'points' => $rule['points'],
                'is_support' => (bool) $rule['is_support'],
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function deliveryRuleAttributes(array $data): array
    {
        return collect($this->ruleRows($data, 'delivery_rules'))
            ->sortBy(fn (array $rule): int => $rule['min_difference_days'] ?? PHP_INT_MIN)
            ->values()
            ->map(fn (array $rule, int $index): array => [
                'name' => Str::of((string) $rule['name'])->trim()->toString(),
                'min_difference_days' => $rule['min_difference_days'] === null ? null : (int) $rule['min_difference_days'],
                'max_difference_days' => $rule['max_difference_days'] === null ? null : (int) $rule['max_difference_days'],
                'multiplier' => $rule['multiplier'],
                'sort_order' => $index + 1,
            ])
            ->all();
    }

    /**
     * @throws ValidationException
     */
    private function ensureEditable(IncentiveProfile $profile): void
    {
        if ($profile->isEditable()) {
            return;
        }

        $this->fail('profile', 'Only draft or inactive incentive profile can be edited.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function ruleRows(array $data, string $key): array
    {
        $value = $data[$key] ?? [];

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter($value, is_array(...)));
    }

    private function loadProfile(IncentiveProfile $profile): IncentiveProfile
    {
        return $profile->fresh([
            'mandayRules',
            'picLevelRules',
            'projectRoleRules',
            'deliveryRules',
        ]) ?? $profile;
    }

    /**
     * @throws ValidationException
     */
    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([
            $key => [$message],
        ]);
    }
}
