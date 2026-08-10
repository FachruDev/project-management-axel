<?php

return [
    'sso' => [
        'shared_key' => env('PORTAL_SSO_SHARED_KEY'),
        'token_query' => env('PORTAL_SSO_TOKEN_QUERY', 'token'),
        'legacy_user_query' => env('PORTAL_LEGACY_USER_QUERY', 'user_id'),
        'default_email_domain' => env('PORTAL_SSO_DEFAULT_EMAIL_DOMAIN', 'galenium.com'),
        'expires_in_seconds' => (int) env('PORTAL_SSO_EXPIRES_IN_SECONDS', 300),
        'clock_skew_seconds' => (int) env('PORTAL_SSO_CLOCK_SKEW_SECONDS', 5),
        'persist_session' => env('PORTAL_AUTH_PERSIST_SESSION', true),
    ],
];
