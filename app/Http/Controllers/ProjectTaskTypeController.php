<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectTaskTypeRequest;
use App\Http\Requests\UpdateProjectTaskTypeRequest;
use App\Models\Project;
use App\Models\TaskType;
use Illuminate\Http\RedirectResponse;

class ProjectTaskTypeController extends Controller
{
    public function store(StoreProjectTaskTypeRequest $request, Project $project): RedirectResponse
    {
        $project->taskTypes()->create($request->validated());

        return back()->with('success', 'Task type saved.');
    }

    public function update(UpdateProjectTaskTypeRequest $request, Project $project, TaskType $taskType): RedirectResponse
    {
        $this->ensureProjectTaskType($project, $taskType);

        $taskType->update($request->validated());

        return back()->with('success', 'Task type updated.');
    }

    public function destroy(Project $project, TaskType $taskType): RedirectResponse
    {
        $this->ensureProjectTaskType($project, $taskType);

        $taskType->delete();

        return back()->with('success', 'Task type deleted.');
    }

    private function ensureProjectTaskType(Project $project, TaskType $taskType): void
    {
        abort_unless((int) $taskType->project_id === (int) $project->id, 404);
    }
}
