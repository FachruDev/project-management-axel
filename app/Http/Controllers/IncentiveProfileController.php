<?php

namespace App\Http\Controllers;

use App\Enums\IncentiveProfileStatus;
use App\Http\Requests\StoreIncentiveProfileRequest;
use App\Http\Requests\StoreIncentiveProfileVersionRequest;
use App\Http\Requests\UpdateIncentiveProfileRequest;
use App\Http\Requests\UpdateIncentiveProfileStatusRequest;
use App\Models\IncentiveProfile;
use App\Models\User;
use App\Services\Incentives\IncentiveProfileBatchCalculator;
use App\Services\Incentives\IncentiveProfileService;
use DateTimeInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncentiveProfileController extends Controller
{
    public function __construct(
        private readonly IncentiveProfileService $service,
        private readonly IncentiveProfileBatchCalculator $batchCalculator,
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->trim()->toString();

        $profiles = IncentiveProfile::query()
            ->withCount(['mandayRules', 'picLevelRules', 'projectRoleRules', 'deliveryRules', 'projects', 'incentiveCalculations'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (IncentiveProfile $profile): array => $this->summary($profile));

        return Inertia::render('incentive-profiles/index', [
            'profiles' => $profiles,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'statuses' => $this->statuses(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('incentive-profiles/form', [
            'mode' => 'create',
            'profile' => $this->blankProfile(),
            'statuses' => $this->statuses(),
        ]);
    }

    public function store(StoreIncentiveProfileRequest $request): RedirectResponse
    {
        $profile = $this->service->create($request->validated(), $this->actor($request));

        return redirect()
            ->route('incentive-profiles.show', $profile)
            ->with('success', 'Incentive profile created.');
    }

    public function show(IncentiveProfile $incentiveProfile): Response
    {
        $profile = $this->loadProfile($incentiveProfile);

        return Inertia::render('incentive-profiles/show', [
            'profile' => $this->detail($profile),
            'statuses' => $this->statuses(),
        ]);
    }

    public function edit(IncentiveProfile $incentiveProfile): Response
    {
        $profile = $this->loadProfile($incentiveProfile);

        return Inertia::render('incentive-profiles/form', [
            'mode' => 'edit',
            'profile' => $this->detail($profile),
            'statuses' => $this->statuses(),
        ]);
    }

    public function update(UpdateIncentiveProfileRequest $request, IncentiveProfile $incentiveProfile): RedirectResponse
    {
        $profile = $this->service->update($incentiveProfile, $request->validated(), $this->actor($request));

        return redirect()
            ->route('incentive-profiles.show', $profile)
            ->with('success', 'Incentive profile updated.');
    }

    public function destroy(IncentiveProfile $incentiveProfile): RedirectResponse
    {
        $this->service->delete($incentiveProfile);

        return redirect()
            ->route('incentive-profiles.index')
            ->with('success', 'Incentive profile deleted.');
    }

    public function updateStatus(UpdateIncentiveProfileStatusRequest $request, IncentiveProfile $incentiveProfile): RedirectResponse
    {
        $validated = $request->validated();
        $profile = $this->service->updateStatus(
            $incentiveProfile,
            IncentiveProfileStatus::from((string) $validated['status']),
            $this->actor($request),
        );

        return redirect()
            ->route('incentive-profiles.show', $profile)
            ->with('success', 'Incentive profile status updated.');
    }

    public function storeVersion(StoreIncentiveProfileVersionRequest $request, IncentiveProfile $incentiveProfile): RedirectResponse
    {
        $profile = $this->service->createVersion($incentiveProfile, $this->actor($request));

        return redirect()
            ->route('incentive-profiles.edit', $profile)
            ->with('success', 'New incentive profile version created.');
    }

    public function calculateProjects(IncentiveProfile $incentiveProfile): RedirectResponse
    {
        $summary = $this->batchCalculator->calculateForProfile($incentiveProfile);

        return redirect()
            ->route('incentive-profiles.show', $incentiveProfile)
            ->with('success', sprintf(
                'Incentive calculation finished: %d calculated, %d skipped.',
                $summary['calculated'],
                $summary['skipped'],
            ))
            ->with('calculation_summary', $summary);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(IncentiveProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'code' => $profile->code,
            'name' => $profile->name,
            'version' => $profile->version,
            'status' => $profile->currentStatus()->value,
            'effective_from' => $this->dateString($profile->getAttribute('effective_from')),
            'effective_to' => $this->dateString($profile->getAttribute('effective_to')),
            'support_percent' => $profile->support_percent,
            'rule_counts' => [
                'manday' => $profile->manday_rules_count ?? 0,
                'pic_level' => $profile->pic_level_rules_count ?? 0,
                'project_role' => $profile->project_role_rules_count ?? 0,
                'delivery' => $profile->delivery_rules_count ?? 0,
            ],
            'usage_counts' => [
                'projects' => $profile->projects_count ?? 0,
                'calculations' => $profile->incentive_calculations_count ?? 0,
            ],
            'actions' => $this->actions($profile),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(IncentiveProfile $profile): array
    {
        return [
            ...$this->summary($profile),
            'description' => $profile->description,
            'created_by' => $profile->created_by,
            'updated_by' => $profile->updated_by,
            'manday_rules' => $profile->mandayRules->map(fn ($rule): array => [
                'id' => $rule->id,
                'min_mandays' => $rule->min_mandays,
                'max_mandays' => $rule->max_mandays,
                'base_score' => $rule->base_score,
            ])->values()->all(),
            'pic_level_rules' => $profile->picLevelRules->map(fn ($rule): array => [
                'id' => $rule->id,
                'level_code' => $rule->level_code,
                'level_name' => $rule->level_name,
                'points' => $rule->points,
            ])->values()->all(),
            'project_role_rules' => $profile->projectRoleRules->map(fn ($rule): array => [
                'id' => $rule->id,
                'role_code' => $rule->role_code,
                'role_name' => $rule->role_name,
                'points' => $rule->points,
                'is_support' => $rule->is_support,
            ])->values()->all(),
            'delivery_rules' => $profile->deliveryRules->map(fn ($rule): array => [
                'id' => $rule->id,
                'name' => $rule->name,
                'min_difference_days' => $rule->min_difference_days,
                'max_difference_days' => $rule->max_difference_days,
                'multiplier' => $rule->multiplier,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function blankProfile(): array
    {
        return [
            'id' => null,
            'code' => '',
            'name' => '',
            'description' => '',
            'version' => 1,
            'status' => IncentiveProfileStatus::Draft->value,
            'effective_from' => now()->toDateString(),
            'effective_to' => null,
            'support_percent' => '0.1000',
            'manday_rules' => [
                ['min_mandays' => 1, 'max_mandays' => null, 'base_score' => '10.0000'],
            ],
            'pic_level_rules' => [
                ['level_code' => 'manager', 'level_name' => 'Manager', 'points' => '4.0000'],
            ],
            'project_role_rules' => [
                ['role_code' => 'pm', 'role_name' => 'PM', 'points' => '2.0000', 'is_support' => false],
            ],
            'delivery_rules' => [
                ['name' => 'On Time', 'min_difference_days' => null, 'max_difference_days' => null, 'multiplier' => '1.0000'],
            ],
            'actions' => [
                'can_edit' => true,
                'can_delete' => false,
                'can_activate' => false,
                'can_inactivate' => false,
                'can_archive' => false,
                'can_version' => false,
                'can_calculate' => false,
            ],
        ];
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function statuses(): array
    {
        return collect(IncentiveProfileStatus::cases())
            ->map(fn (IncentiveProfileStatus $status): array => [
                'value' => $status->value,
                'label' => str($status->value)->replace('_', ' ')->headline()->toString(),
            ])
            ->all();
    }

    /**
     * @return array<string, bool>
     */
    private function actions(IncentiveProfile $profile): array
    {
        $usageCount = (int) ($profile->getAttribute('projects_count') ?? 0)
            + (int) ($profile->getAttribute('incentive_calculations_count') ?? 0);
        $user = request()->user();
        $canCalculate = $user instanceof User && $user->can('calculate_project_incentives');

        return [
            'can_edit' => $profile->isEditable(),
            'can_delete' => ! $profile->isActive() && $usageCount === 0,
            'can_activate' => in_array($profile->currentStatus(), [IncentiveProfileStatus::Draft, IncentiveProfileStatus::Inactive], true),
            'can_inactivate' => $profile->isActive(),
            'can_archive' => in_array($profile->currentStatus(), [IncentiveProfileStatus::Draft, IncentiveProfileStatus::Inactive], true),
            'can_version' => $profile->currentStatus() !== IncentiveProfileStatus::Draft,
            'can_calculate' => $profile->currentStatus() === IncentiveProfileStatus::Active && $canCalculate,
        ];
    }

    private function loadProfile(IncentiveProfile $profile): IncentiveProfile
    {
        return $profile->load([
            'mandayRules' => fn ($query) => $query->orderBy('sort_order'),
            'picLevelRules' => fn ($query) => $query->orderBy('level_code'),
            'projectRoleRules' => fn ($query) => $query->orderBy('role_code'),
            'deliveryRules' => fn ($query) => $query->orderBy('sort_order'),
        ])->loadCount(['projects', 'incentiveCalculations', 'mandayRules', 'picLevelRules', 'projectRoleRules', 'deliveryRules']);
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

        if ($value === null) {
            return null;
        }

        return (string) $value;
    }
}
