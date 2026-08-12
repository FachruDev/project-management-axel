<?php

namespace App\Http\Controllers;

use App\Events\ProjectBoardChanged;
use App\Http\Requests\BulkDeleteProjectsRequest;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Http\RedirectResponse;

class ProjectBulkDeleteController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function __invoke(BulkDeleteProjectsRequest $request): RedirectResponse
    {
        $actor = $this->actor($request);

        Project::query()
            ->whereIn('id', $request->validated('project_ids'))
            ->get()
            ->each(function (Project $project) use ($actor): void {
                $oldData = $this->projectSnapshot($project);
                $oldStatus = $project->currentStatus()->value;
                $this->auditLogger->log($project, $actor, 'project_deleted', $project, $oldData, null, null, 'bulk_delete');
                $project->delete();

                ProjectBoardChanged::dispatch([
                    'project_id' => $project->id,
                    'old_status' => $oldStatus,
                    'new_status' => null,
                    'action' => 'project_deleted',
                    'actor_id' => $actor->id,
                    'changed_at' => now()->toISOString(),
                ]);
            });

        return back()->with('success', 'Projects deleted.');
    }

    private function actor(BulkDeleteProjectsRequest $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function projectSnapshot(Project $project): array
    {
        return $this->auditLogger->snapshot($project, [
            'name',
            'project_date',
            'status',
            'mandays',
            'incentive_profile_id',
            'pm_user_id',
            'request_user_id',
            'location',
            'plan_start_date',
            'plan_end_date',
            'actual_start_date',
            'actual_end_date',
        ]);
    }
}
