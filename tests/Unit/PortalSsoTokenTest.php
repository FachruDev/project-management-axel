<?php

namespace Tests\Unit;

use App\Exceptions\PortalAuthenticationException;
use App\Services\Portal\PortalSsoToken;
use Tests\TestCase;

class PortalSsoTokenTest extends TestCase
{
    private string $sharedKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sharedKey = base64_encode(str_repeat('b', 32));

        config([
            'portal.sso.shared_key' => $this->sharedKey,
            'portal.sso.expires_in_seconds' => 300,
            'portal.sso.clock_skew_seconds' => 5,
        ]);
    }

    public function test_decrypts_email_and_timestamp_payload(): void
    {
        $this->travelTo(now());

        $issuedAtMs = now()->getTimestampMs();
        $identity = app(PortalSsoToken::class)->decrypt($this->makeToken('USER@GALENIUM.COM:'.$issuedAtMs));

        $this->assertSame('user@galenium.com', $identity->email);
        $this->assertSame($issuedAtMs, $identity->issuedAtMs);
        $this->assertSame(0, $identity->ageSeconds);
    }

    public function test_rejects_payload_without_timestamp(): void
    {
        $this->expectException(PortalAuthenticationException::class);

        app(PortalSsoToken::class)->decrypt($this->makeToken('user@galenium.com'));
    }

    public function test_rejects_future_timestamp_beyond_clock_skew(): void
    {
        $this->expectException(PortalAuthenticationException::class);

        $futureTimestamp = now()->addSeconds(10)->getTimestampMs();

        app(PortalSsoToken::class)->decrypt($this->makeToken('user@galenium.com:'.$futureTimestamp));
    }

    public function test_rejects_malformed_base64_token(): void
    {
        $this->expectException(PortalAuthenticationException::class);

        app(PortalSsoToken::class)->decrypt('not-base64!!');
    }

    public function test_rejects_invalid_shared_key_length(): void
    {
        config(['portal.sso.shared_key' => base64_encode('short')]);

        $this->expectException(PortalAuthenticationException::class);

        app(PortalSsoToken::class)->decrypt($this->makeToken('user@galenium.com:'.now()->getTimestampMs()));
    }

    private function makeToken(string $plaintext): string
    {
        $key = base64_decode($this->sharedKey, true);
        $iv = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        $this->assertIsString($ciphertext);

        return base64_encode($iv.$ciphertext.$tag);
    }
}
