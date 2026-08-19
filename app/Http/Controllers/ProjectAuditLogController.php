<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogService;
use App\Services\Projects\ProjectVisibilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectAuditLogController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogService $auditLogService,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function __invoke(Request $request, Project $project): JsonResponse
    {
        $actor = $this->actor($request);
        abort_unless($this->visibility->visibleProjects(Project::query()->whereKey($project->id), $actor)->exists(), 403);

        return response()->json($this->auditLogService->paginate(
            $project,
            (int) $request->integer('limit', 10),
            (int) $request->integer('offset', 0),
        ));
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
