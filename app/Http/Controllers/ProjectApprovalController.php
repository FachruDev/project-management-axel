<?php

namespace App\Http\Controllers;

use App\Enums\ProjectStatus;
use App\Events\ProjectBoardChanged;
use App\Exceptions\ProjectLifecycleException;
use App\Http\Requests\RejectProjectRequest;
use App\Models\Customer;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectAuditLogger;
use App\Services\Projects\ProjectLifecycleService;
use DateTimeInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectApprovalController extends Controller
{
    public function __construct(
        private readonly ProjectLifecycleService $lifecycleService,
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function index(Request $request): Response
    {
        $filter = $request->string('filter')->trim()->toString();
        $filter = in_array($filter, ['pending', 'rejected', 'approved', 'all'], true) ? $filter : 'pending';

        $projects = Project::query()
            ->with(['customers', 'pm', 'requester', 'approver', 'rejector'])
            ->withCount(['tasks', 'members'])
            ->when($filter === 'pending', fn ($query) => $query->where('status', ProjectStatus::PendingApproval->value))
            ->when($filter === 'rejected', fn ($query) => $query->where('status', ProjectStatus::Rejected->value))
            ->when($filter === 'approved', fn ($query) => $query->whereNotNull('approved_at'))
            ->when($filter === 'all', fn ($query) => $query->where(function ($query): void {
                $query->where('status', ProjectStatus::PendingApproval->value)
                    ->orWhere('status', ProjectStatus::Rejected->value)
                    ->orWhereNotNull('approved_at');
            }))
            ->latest('approval_requested_at')
            ->latest('updated_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->currentStatus()->value,
                'project_date' => $this->dateString($project->project_date),
                'approval_requested_at' => $this->dateString($project->approval_requested_at),
                'approved_at' => $this->dateString($project->approved_at),
                'rejected_at' => $this->dateString($project->rejected_at),
                'rejection_notes' => $project->rejection_notes,
                'customers' => $project->customers->map(fn (Customer $customer): array => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'company_name' => $customer->company_name,
                ])->values()->all(),
                'pm' => $project->pm ? $this->userOption($project->pm) : null,
                'requester' => $project->requester ? $this->userOption($project->requester) : null,
                'approver' => $project->approver ? $this->userOption($project->approver) : null,
                'rejector' => $project->rejector ? $this->userOption($project->rejector) : null,
                'members_count' => $project->members_count ?? 0,
                'tasks_count' => $project->tasks_count ?? 0,
            ]);

        return Inertia::render('project-approvals/index', [
            'projects' => $projects,
            'filters' => [
                'filter' => $filter,
            ],
            'filter_options' => [
                ['value' => 'pending', 'label' => 'Pending Approval'],
                ['value' => 'rejected', 'label' => 'Rejected'],
                ['value' => 'approved', 'label' => 'Approved'],
                ['value' => 'all', 'label' => 'All'],
            ],
        ]);
    }

    public function approve(Request $request, Project $project): RedirectResponse
    {
        $actor = $this->actor($request);
        $fromStatus = $project->currentStatus();

        try {
            $project = $this->lifecycleService->approve($project, $actor);
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        $this->auditLogger->log(
            $project,
            $actor,
            'project_approved',
            $project,
            ['status' => $fromStatus->value],
            ['status' => $project->currentStatus()->value],
        );
        $this->broadcastProjectChange($project, $fromStatus->value, $project->currentStatus()->value, 'project_approved', $actor);

        return redirect()
            ->route('project-approvals.index')
            ->with('success', 'Project approved.');
    }

    public function reject(RejectProjectRequest $request, Project $project): RedirectResponse
    {
        $actor = $this->actor($request);
        $fromStatus = $project->currentStatus();
        $notes = (string) $request->validated('rejection_notes');

        try {
            $project = $this->lifecycleService->reject($project, $actor, $notes);
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        $this->auditLogger->log(
            $project,
            $actor,
            'project_rejected',
            $project,
            ['status' => $fromStatus->value],
            ['status' => $project->currentStatus()->value],
            $notes,
        );
        $this->broadcastProjectChange($project, $fromStatus->value, $project->currentStatus()->value, 'project_rejected', $actor);

        return redirect()
            ->route('project-approvals.index')
            ->with('success', 'Project rejected.');
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

    private function broadcastProjectChange(Project $project, ?string $oldStatus, ?string $newStatus, string $action, User $actor): void
    {
        ProjectBoardChanged::dispatch([
            'project_id' => $project->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'action' => $action,
            'actor_id' => $actor->id,
            'changed_at' => now()->toISOString(),
        ]);
    }
}
