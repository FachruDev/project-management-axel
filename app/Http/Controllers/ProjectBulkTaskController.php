<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\StoreBulkProjectTasksRequest;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\TaskType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectBulkTaskController extends Controller
{
    public function create(Project $project): Response
    {
        $project->load(['members.user']);

        return Inertia::render('projects/tasks/create', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'options' => [
                'members' => $project->members
                    ->map(fn (ProjectMember $member): array => [
                        'id' => $member->id,
                        'user_id' => $member->user_id,
                        'name' => $member->user->name,
                    ])
                    ->values()
                    ->all(),
                'task_types' => TaskType::query()
                    ->where('is_active', true)
                    ->where(function ($query) use ($project): void {
                        $query->whereNull('project_id')
                            ->orWhere('project_id', $project->id);
                    })
                    ->orderBy('name')
                    ->get(['id', 'name', 'color'])
                    ->all(),
            ],
        ]);
    }

    public function store(StoreBulkProjectTasksRequest $request, Project $project): RedirectResponse
    {
        $membersByUserId = $project->members()->get()->keyBy('user_id');

        DB::transaction(function () use ($request, $project, $membersByUserId): void {
            foreach ($request->validated('tasks') as $task) {
                $projectMember = empty($task['pic_user_id'])
                    ? null
                    : $membersByUserId->get((int) $task['pic_user_id']);

                if (! empty($task['pic_user_id']) && ! $projectMember instanceof ProjectMember) {
                    throw ValidationException::withMessages([
                        'tasks' => ['Selected PIC must be a project member.'],
                    ]);
                }

                $project->tasks()->create([
                    'task_type_id' => $this->validatedTaskTypeId($project, $task['task_type_id'] ?? null),
                    'project_member_id' => $projectMember?->id,
                    'name' => $task['name'],
                    'status' => TaskStatus::Todo,
                    'description' => $task['description'] ?? null,
                    'plan_start_date' => $task['plan_start_date'],
                    'plan_end_date' => $task['plan_end_date'],
                ]);
            }
        });

        return redirect()
            ->route('projects.preparation.show', $project)
            ->with('success', 'Tasks added.');
    }

    private function validatedTaskTypeId(Project $project, mixed $taskTypeId): ?int
    {
        if (empty($taskTypeId)) {
            return null;
        }

        $taskType = TaskType::query()
            ->whereKey((int) $taskTypeId)
            ->where(function ($query) use ($project): void {
                $query->whereNull('project_id')
                    ->orWhere('project_id', $project->id);
            })
            ->first();

        if ($taskType instanceof TaskType) {
            return $taskType->id;
        }

        throw ValidationException::withMessages([
            'tasks' => ['Selected task type is not available for this project.'],
        ]);
    }
}
