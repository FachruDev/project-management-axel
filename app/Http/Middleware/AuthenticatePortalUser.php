<?php

namespace App\Http\Middleware;

use App\Exceptions\PortalAuthenticationException;
use App\Models\User;
use App\Services\Portal\PortalSsoToken;
use App\Services\Portal\PortalUserResolver;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticatePortalUser
{
    public function __construct(
        private readonly PortalSsoToken $portalSsoToken,
        private readonly PortalUserResolver $portalUserResolver,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() !== null) {
            return $next($request);
        }

        $token = $request->string((string) config('portal.sso.token_query', 'token'))->trim()->toString();

        if ($token !== '') {
            try {
                $identity = $this->portalSsoToken->decrypt($token);
                $user = $this->portalUserResolver->resolveFromTokenEmail($identity->email);
            } catch (PortalAuthenticationException) {
                abort(Response::HTTP_UNAUTHORIZED);
            }

            if ($user === null) {
                abort(Response::HTTP_UNAUTHORIZED);
            }

            $this->authenticate($user);

            return $next($request);
        }

        $legacyUserId = $request->string((string) config('portal.sso.legacy_user_query', 'user_id'))->trim()->toString();

        if ($legacyUserId !== '') {
            $user = $this->portalUserResolver->resolveFromLegacyUserId($legacyUserId);

            if ($user === null) {
                abort(Response::HTTP_UNAUTHORIZED);
            }

            $this->authenticate($user);

            return $next($request);
        }

        abort(Response::HTTP_UNAUTHORIZED);
    }

    private function authenticate(User $user): void
    {
        $guard = Auth::guard();

        if (config('portal.sso.persist_session', true)) {
            $guard->login($user);

            return;
        }

        $guard->setUser($user);
        request()->setUserResolver(fn (): User => $user);
    }
}
