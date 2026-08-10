<?php

namespace App\Services\Portal;

use Illuminate\Support\Carbon;

readonly class PortalSsoIdentity
{
    public function __construct(
        public string $email,
        public int $issuedAtMs,
        public Carbon $issuedAt,
        public int $ageSeconds,
    ) {}
}
