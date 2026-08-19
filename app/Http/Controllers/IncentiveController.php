<?php

namespace App\Http\Controllers;

use App\Services\Incentives\UserIncentiveQueryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncentiveController extends Controller
{
    public function __construct(
        private readonly UserIncentiveQueryService $incentives,
    ) {}

    public function __invoke(Request $request): Response
    {
        return Inertia::render('incentives/index', $this->incentives->allIncentives($request));
    }
}
