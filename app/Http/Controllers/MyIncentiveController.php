<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Incentives\UserIncentiveQueryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyIncentiveController extends Controller
{
    public function __construct(
        private readonly UserIncentiveQueryService $incentives,
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return Inertia::render('my-incentives/index', $this->incentives->myIncentives($request, $user));
    }
}
