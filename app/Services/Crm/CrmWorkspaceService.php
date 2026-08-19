<?php

namespace App\Services\Crm;

use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\User;
use App\Services\Projects\ProjectVisibilityService;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class CrmWorkspaceService
{
    public function __construct(
        private readonly ProjectVisibilityService $visibility,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function index(Request $request, User $user): array
    {
        $filters = [
            'search' => $request->string('search')->trim()->toString(),
            'status' => $request->string('status')->trim()->toString(),
        ];

        $customers = Customer::query()
            ->select('customers.*')
            ->withCount([
                'projects' => fn (Builder $query) => $this->visibleRelationProjects($query, $user),
                'projects as active_projects_count' => fn (Builder $query) => $this->visibleRelationProjects($query, $user)
                    ->whereIn('projects.status', $this->activeStatuses()),
                'projects as closed_projects_count' => fn (Builder $query) => $this->visibleRelationProjects($query, $user)
                    ->where('projects.status', ProjectStatus::Closed->value),
            ])
            ->withMax([
                'projects as last_project_update_at' => fn (Builder $query) => $this->visibleRelationProjects($query, $user),
            ], 'updated_at')
            ->addSelect([
                'locked_incentive_total' => $this->lockedIncentiveSubquery($user),
            ])
            ->when(! $this->userSeesGlobalProjects($user), fn (Builder $query) => $query
                ->whereHas('projects', fn (Builder $query) => $this->visibility->visibleProjects($query, $user)))
            ->when($filters['search'] !== '', function (Builder $query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function (Builder $query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhereHas('projects', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when($filters['status'] === 'inactive', fn (Builder $query) => $query->where('is_active', false))
            ->orderByDesc('last_project_update_at')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Customer $customer): array => $this->customerRow($customer));

        return [
            'customers' => $customers,
            'filters' => $filters,
            'options' => [
                'statuses' => [
                    ['value' => '', 'label' => 'All Customers'],
                    ['value' => 'active', 'label' => 'Active'],
                    ['value' => 'inactive', 'label' => 'Inactive'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Request $request, User $user, Customer $customer): array
    {
        abort_unless($this->customerIsVisible($customer, $user), 403);

        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->trim()->toString();
        $projectQuery = $this->customerVisibleProjects($customer, $user);

        $projects = (clone $projectQuery)
            ->with([
                'pm:id,name,email,external_id',
                'incentiveProfile:id,code,name,version',
                'currentIncentiveCalculation',
            ])
            ->withCount([
                'tasks',
                'tasks as done_tasks_count' => fn (Builder $query) => $query->where('status', TaskStatus::Done->value),
                'members',
            ])
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
            ->when($status !== '', fn (Builder $query) => $query->where('status', $status))
            ->orderByRaw("case status when 'planning' then 1 when 'ongoing' then 2 when 'awaiting_bast' then 3 when 'ready_to_close' then 4 when 'closed' then 5 else 6 end")
            ->latest('updated_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Project $project): array => $this->projectRow($project, $request));

        return [
            'customer' => $this->customerDetail($customer, $this->customerSummary(clone $projectQuery)),
            'projects' => $projects,
            'status_distribution' => $this->statusDistribution(clone $projectQuery),
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'options' => [
                'statuses' => $this->projectStatusOptions(),
            ],
        ];
    }

    /**
     * @return Builder<Project>
     */
    private function customerVisibleProjects(Customer $customer, User $user): Builder
    {
        return $this->visibility
            ->visibleProjects(Project::query(), $user)
            ->whereHas('customers', fn (Builder $query) => $query->whereKey($customer->id));
    }

    private function customerIsVisible(Customer $customer, User $user): bool
    {
        if ($this->userSeesGlobalProjects($user)) {
            return true;
        }

        return $this->customerVisibleProjects($customer, $user)->exists();
    }

    private function userSeesGlobalProjects(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }

    /**
     * @return array<string, mixed>
     */
    private function customerRow(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'company_name' => $customer->company_name,
            'is_active' => $customer->is_active,
            'projects_count' => $customer->projects_count ?? 0,
            'active_projects_count' => $customer->active_projects_count ?? 0,
            'closed_projects_count' => $customer->closed_projects_count ?? 0,
            'last_project_update' => $this->dateTimeString($customer->last_project_update_at),
            'locked_incentive_total' => (string) ($customer->locked_incentive_total ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function customerDetail(Customer $customer, array $summary): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'company_name' => $customer->company_name,
            'company_address' => $customer->company_address,
            'is_active' => $customer->is_active,
            'summary' => $summary,
        ];
    }

    /**
     * @param  Builder<Project>  $query
     * @return array<string, mixed>
     */
    private function customerSummary(Builder $query): array
    {
        return [
            'projects_count' => (clone $query)->count(),
            'active_projects_count' => (clone $query)->whereIn('status', $this->activeStatuses())->count(),
            'closed_projects_count' => (clone $query)->where('status', ProjectStatus::Closed->value)->count(),
            'locked_incentive_total' => (string) ProjectIncentiveCalculation::query()
                ->where('is_current', true)
                ->whereNotNull('locked_at')
                ->whereIn('project_id', (clone $query)->select('id'))
                ->sum('total_incentive'),
        ];
    }

    /**
     * @param  Builder<Project>  $query
     * @return array<int, array{status: string, label: string, count: int}>
     */
    private function statusDistribution(Builder $query): array
    {
        $counts = (clone $query)
            ->select('status')
            ->selectRaw('count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect(ProjectStatus::cases())
            ->map(fn (ProjectStatus $status): array => [
                'status' => $status->value,
                'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
                'count' => (int) ($counts[$status->value] ?? 0),
            ])
            ->filter(fn (array $row): bool => $row['count'] > 0)
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function projectRow(Project $project, Request $request): array
    {
        $calculation = $project->currentIncentiveCalculation;
        $tasksCount = (int) ($project->tasks_count ?? 0);
        $doneTasksCount = (int) ($project->done_tasks_count ?? 0);

        return [
            'id' => $project->id,
            'name' => $project->name,
            'status' => $this->statusValue($project),
            'project_date' => $this->dateString($project->project_date),
            'plan_start_date' => $this->dateString($project->plan_start_date),
            'plan_end_date' => $this->dateString($project->plan_end_date),
            'actual_start_date' => $this->dateString($project->actual_start_date),
            'actual_end_date' => $this->dateString($project->actual_end_date),
            'mandays' => $project->mandays,
            'progress' => $tasksCount > 0 ? (int) round(($doneTasksCount / $tasksCount) * 100) : 0,
            'tasks_count' => $tasksCount,
            'done_tasks_count' => $doneTasksCount,
            'members_count' => (int) ($project->members_count ?? 0),
            'pm' => $project->pm ? $this->userPayload($project->pm) : null,
            'incentive_profile' => $project->incentiveProfile ? [
                'id' => $project->incentiveProfile->id,
                'code' => $project->incentiveProfile->code,
                'name' => $project->incentiveProfile->name,
                'version' => $project->incentiveProfile->version,
            ] : null,
            'calculation' => $calculation instanceof ProjectIncentiveCalculation ? [
                'id' => $calculation->id,
                'is_locked' => $calculation->isLocked(),
                'total_incentive' => $calculation->total_incentive,
                'delivery_multiplier' => $calculation->delivery_multiplier,
                'calculated_at' => $this->dateTimeString($calculation->calculated_at),
                'locked_at' => $this->dateTimeString($calculation->locked_at),
                'delivery_status' => $this->deliveryStatusValue($calculation->delivery_status),
            ] : null,
            'actions' => [
                'can_view_project' => $request->user()?->can('view_projects') === true,
                'can_view_calculation' => $calculation instanceof ProjectIncentiveCalculation
                    && $request->user()?->can('view_project_incentives') === true,
            ],
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function projectStatusOptions(): array
    {
        return collect(ProjectStatus::cases())
            ->map(fn (ProjectStatus $status): array => [
                'value' => $status->value,
                'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
            ])
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function activeStatuses(): array
    {
        return [
            ProjectStatus::Planning->value,
            ProjectStatus::Ongoing->value,
            ProjectStatus::AwaitingBast->value,
            ProjectStatus::ReadyToClose->value,
        ];
    }

    private function lockedIncentiveSubquery(User $user): mixed
    {
        return ProjectIncentiveCalculation::query()
            ->selectRaw('coalesce(sum(total_incentive), 0)')
            ->join('customer_project', 'customer_project.project_id', '=', 'project_incentive_calculations.project_id')
            ->join('projects', 'projects.id', '=', 'project_incentive_calculations.project_id')
            ->whereColumn('customer_project.customer_id', 'customers.id')
            ->where('project_incentive_calculations.is_current', true)
            ->whereNotNull('project_incentive_calculations.locked_at')
            ->when(! $this->userSeesGlobalProjects($user), fn (Builder $query) => $this->visibleJoinedProjects($query, $user));
    }

    /**
     * @return Builder<Project>
     */
    private function visibleRelationProjects(Builder $query, User $user): Builder
    {
        if ($this->userSeesGlobalProjects($user)) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($user): void {
            $query
                ->where('projects.pm_user_id', $user->id)
                ->orWhere('projects.request_user_id', $user->id)
                ->orWhereHas('members', fn (Builder $query) => $query->where('user_id', $user->id))
                ->orWhereHas('accessRules', fn (Builder $query) => $query->where('user_id', $user->id));
        });
    }

    /**
     * @return Builder<ProjectIncentiveCalculation>
     */
    private function visibleJoinedProjects(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $query) use ($user): void {
            $query
                ->where('projects.pm_user_id', $user->id)
                ->orWhere('projects.request_user_id', $user->id)
                ->orWhereExists(function ($query) use ($user): void {
                    $query
                        ->selectRaw('1')
                        ->from('project_members')
                        ->whereColumn('project_members.project_id', 'projects.id')
                        ->where('project_members.user_id', $user->id);
                })
                ->orWhereExists(function ($query) use ($user): void {
                    $query
                        ->selectRaw('1')
                        ->from('project_access_rules')
                        ->whereColumn('project_access_rules.project_id', 'projects.id')
                        ->where('project_access_rules.user_id', $user->id);
                });
        });
    }

    private function statusValue(Project $project): string
    {
        $status = $project->status;

        return $status instanceof ProjectStatus ? $status->value : (string) $status;
    }

    /**
     * @return array{id: int, name: string, email: string, external_id: ?string}
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'external_id' => $user->external_id,
        ];
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value === null ? null : (string) $value;
    }

    private function dateTimeString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        return $value === null ? null : (string) $value;
    }

    private function deliveryStatusValue(mixed $value): string
    {
        if ($value instanceof BackedEnum) {
            return (string) $value->value;
        }

        return $value === null ? '' : (string) $value;
    }
}
