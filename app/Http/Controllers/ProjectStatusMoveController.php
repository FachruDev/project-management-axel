<?php

namespace App\Http\Controllers;

use App\Enums\ProjectStatus;
use App\Exceptions\ProjectLifecycleException;
use App\Http\Requests\MoveProjectStatusRequest;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectStatusMoveService;
use Illuminate\Http\RedirectResponse;

class ProjectStatusMoveController extends Controller
{
    public function __construct(
        private readonly ProjectStatusMoveService $moveService,
    ) {}

    public function __invoke(MoveProjectStatusRequest $request, Project $project): RedirectResponse
    {
        try {
            $this->moveService->move(
                $project,
                ProjectStatus::from((string) $request->validated('target_status')),
                $this->actor($request),
                $request->validated('reason'),
            );
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['target_status' => $exception->getMessage()]);
        }

        return back()->with('success', 'Project status updated.');
    }

    private function actor(MoveProjectStatusRequest $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
