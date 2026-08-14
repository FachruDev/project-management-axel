<?php

namespace App\Http\Controllers;

use App\Enums\ProjectStatus;
use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\ProjectIncentiveCalculation;
use App\Models\ProjectIncentiveItem;
use App\Models\User;
use App\Services\Incentives\IncentiveProfileBatchCalculator;
use App\Services\Incentives\ProjectCalculationLockService;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectCalculationController extends Controller
{
    public function __construct(
        private readonly IncentiveProfileBatchCalculator $batchCalculator,
        private readonly ProjectCalculationLockService $lockService,
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $incentiveProfileId = $request->string('incentive_profile_id')->trim()->toString();
        $lockStatus = $request->string('lock_status')->trim()->toString();

        $projects = Project::query()
            ->with([
                'customers',
                'pm',
                'incentiveProfile',
                'currentIncentiveCalculation.calculatedBy',
                'currentIncentiveCalculation.lockedBy',
            ])
            ->withCount('members')
            ->where('status', ProjectStatus::Closed->value)
            ->whereNotNull('incentive_profile_id')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhereHas('customers', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('pm', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($incentiveProfileId !== '', fn ($query) => $query->where('incentive_profile_id', $incentiveProfileId))
            ->when($lockStatus === 'not_calculated', fn ($query) => $query->whereDoesntHave('currentIncentiveCalculation'))
            ->when($lockStatus === 'open', fn ($query) => $query->whereHas('currentIncentiveCalculation', fn ($query) => $query->whereNull('locked_at')))
            ->when($lockStatus === 'locked', fn ($query) => $query->whereHas('currentIncentiveCalculation', fn ($query) => $query->whereNotNull('locked_at')))
            ->latest('updated_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Project $project): array => $this->projectRow($project, $request));

        return Inertia::render('project-calculations/index', [
            'projects' => $projects,
            'filters' => [
                'search' => $search,
                'incentive_profile_id' => $incentiveProfileId,
                'lock_status' => $lockStatus,
            ],
            'options' => [
                'incentive_profiles' => $this->incentiveProfiles(),
                'lock_statuses' => $this->lockStatuses(),
            ],
            'actions' => $this->pageActions($request),
        ]);
    }

    public function show(ProjectIncentiveCalculation $projectIncentiveCalculation): Response
    {
        $calculation = $projectIncentiveCalculation->load([
            'project.customers',
            'project.pm',
            'incentiveProfile',
            'calculatedBy',
            'lockedBy',
            'items.employee',
        ]);

        return Inertia::render('project-calculations/show', [
            'calculation' => $this->calculationDetail($calculation),
            'actions' => $this->calculationActions($calculation, request()),
        ]);
    }

    public function recalculate(Request $request, IncentiveProfile $incentiveProfile): RedirectResponse
    {
        $summary = $this->batchCalculator->calculateForProfile($incentiveProfile, $this->actor($request));

        return redirect()
            ->route('project-calculations.index', [
                'incentive_profile_id' => $incentiveProfile->id,
            ])
            ->with('success', sprintf(
                'Project calculation finished: %d calculated, %d skipped.',
                $summary['calculated'],
                $summary['skipped'],
            ))
            ->with('calculation_summary', $summary);
    }

    public function lock(Request $request, ProjectIncentiveCalculation $projectIncentiveCalculation): RedirectResponse
    {
        $validated = $request->validate([
            'lock_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->lockService->lock(
            $projectIncentiveCalculation,
            $this->actor($request),
            $validated['lock_notes'] ?? null,
        );

        return back()->with('success', 'Project calculation locked.');
    }

    public function unlock(Request $request, ProjectIncentiveCalculation $projectIncentiveCalculation): RedirectResponse
    {
        $this->lockService->unlock($projectIncentiveCalculation, $this->actor($request));

        return back()->with('success', 'Project calculation unlocked.');
    }

    /**
     * @return array<string, mixed>
     */
    private function projectRow(Project $project, Request $request): array
    {
        $calculation = $project->currentIncentiveCalculation;

        return [
            'id' => $project->id,
            'name' => $project->name,
            'project_date' => $this->dateString($project->project_date),
            'mandays' => $project->mandays,
            'customers' => $project->customers
                ->map(fn (Customer $customer): array => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'company_name' => $customer->company_name,
                ])
                ->values()
                ->all(),
            'pm' => $project->pm ? $this->userOption($project->pm) : null,
            'incentive_profile' => $project->incentiveProfile ? [
                'id' => $project->incentiveProfile->id,
                'code' => $project->incentiveProfile->code,
                'name' => $project->incentiveProfile->name,
                'version' => $project->incentiveProfile->version,
            ] : null,
            'members_count' => $project->members_count ?? 0,
            'calculation' => $calculation instanceof ProjectIncentiveCalculation
                ? $this->calculationSummary($calculation)
                : null,
            'actions' => $calculation instanceof ProjectIncentiveCalculation
                ? $this->calculationActions($calculation, $request)
                : [
                    'can_view' => false,
                    'can_lock' => false,
                    'can_unlock' => false,
                ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculationSummary(ProjectIncentiveCalculation $calculation): array
    {
        return [
            'id' => $calculation->id,
            'is_current' => $calculation->is_current,
            'is_locked' => $calculation->isLocked(),
            'mandays' => $calculation->mandays,
            'base_score' => $calculation->base_score,
            'support_pool' => $calculation->support_pool,
            'technical_pool' => $calculation->technical_pool,
            'difference_days' => $calculation->difference_days,
            'delivery_status' => $this->deliveryStatusValue($calculation),
            'delivery_multiplier' => $calculation->delivery_multiplier,
            'total_incentive' => $calculation->total_incentive,
            'calculated_at' => $this->dateTimeString($calculation->calculated_at),
            'calculated_by' => $calculation->calculatedBy ? $this->userOption($calculation->calculatedBy) : null,
            'locked_at' => $this->dateTimeString($calculation->locked_at),
            'locked_by' => $calculation->lockedBy ? $this->userOption($calculation->lockedBy) : null,
            'lock_notes' => $calculation->lock_notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculationDetail(ProjectIncentiveCalculation $calculation): array
    {
        return [
            ...$this->calculationSummary($calculation),
            'project' => [
                'id' => $calculation->project?->id,
                'name' => $calculation->project?->name,
                'project_date' => $this->dateString($calculation->project?->project_date),
                'customers' => $calculation->project?->customers
                    ->map(fn (Customer $customer): array => [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'company_name' => $customer->company_name,
                    ])
                    ->values()
                    ->all() ?? [],
                'pm' => $calculation->project?->pm ? $this->userOption($calculation->project->pm) : null,
            ],
            'incentive_profile' => $calculation->incentiveProfile ? [
                'id' => $calculation->incentiveProfile->id,
                'code' => $calculation->incentiveProfile->code,
                'name' => $calculation->incentiveProfile->name,
                'version' => $calculation->incentiveProfile->version,
            ] : null,
            'items' => $calculation->items
                ->map(fn (ProjectIncentiveItem $item): array => [
                    'id' => $item->id,
                    'employee' => $item->employee ? $this->userOption($item->employee) : null,
                    'employee_name' => $item->employee_name,
                    'project_role' => $item->project_role,
                    'pic_level' => $item->pic_level,
                    'is_support' => $item->is_support,
                    'pic_points' => $item->pic_points,
                    'role_points' => $item->role_points,
                    'weight_points' => $item->weight_points,
                    'weight_ratio' => $item->weight_ratio,
                    'base_incentive' => $item->base_incentive,
                    'delivery_multiplier' => $item->delivery_multiplier,
                    'final_incentive' => $item->final_incentive,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function pageActions(Request $request): array
    {
        return [
            'can_recalculate' => $request->user()?->can('calculate_project_incentives') === true,
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function calculationActions(ProjectIncentiveCalculation $calculation, Request $request): array
    {
        return [
            'can_view' => $request->user()?->can('view_project_incentives') === true,
            'can_lock' => $calculation->is_current
                && ! $calculation->isLocked()
                && $request->user()?->can('lock_project_incentives') === true,
            'can_unlock' => $calculation->is_current
                && $calculation->isLocked()
                && $request->user()?->can('unlock_project_incentives') === true,
        ];
    }

    /**
     * @return array<int, array{id: int, code: string, name: string, version: int}>
     */
    private function incentiveProfiles(): array
    {
        return IncentiveProfile::query()
            ->orderBy('code')
            ->orderByDesc('version')
            ->get(['id', 'code', 'name', 'version'])
            ->map(fn (IncentiveProfile $profile): array => [
                'id' => $profile->id,
                'code' => $profile->code,
                'name' => $profile->name,
                'version' => $profile->version,
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function lockStatuses(): array
    {
        return [
            ['value' => '', 'label' => 'All'],
            ['value' => 'not_calculated', 'label' => 'Not Calculated'],
            ['value' => 'open', 'label' => 'Open'],
            ['value' => 'locked', 'label' => 'Locked'],
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

    private function deliveryStatusValue(ProjectIncentiveCalculation $calculation): string
    {
        $status = $calculation->getAttribute('delivery_status');

        return $status instanceof BackedEnum ? (string) $status->value : (string) $status;
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
}
