<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Events\ProjectBoardChanged;
use App\Events\TaskBoardChanged;
use App\Http\Requests\StoreBulkProjectTasksRequest;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectBulkTaskController extends Controller
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

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
        $actor = $this->actor($request);
        $membersByUserId = $project->members()->get()->keyBy('user_id');

        DB::transaction(function () use ($request, $project, $membersByUserId, $actor): void {
            foreach ($request->validated('tasks') as $task) {
                $projectMember = empty($task['pic_user_id'])
                    ? null
                    : $membersByUserId->get((int) $task['pic_user_id']);

                if (! empty($task['pic_user_id']) && ! $projectMember instanceof ProjectMember) {
                    throw ValidationException::withMessages([
                        'tasks' => ['Selected PIC must be a project member.'],
                    ]);
                }

                $projectTask = $project->tasks()->create([
                    'task_type_id' => $this->validatedTaskTypeId($project, $task['task_type_id'] ?? null),
                    'project_member_id' => $projectMember?->id,
                    'name' => $task['name'],
                    'status' => TaskStatus::Todo,
                    'description' => $task['description'] ?? null,
                    'plan_start_date' => $task['plan_start_date'],
                    'plan_end_date' => $task['plan_end_date'],
                ]);

                $this->auditLogger->log(
                    $project,
                    $actor,
                    'task_created',
                    $projectTask,
                    null,
                    $this->taskSnapshot($projectTask),
                    null,
                    'bulk_create',
                );
            }

            TaskBoardChanged::dispatch([
                'project_id' => $project->id,
                'action' => 'tasks_created',
                'actor_id' => $actor->id,
                'changed_at' => now()->toISOString(),
            ]);

            ProjectBoardChanged::dispatch([
                'project_id' => $project->id,
                'action' => 'tasks_created',
                'actor_id' => $actor->id,
                'changed_at' => now()->toISOString(),
            ]);
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

    private function actor(StoreBulkProjectTasksRequest $request): User
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
