<?php

namespace App\Services\Portal;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class PortalUserResolver
{
    public function resolveFromTokenEmail(string $email): ?User
    {
        return $this->resolveFromCandidates($this->identityCandidates($email));
    }

    public function resolveFromLegacyUserId(string $userId): ?User
    {
        return $this->resolveFromCandidates($this->identityCandidates($userId));
    }

    /**
     * @param  array<int, string>  $candidates
     */
    private function resolveFromCandidates(array $candidates): ?User
    {
        if ($candidates === []) {
            return null;
        }

        return User::query()
            ->where('is_active', true)
            ->where(function (Builder $query) use ($candidates): void {
                $query
                    ->whereIn('email', $candidates)
                    ->orWhereIn('external_id', $candidates);
            })
            ->first();
    }

    /**
     * @return array<int, string>
     */
    private function identityCandidates(string $identity): array
    {
        $identity = Str::of($identity)->trim()->lower()->toString();

        if ($identity === '') {
            return [];
        }

        $defaultDomain = Str::of((string) config('portal.sso.default_email_domain', 'galenium.com'))
            ->trim()
            ->lower()
            ->trim('@')
            ->toString();

        $localPart = Str::of($identity)->before('@')->toString();
        $candidates = [$identity, $localPart];

        if (! Str::contains($identity, '@') && $defaultDomain !== '') {
            $candidates[] = $identity.'@'.$defaultDomain;
        }

        return array_values(array_filter(Arr::where(
            array_unique($candidates),
            fn (string $candidate): bool => $candidate !== '',
        )));
    }
}
