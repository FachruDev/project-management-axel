<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use App\Services\Crm\CrmWorkspaceService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CrmController extends Controller
{
    public function __construct(
        private readonly CrmWorkspaceService $crm,
    ) {}

    public function index(Request $request): Response
    {
        $user = $this->user($request);

        return Inertia::render('crm/index', $this->crm->index($request, $user));
    }

    public function show(Request $request, Customer $customer): Response
    {
        $user = $this->user($request);

        return Inertia::render('crm/show', $this->crm->show($request, $user, $customer));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
