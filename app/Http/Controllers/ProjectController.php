<?php

namespace App\Http\Controllers;

use App\Enums\AttachmentCollection;
use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Exceptions\ProjectLifecycleException;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Attachment;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use App\Services\Projects\ProjectLifecycleService;
use App\Services\Projects\ProjectVisibilityService;
use App\Services\Projects\ProjectWriteService;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function __construct(
        private readonly ProjectWriteService $writeService,
        private readonly ProjectLifecycleService $lifecycleService,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->trim()->toString();
        $customerId = $request->string('customer_id')->trim()->toString();
        $pmUserId = $request->string('pm_user_id')->trim()->toString();

        $actor = $this->actor($request);
        $projects = $this->visibility->visibleProjects(Project::query(), $actor)
            ->with(['customers', 'pm', 'incentiveProfile'])
            ->withCount([
                'tasks',
                'members',
                'tasks as done_tasks_count' => fn ($query) => $query->where('status', TaskStatus::Done->value),
            ])
            ->whereIn('status', $this->operationalStatuses())
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($customerId !== '', fn ($query) => $query->whereHas('customers', fn ($query) => $query->whereKey($customerId)))
            ->when($pmUserId !== '', fn ($query) => $query->where('pm_user_id', $pmUserId))
            ->orderByRaw("case status when 'planning' then 1 when 'ongoing' then 2 when 'awaiting_bast' then 3 when 'ready_to_close' then 4 when 'closed' then 5 else 6 end")
            ->latest('updated_at')
            ->get()
            ->map(fn (Project $project): array => $this->summary($project));

        return Inertia::render('projects/index', [
            'columns' => $this->projectColumns($projects),
            'metrics' => $this->statusMetrics($actor),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'customer_id' => $customerId,
                'pm_user_id' => $pmUserId,
            ],
            'options' => $this->options(),
        ]);
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = $this->writeService->create($request->validated(), $this->actor($request));

        if ($request->string('redirect_to')->toString() === 'preparation') {
            return redirect()
                ->route('projects.preparation.show', $project)
                ->with('success', 'Project saved.');
        }

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project saved.');
    }

    public function show(Project $project): Response
    {
        return Inertia::render('projects/show', [
            'project' => $this->detail($this->loadProject($project)),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project = $this->writeService->update($project, $request->validated(), $this->actor($request));

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project updated.');
    }

    public function destroy(Request $request, Project $project): RedirectResponse
    {
        abort_unless($request->user()?->can('manage_projects') === true, 403);

        $project->delete();

        return back()->with('success', 'Project deleted.');
    }

    public function submitApproval(Request $request, Project $project): RedirectResponse
    {
        try {
            $project = $this->lifecycleService->submitForApproval($project, $this->actor($request));
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project submitted for approval.');
    }

    public function resubmit(Request $request, Project $project): RedirectResponse
    {
        try {
            $project = $this->lifecycleService->resubmit($project, $this->actor($request));
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project resubmitted.');
    }

    public function start(Request $request, Project $project): RedirectResponse
    {
        try {
            $project = $this->lifecycleService->start($project, $this->actor($request));
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project started.');
    }

    public function refreshStatus(Project $project): RedirectResponse
    {
        $project = $this->lifecycleService->refreshAutomaticStatus($project);

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project status refreshed.');
    }

    public function close(Request $request, Project $project): RedirectResponse
    {
        try {
            $project = $this->lifecycleService->close($project, $this->actor($request));
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Project closed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'project_date' => $this->dateString($project->project_date),
            'status' => $project->currentStatus()->value,
            'mandays' => $project->mandays,
            'location' => $project->location,
            'plan_start_date' => $this->dateString($project->plan_start_date),
            'plan_end_date' => $this->dateString($project->plan_end_date),
            'actual_start_date' => $this->dateString($project->actual_start_date),
            'actual_end_date' => $this->dateString($project->actual_end_date),
            'customers' => $project->customers->map(fn (Customer $customer): array => $this->customerPayload($customer))->values()->all(),
            'pm' => $project->pm ? $this->userOption($project->pm) : null,
            'incentive_profile' => $project->incentiveProfile ? [
                'id' => $project->incentiveProfile->id,
                'code' => $project->incentiveProfile->code,
                'name' => $project->incentiveProfile->name,
                'version' => $project->incentiveProfile->version,
            ] : null,
            'tasks_count' => $project->tasks_count ?? 0,
            'done_tasks_count' => $project->done_tasks_count ?? 0,
            'members_count' => $project->members_count ?? 0,
            'actions' => $this->actions($project),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(Project $project): array
    {
        return [
            ...$this->summary($project),
            'location' => $project->location,
            'urs_date' => $this->dateString($project->urs_date),
            'urs_number' => $project->urs_number,
            'plan_start_date' => $this->dateString($project->plan_start_date),
            'plan_end_date' => $this->dateString($project->plan_end_date),
            'actual_start_date' => $this->dateString($project->actual_start_date),
            'actual_end_date' => $this->dateString($project->actual_end_date),
            'uat_date' => $this->dateString($project->uat_date),
            'bast_date' => $this->dateString($project->bast_date),
            'rejection_notes' => $project->rejection_notes,
            'requester' => $project->requester ? $this->userOption($project->requester) : null,
            'members' => $project->members->map(fn ($member): array => [
                'id' => $member->id,
                'user' => $member->user ? $this->userOption($member->user) : null,
                'project_role_code' => $member->project_role_code,
                'project_role_name' => $member->project_role_name,
                'pic_level_code' => $member->pic_level_code,
                'pic_level_name' => $member->pic_level_name,
                'is_support' => $member->is_support,
            ])->values()->all(),
            'tasks' => $project->tasks->map(fn (ProjectTask $task): array => [
                'id' => $task->id,
                'name' => $task->name,
                'status' => $this->taskStatusValue($task),
                'plan_start_date' => $this->dateString($task->plan_start_date),
                'plan_end_date' => $this->dateString($task->plan_end_date),
                'pic' => $task->member?->user ? $this->userOption($task->member->user) : null,
            ])->values()->all(),
            'attachments' => $project->attachments->map(fn (Attachment $attachment): array => [
                'id' => $attachment->id,
                'collection' => $this->attachmentCollectionValue($attachment),
                'original_name' => $attachment->original_name,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function actions(Project $project): array
    {
        $status = $project->currentStatus();

        return [
            'can_edit_basic' => in_array($status, [ProjectStatus::Draft, ProjectStatus::Rejected], true),
            'can_prepare' => $status !== ProjectStatus::Closed,
            'can_submit' => $status === ProjectStatus::Draft,
            'can_resubmit' => $status === ProjectStatus::Rejected,
            'can_start' => $status === ProjectStatus::Planning,
            'can_refresh' => in_array($status, [ProjectStatus::Planning, ProjectStatus::Ongoing, ProjectStatus::AwaitingBast], true),
            'can_close' => $status === ProjectStatus::ReadyToClose,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function statusMetrics(User $user): array
    {
        $counts = $this->visibility->visibleProjects(Project::query(), $user)
            ->select('status', DB::raw('count(*) as aggregate'))
            ->whereIn('status', $this->operationalStatuses())
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect($this->operationalStatuses())
            ->mapWithKeys(fn (ProjectStatus $status): array => [
                $status->value => (int) ($counts[$status->value] ?? 0),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'statuses' => collect($this->operationalStatuses())
                ->map(fn (ProjectStatus $status): array => [
                    'value' => $status->value,
                    'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
                ])
                ->all(),
            'customers' => Customer::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'company_name']),
            'users' => User::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'external_id']),
            'incentive_profiles' => IncentiveProfile::query()
                ->where('status', IncentiveProfileStatus::Active->value)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'version']),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $projects
     * @return array<int, array{status: string, label: string, projects: array<int, array<string, mixed>>}>
     */
    private function projectColumns(Collection $projects): array
    {
        return collect($this->operationalStatuses())
            ->map(fn (ProjectStatus $status): array => [
                'status' => $status->value,
                'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
                'projects' => $projects
                    ->where('status', $status->value)
                    ->values()
                    ->all(),
            ])
            ->all();
    }

    /**
     * @return array<int, ProjectStatus>
     */
    private function operationalStatuses(): array
    {
        return [
            ProjectStatus::Planning,
            ProjectStatus::Ongoing,
            ProjectStatus::AwaitingBast,
            ProjectStatus::ReadyToClose,
            ProjectStatus::Closed,
        ];
    }

    private function loadProject(Project $project): Project
    {
        return $project->load([
            'customers',
            'pm',
            'requester',
            'incentiveProfile',
            'members.user',
            'tasks.member.user',
            'attachments',
        ])->loadCount(['tasks', 'members']);
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

    /**
     * @return array{id: int, name: string, company_name: ?string, is_primary: bool}
     */
    private function customerPayload(Customer $customer): array
    {
        $pivot = $customer->getRelationValue('pivot');

        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'company_name' => $customer->company_name,
            'is_primary' => $pivot instanceof Pivot && (bool) $pivot->getAttribute('is_primary'),
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

    private function attachmentCollectionValue(Attachment $attachment): string
    {
        $collection = $attachment->getAttribute('collection');

        if ($collection instanceof AttachmentCollection) {
            return $collection->value;
        }

        return (string) $collection;
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
