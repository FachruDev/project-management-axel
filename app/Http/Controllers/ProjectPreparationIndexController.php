<?php

namespace App\Http\Controllers;

use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectVisibilityService;
use DateTimeInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectPreparationIndexController extends Controller
{
    public function __construct(
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function __invoke(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->trim()->toString();
        $user = $this->actor($request);

        $projects = $this->visibility->visibleProjects(Project::query(), $user)
            ->with(['customers', 'pm', 'incentiveProfile'])
            ->withCount(['tasks', 'members'])
            ->whereIn('status', $this->preparationStatuses())
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest('updated_at')
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'project_date' => $this->dateString($project->project_date),
                'status' => $project->currentStatus()->value,
                'mandays' => $project->mandays,
                'plan_start_date' => $this->dateString($project->plan_start_date),
                'plan_end_date' => $this->dateString($project->plan_end_date),
                'customers' => $project->customers->map(fn (Customer $customer): array => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'company_name' => $customer->company_name,
                ])->values()->all(),
                'pm' => $project->pm ? $this->userOption($project->pm) : null,
                'incentive_profile' => $project->incentiveProfile ? [
                    'id' => $project->incentiveProfile->id,
                    'code' => $project->incentiveProfile->code,
                    'name' => $project->incentiveProfile->name,
                    'version' => $project->incentiveProfile->version,
                ] : null,
                'tasks_count' => $project->tasks_count ?? 0,
                'done_tasks_count' => 0,
                'members_count' => $project->members_count ?? 0,
                'actions' => [
                    'can_edit_basic' => in_array($project->currentStatus(), [ProjectStatus::Draft, ProjectStatus::Rejected], true),
                    'can_prepare' => $project->currentStatus() !== ProjectStatus::Closed,
                    'can_submit' => $project->currentStatus() === ProjectStatus::Draft,
                    'can_resubmit' => $project->currentStatus() === ProjectStatus::Rejected,
                    'can_start' => false,
                    'can_refresh' => false,
                    'can_close' => false,
                ],
            ]);

        return Inertia::render('project-preparations/index', [
            'columns' => collect($this->preparationStatuses())
                ->map(fn (ProjectStatus $status): array => [
                    'status' => $status->value,
                    'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
                    'projects' => $projects->where('status', $status->value)->values()->all(),
                ])
                ->all(),
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'options' => [
                'statuses' => collect($this->preparationStatuses())
                    ->map(fn (ProjectStatus $status): array => [
                        'value' => $status->value,
                        'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
                    ])
                    ->all(),
                'customers' => Customer::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'company_name']),
                'incentive_profiles' => IncentiveProfile::query()
                    ->where('status', IncentiveProfileStatus::Active->value)
                    ->orderBy('code')
                    ->get(['id', 'code', 'name', 'version']),
            ],
        ]);
    }

    /**
     * @return array<int, ProjectStatus>
     */
    private function preparationStatuses(): array
    {
        return [
            ProjectStatus::Draft,
            ProjectStatus::PendingApproval,
            ProjectStatus::Rejected,
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, external_id: ?string}
     */
    private function userOption(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'external_id' => $user->external_id,
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
