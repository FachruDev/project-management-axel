<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PortalAuthenticationTest extends TestCase
{
    use LazilyRefreshDatabase;

    private string $sharedKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sharedKey = base64_encode(str_repeat('a', 32));

        config([
            'portal.sso.shared_key' => $this->sharedKey,
            'portal.sso.expires_in_seconds' => 300,
            'portal.sso.clock_skew_seconds' => 5,
            'portal.sso.default_email_domain' => 'galenium.com',
            'portal.sso.persist_session' => true,
        ]);
    }

    public function test_valid_token_authenticates_and_persists_session(): void
    {
        $this->travelTo(now());

        $user = User::factory()->create([
            'email' => 'd.daryanto@galenium.com',
            'external_id' => 'd.daryanto',
        ]);

        $response = $this->getInertia('/?token='.urlencode($this->makeToken('d.daryanto@galenium.com:'.now()->getTimestampMs())));

        $response->assertOk();
        $this->assertAuthenticatedAs($user);

        $this->getInertia('/')->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_token_does_not_fallback_to_legacy_user_id(): void
    {
        User::factory()->create([
            'email' => 'legacy.user@galenium.com',
            'external_id' => 'legacy.user',
        ]);

        $response = $this->get('/?token=invalid-token&user_id=legacy.user');

        $response->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_expired_token_is_rejected(): void
    {
        $this->travelTo(now());

        User::factory()->create([
            'email' => 'expired.user@galenium.com',
            'external_id' => 'expired.user',
        ]);

        $expiredTimestamp = now()->subMinutes(6)->getTimestampMs();

        $response = $this->get('/?token='.urlencode($this->makeToken('expired.user@galenium.com:'.$expiredTimestamp)));

        $response->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_missing_or_invalid_shared_key_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'key.user@galenium.com',
            'external_id' => 'key.user',
        ]);

        $token = $this->makeToken('key.user@galenium.com:'.now()->getTimestampMs());

        config(['portal.sso.shared_key' => null]);

        $this->get('/?token='.urlencode($token))->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_legacy_user_id_authenticates_by_external_id(): void
    {
        $user = User::factory()->create([
            'email' => 'legacy.user@galenium.com',
            'external_id' => 'legacy.user',
        ]);

        $response = $this->getInertia('/?user_id=legacy.user');

        $response->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_inactive_users_are_rejected_for_token_and_legacy_auth(): void
    {
        User::factory()->create([
            'email' => 'inactive.user@galenium.com',
            'external_id' => 'inactive.user',
            'is_active' => false,
        ]);

        $this
            ->get('/?token='.urlencode($this->makeToken('inactive.user@galenium.com:'.now()->getTimestampMs())))
            ->assertUnauthorized();

        $this->assertGuest();

        $this->get('/?user_id=inactive.user')->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_missing_identity_is_rejected(): void
    {
        $this->get('/')->assertUnauthorized();
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

    private function getInertia(string $uri): TestResponse
    {
        return $this->withHeaders(['X-Inertia' => 'true'])->get($uri);
    }
}
