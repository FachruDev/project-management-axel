<?php

namespace App\Http\Controllers;

use App\Events\ProjectBoardChanged;
use App\Events\TaskBoardChanged;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectTaskDeleteController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function __invoke(Request $request, ProjectTask $task): RedirectResponse
    {
        abort_unless($request->user()?->can('manage_tasks') === true, 403);

        $actor = $this->actor($request);
        $task->load('project');
        $project = $task->project;
        $oldData = $this->taskSnapshot($task);
        $task->delete();
        $this->auditLogger->log($project, $actor, 'task_deleted', $task, $oldData);
        $this->broadcastDeletedTask($task, $actor);

        return back()->with('success', 'Task deleted.');
    }

    private function actor(Request $request): User
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

    private function broadcastDeletedTask(ProjectTask $task, User $actor): void
    {
        TaskBoardChanged::dispatch([
            'task_id' => $task->id,
            'project_id' => $task->project_id,
            'old_status' => $task->getOriginal('status'),
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
    }
}
