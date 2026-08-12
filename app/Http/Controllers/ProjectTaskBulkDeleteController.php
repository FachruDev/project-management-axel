<?php

namespace App\Http\Controllers;

use App\Events\ProjectBoardChanged;
use App\Events\TaskBoardChanged;
use App\Http\Requests\BulkDeleteProjectTasksRequest;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Http\RedirectResponse;

class ProjectTaskBulkDeleteController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function __invoke(BulkDeleteProjectTasksRequest $request): RedirectResponse
    {
        $actor = $this->actor($request);

        ProjectTask::query()
            ->whereIn('id', $request->validated('task_ids'))
            ->with('project')
            ->get()
            ->each(function (ProjectTask $task) use ($actor): void {
                $project = $task->project;
                $oldData = $this->taskSnapshot($task);
                $task->delete();
                $this->auditLogger->log($project, $actor, 'task_deleted', $task, $oldData, null, null, 'bulk_delete');

                TaskBoardChanged::dispatch([
                    'task_id' => $task->id,
                    'project_id' => $task->project_id,
                    'old_status' => $oldData['status'] ?? null,
                    'new_status' => null,
                    'action' => 'task_deleted',
                    'actor_id' => $actor->id,
                    'changed_at' => now()->toISOString(),
                ]);

                ProjectBoardChanged::dispatch([
                    'project_id' => $task->project_id,
                    'task_id' => $task->id,
                    'action' => 'task_deleted',
                    'actor_id' => $actor->id,
                    'changed_at' => now()->toISOString(),
                ]);
            });

        return back()->with('success', 'Tasks deleted.');
    }

    private function actor(BulkDeleteProjectTasksRequest $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function taskSnapshot(ProjectTask $task): array
    {
        return $this->auditLogger->snapshot($task, [
            'project_id',
            'task_type_id',
            'project_member_id',
            'name',
            'status',
            'description',
            'plan_start_date',
            'plan_end_date',
            'actual_start_date',
            'actual_end_date',
        ]);
    }
}
