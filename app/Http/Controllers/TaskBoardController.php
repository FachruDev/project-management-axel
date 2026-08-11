<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectTaskTransitionService;
use App\Services\Projects\ProjectVisibilityService;
use DateTimeInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskBoardController extends Controller
{
    public function __construct(
        private readonly ProjectVisibilityService $visibility,
        private readonly ProjectTaskTransitionService $transitionService,
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $this->actor($request);
        $search = $request->string('search')->trim()->toString();
        $projectId = $request->string('project_id')->trim()->toString();
        $picUserId = $request->string('pic_user_id')->trim()->toString();
        $taskTypeId = $request->string('task_type_id')->trim()->toString();
        $due = $request->string('due')->trim()->toString();

        $tasks = $this->visibility->visibleTasks(ProjectTask::query(), $user)
            ->with(['project.customers', 'member.user', 'taskType'])
            ->withCount('attachments')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($projectId !== '', fn ($query) => $query->where('project_id', $projectId))
            ->when($picUserId !== '', fn ($query) => $query->whereHas('member', fn ($query) => $query->where('user_id', $picUserId)))
            ->when($taskTypeId !== '', fn ($query) => $query->where('task_type_id', $taskTypeId))
            ->when($due === 'overdue', fn ($query) => $query
                ->whereDate('plan_end_date', '<', today())
                ->whereNotIn('status', [TaskStatus::Done->value, TaskStatus::Cancelled->value]))
            ->when($due === 'week', fn ($query) => $query
                ->whereBetween('plan_end_date', [today(), today()->addDays(7)])
                ->whereNotIn('status', [TaskStatus::Done->value, TaskStatus::Cancelled->value]))
            ->latest('updated_at')
            ->get()
            ->map(fn (ProjectTask $task): array => $this->taskCard($task));

        return Inertia::render('tasks/index', [
            'columns' => collect(TaskStatus::cases())
                ->map(fn (TaskStatus $status): array => [
                    'status' => $status->value,
                    'label' => str($status->value)->headline()->toString(),
                    'tasks' => $tasks->where('status', $status->value)->values()->all(),
                ])
                ->all(),
            'filters' => [
                'search' => $search,
                'project_id' => $projectId,
                'pic_user_id' => $picUserId,
                'task_type_id' => $taskTypeId,
                'due' => $due,
            ],
            'options' => [
                'projects' => $this->visibility->visibleProjects(Project::query(), $user)
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (Project $project): array => [
                        'id' => $project->id,
                        'name' => $project->name,
                    ])
                    ->all(),
                'users' => User::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'email', 'external_id']),
                'task_types' => TaskType::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'color']),
                'statuses' => collect(TaskStatus::cases())
                    ->map(fn (TaskStatus $status): array => [
                        'value' => $status->value,
                        'label' => str($status->value)->headline()->toString(),
                    ])
                    ->all(),
                'due_filters' => [
                    ['value' => '', 'label' => 'All Due Dates'],
                    ['value' => 'overdue', 'label' => 'Overdue'],
                    ['value' => 'week', 'label' => 'Due This Week'],
                ],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function taskCard(ProjectTask $task): array
    {
        return [
            'id' => $task->id,
            'name' => $task->name,
            'status' => $this->taskStatusValue($task),
            'description' => $task->description,
            'plan_start_date' => $this->dateString($task->plan_start_date),
            'plan_end_date' => $this->dateString($task->plan_end_date),
            'actual_start_date' => $this->dateString($task->actual_start_date),
            'actual_end_date' => $this->dateString($task->actual_end_date),
            'attachments_count' => $task->attachments_count ?? 0,
            'project' => $task->project ? [
                'id' => $task->project->id,
                'name' => $task->project->name,
                'status' => $task->project->currentStatus()->value,
                'customer' => $task->project->customers->first()?->name,
            ] : null,
            'pic' => $task->member?->user ? [
                'id' => $task->member->user->id,
                'name' => $task->member->user->name,
                'email' => $task->member->user->email,
                'external_id' => $task->member->user->external_id,
            ] : null,
            'task_type' => $task->taskType ? [
                'id' => $task->taskType->id,
                'name' => $task->taskType->name,
                'color' => $task->taskType->color,
            ] : null,
            'allowed_statuses' => collect($this->transitionService->allowedTargets($task))
                ->map(fn (TaskStatus $status): string => $status->value)
                ->all(),
        ];
    }

    private function taskStatusValue(ProjectTask $task): string
    {
        $status = $task->getAttribute('status');

        if ($status instanceof TaskStatus) {
            return $status->value;
        }

        return (string) $status;
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value === null ? null : (string) $value;
    }
}
