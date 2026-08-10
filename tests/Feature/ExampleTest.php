<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_a_successful_response()
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'external_id' => 'test.user',
        ]);

        $response = $this->withHeaders(['X-Inertia' => 'true'])->get(route('home', ['user_id' => 'test.user']));

        $response->assertOk();
    }
}
