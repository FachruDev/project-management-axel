<?php

namespace App\Http\Controllers;

use App\Events\ProjectBoardChanged;
use App\Events\TaskBoardChanged;
use App\Http\Requests\StoreProjectTaskTypeRequest;
use App\Http\Requests\UpdateProjectTaskTypeRequest;
use App\Models\Project;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectTaskTypeController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function store(StoreProjectTaskTypeRequest $request, Project $project): RedirectResponse
    {
        $actor = $this->actor($request);
        $taskType = $project->taskTypes()->create($request->validated());
        $this->auditLogger->log($project, $actor, 'task_type_created', $taskType, null, $this->taskTypeSnapshot($taskType));
        $this->broadcastTaskTypeChange($project, $actor, 'task_type_created');

        return back()->with('success', 'Task type saved.');
    }

    public function update(UpdateProjectTaskTypeRequest $request, Project $project, TaskType $taskType): RedirectResponse
    {
        $this->ensureProjectTaskType($project, $taskType);

        $actor = $this->actor($request);
        $oldData = $this->taskTypeSnapshot($taskType);
        $taskType->update($request->validated());
        $this->auditLogger->log($project, $actor, 'task_type_updated', $taskType, $oldData, $this->taskTypeSnapshot($taskType->refresh()));
        $this->broadcastTaskTypeChange($project, $actor, 'task_type_updated');

        return back()->with('success', 'Task type updated.');
    }

    public function destroy(Request $request, Project $project, TaskType $taskType): RedirectResponse
    {
        $this->ensureProjectTaskType($project, $taskType);

        $actor = $this->actor($request);
        $oldData = $this->taskTypeSnapshot($taskType);
        $taskType->delete();
        $this->auditLogger->log($project, $actor, 'task_type_deleted', $taskType, $oldData);
        $this->broadcastTaskTypeChange($project, $actor, 'task_type_deleted');

        return back()->with('success', 'Task type deleted.');
    }

    private function ensureProjectTaskType(Project $project, TaskType $taskType): void
    {
        abort_unless((int) $taskType->project_id === (int) $project->id, 404);
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
    private function taskTypeSnapshot(TaskType $taskType): array
    {
        return $this->auditLogger->snapshot($taskType, [
            'project_id',
            'name',
            'color',
            'description',
            'is_active',
        ]);
    }

    private function broadcastTaskTypeChange(Project $project, User $actor, string $action): void
    {
        TaskBoardChanged::dispatch([
            'project_id' => $project->id,
            'action' => $action,
            'actor_id' => $actor->id,
            'changed_at' => now()->toISOString(),
        ]);

        ProjectBoardChanged::dispatch([
            'project_id' => $project->id,
            'action' => $action,
            'actor_id' => $actor->id,
            'changed_at' => now()->toISOString(),
        ]);
    }
}
