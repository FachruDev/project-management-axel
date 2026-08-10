<?php

namespace App\Services\Portal;

use App\Exceptions\PortalAuthenticationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class PortalSsoToken
{
    private const KEY_BYTES = 32;

    private const IV_BYTES = 12;

    private const TAG_BYTES = 16;

    public function decrypt(string $token): PortalSsoIdentity
    {
        $key = $this->decodeSharedKey();
        $payload = $this->decodePayload($token);

        if (strlen($payload) <= self::IV_BYTES + self::TAG_BYTES) {
            throw new PortalAuthenticationException('Invalid portal token.');
        }

        $iv = substr($payload, 0, self::IV_BYTES);
        $tag = substr($payload, -self::TAG_BYTES);
        $ciphertext = substr($payload, self::IV_BYTES, -self::TAG_BYTES);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
        );

        if (! is_string($plaintext) || $plaintext === '') {
            throw new PortalAuthenticationException('Invalid portal token.');
        }

        return $this->parsePlaintext($plaintext);
    }

    private function decodeSharedKey(): string
    {
        $encodedKey = config('portal.sso.shared_key');

        if (! is_string($encodedKey) || trim($encodedKey) === '') {
            throw new PortalAuthenticationException('Portal SSO key is not configured.');
        }

        $key = base64_decode($encodedKey, true);

        if (! is_string($key) || strlen($key) !== self::KEY_BYTES) {
            throw new PortalAuthenticationException('Portal SSO key is invalid.');
        }

        return $key;
    }

    private function decodePayload(string $token): string
    {
        $payload = base64_decode($token, true);

        if (! is_string($payload)) {
            throw new PortalAuthenticationException('Invalid portal token.');
        }

        return $payload;
    }

    private function parsePlaintext(string $plaintext): PortalSsoIdentity
    {
        $separatorPosition = strrpos($plaintext, ':');

        if ($separatorPosition === false) {
            throw new PortalAuthenticationException('Invalid portal token payload.');
        }

        $email = Str::of(substr($plaintext, 0, $separatorPosition))->trim()->lower()->toString();
        $issuedAtMs = substr($plaintext, $separatorPosition + 1);

        if ($email === '' || ! ctype_digit($issuedAtMs)) {
            throw new PortalAuthenticationException('Invalid portal token payload.');
        }

        $issuedAtMs = (int) $issuedAtMs;
        $nowMs = now()->getTimestampMs();
        $ageMs = $nowMs - $issuedAtMs;
        $expiresInMs = ((int) config('portal.sso.expires_in_seconds', 300)) * 1000;
        $clockSkewMs = ((int) config('portal.sso.clock_skew_seconds', 5)) * 1000;

        if ($ageMs > $expiresInMs + $clockSkewMs || $ageMs < -$clockSkewMs) {
            throw new PortalAuthenticationException('Portal token has expired.');
        }

        return new PortalSsoIdentity(
            email: $email,
            issuedAtMs: $issuedAtMs,
            issuedAt: Carbon::createFromTimestampMs($issuedAtMs),
            ageSeconds: (int) floor($ageMs / 1000),
        );
    }
}
