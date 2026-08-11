<?php

namespace App\Http\Controllers;

use App\Enums\ProjectStatus;
use App\Exceptions\ProjectLifecycleException;
use App\Http\Requests\RejectProjectRequest;
use App\Models\Customer;
use App\Models\Project;
use App\Models\User;
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
    ) {}

    public function index(): Response
    {
        $projects = Project::query()
            ->with(['customers', 'pm', 'requester'])
            ->withCount(['tasks', 'members'])
            ->where('status', ProjectStatus::PendingApproval->value)
            ->latest('approval_requested_at')
            ->paginate(10)
            ->through(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'project_date' => $this->dateString($project->project_date),
                'approval_requested_at' => $this->dateString($project->approval_requested_at),
                'customers' => $project->customers->map(fn (Customer $customer): array => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'company_name' => $customer->company_name,
                ])->values()->all(),
                'pm' => $project->pm ? $this->userOption($project->pm) : null,
                'requester' => $project->requester ? $this->userOption($project->requester) : null,
                'members_count' => $project->members_count ?? 0,
                'tasks_count' => $project->tasks_count ?? 0,
            ]);

        return Inertia::render('project-approvals/index', [
            'projects' => $projects,
        ]);
    }

    public function approve(Request $request, Project $project): RedirectResponse
    {
        try {
            $this->lifecycleService->approve($project, $this->actor($request));
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

        return redirect()
            ->route('project-approvals.index')
            ->with('success', 'Project approved.');
    }

    public function reject(RejectProjectRequest $request, Project $project): RedirectResponse
    {
        try {
            $this->lifecycleService->reject($project, $this->actor($request), (string) $request->validated('rejection_notes'));
        } catch (ProjectLifecycleException $exception) {
            return back()->withErrors(['project' => $exception->getMessage()]);
        }

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
}
