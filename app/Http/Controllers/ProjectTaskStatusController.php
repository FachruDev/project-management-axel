<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\UpdateProjectTaskStatusRequest;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\Projects\ProjectTaskTransitionService;
use App\Services\Projects\ProjectVisibilityService;
use Illuminate\Http\RedirectResponse;

class ProjectTaskStatusController extends Controller
{
    public function __construct(
        private readonly ProjectTaskTransitionService $transitionService,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function __invoke(UpdateProjectTaskStatusRequest $request, ProjectTask $task): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);
        abort_unless($this->visibility->canAccessTask($task, $user), 403);

        $this->transitionService->updateStatus($task, TaskStatus::from((string) $request->validated('status')));

        return back()->with('success', 'Task status updated.');
    }
}
