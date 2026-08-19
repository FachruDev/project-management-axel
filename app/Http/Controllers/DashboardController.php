<?php

namespace App\Http\Controllers;

use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\Projects\ProjectVisibilityService;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $this->actor($request);
        $projectQuery = $this->visibility->visibleProjects(Project::query(), $user);
        $taskQuery = $this->visibility->visibleTasks(ProjectTask::query(), $user);
        $activeStatuses = [
            ProjectStatus::Planning->value,
            ProjectStatus::Ongoing->value,
            ProjectStatus::AwaitingBast->value,
            ProjectStatus::ReadyToClose->value,
        ];

        return Inertia::render('welcome', [
            'metrics' => [
                'active_projects' => (clone $projectQuery)->whereIn('status', $activeStatuses)->count(),
                'awaiting_approval' => (clone $projectQuery)->where('status', ProjectStatus::PendingApproval->value)->count(),
                'awaiting_bast_projects' => (clone $projectQuery)->where('status', ProjectStatus::AwaitingBast->value)->count(),
                'ready_to_close_projects' => (clone $projectQuery)->where('status', ProjectStatus::ReadyToClose->value)->count(),
                'overdue_tasks' => (clone $taskQuery)
                    ->whereDate('plan_end_date', '<', today())
                    ->whereNotIn('status', [TaskStatus::Done->value, TaskStatus::Cancelled->value])
                    ->count(),
                'due_this_week_tasks' => (clone $taskQuery)
                    ->whereBetween('plan_end_date', [today(), today()->addDays(7)])
                    ->whereNotIn('status', [TaskStatus::Done->value, TaskStatus::Cancelled->value])
                    ->count(),
            ],
            'project_status_distribution' => $this->projectStatusDistribution(clone $projectQuery),
            'task_status_distribution' => $this->taskStatusDistribution(clone $taskQuery),
            'recent_rejected_projects' => $this->recentRejectedProjects(clone $projectQuery),
            'awaiting_bast_projects' => $this->awaitingBastProjects(clone $projectQuery),
            'ready_to_close_projects' => $this->readyToCloseProjects(clone $projectQuery),
            'scope' => $user->hasAnyRole(['super_admin', 'admin']) ? 'global' : 'assigned',
        ]);
    }

    /**
     * @param  Builder<Project>  $query
     * @return array<int, array{status: string, label: string, count: int}>
     */
    private function projectStatusDistribution(Builder $query): array
    {
        $counts = $query
            ->select('status', DB::raw('count(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect(ProjectStatus::cases())
            ->map(fn (ProjectStatus $status): array => [
                'status' => $status->value,
                'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
                'count' => (int) ($counts[$status->value] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Builder<ProjectTask>  $query
     * @return array<int, array{status: string, label: string, count: int}>
     */
    private function taskStatusDistribution(Builder $query): array
    {
        $counts = $query
            ->select('status', DB::raw('count(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect(TaskStatus::cases())
            ->map(fn (TaskStatus $status): array => [
                'status' => $status->value,
                'label' => str($status->value)->headline()->toString(),
                'count' => (int) ($counts[$status->value] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Builder<Project>  $query
     * @return array<int, array<string, mixed>>
     */
    private function recentRejectedProjects(Builder $query): array
    {
        return $query
            ->with(['customers', 'pm'])
            ->where('status', ProjectStatus::Rejected->value)
            ->latest('rejected_at')
            ->limit(5)
            ->get()
            ->map(fn (Project $project): array => $this->projectCard($project))
            ->all();
    }

    /**
     * @param  Builder<Project>  $query
     * @return array<int, array<string, mixed>>
     */
    private function readyToCloseProjects(Builder $query): array
    {
        return $query
            ->with(['customers', 'pm'])
            ->where('status', ProjectStatus::ReadyToClose->value)
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn (Project $project): array => $this->projectCard($project))
            ->all();
    }

    /**
     * @param  Builder<Project>  $query
     * @return array<int, array<string, mixed>>
     */
    private function awaitingBastProjects(Builder $query): array
    {
        return $query
            ->with(['customers', 'pm'])
            ->where('status', ProjectStatus::AwaitingBast->value)
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn (Project $project): array => $this->projectCard($project))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function projectCard(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'status' => $project->currentStatus()->value,
            'customer' => $project->customers->first()?->name,
            'pm' => $project->pm?->name,
            'plan_end_date' => $this->dateString($project->plan_end_date),
            'actions' => [
                'can_upload_bast' => $project->currentStatus() === ProjectStatus::AwaitingBast,
                'can_close' => $project->currentStatus() === ProjectStatus::ReadyToClose,
            ],
        ];
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
