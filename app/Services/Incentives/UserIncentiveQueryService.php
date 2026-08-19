<?php

namespace App\Services\Incentives;

use App\Models\Customer;
use App\Models\IncentiveProfile;
use App\Models\Project;
use App\Models\ProjectIncentiveItem;
use App\Models\User;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class UserIncentiveQueryService
{
    /**
     * @return array<string, mixed>
     */
    public function myIncentives(Request $request, User $user): array
    {
        $filters = $this->filters($request, false);
        $query = $this->baseQuery($filters)
            ->where('employee_id', $user->id);

        return [
            'items' => $this->paginate($query),
            'summary' => $this->summary($query),
            'filters' => $filters,
            'options' => [
                'projects' => $this->projectOptions($user),
                'customers' => $this->customerOptions($user),
                'incentive_profiles' => $this->profileOptions($user),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function allIncentives(Request $request): array
    {
        $filters = $this->filters($request, true);
        $query = $this->baseQuery($filters)
            ->when($filters['employee_id'] !== '', fn (Builder $query) => $query->where('employee_id', $filters['employee_id']));

        return [
            'items' => $this->paginate($query),
            'summary' => $this->summary($query),
            'filters' => $filters,
            'options' => [
                'employees' => $this->employeeOptions(),
                'projects' => $this->projectOptions(),
                'customers' => $this->customerOptions(),
                'incentive_profiles' => $this->profileOptions(),
            ],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return Builder<ProjectIncentiveItem>
     */
    private function baseQuery(array $filters): Builder
    {
        return ProjectIncentiveItem::query()
            ->with([
                'employee:id,name,email,external_id',
                'calculation.project.customers:id,name,email,company_name',
                'calculation.project.pm:id,name,email,external_id',
                'calculation.incentiveProfile:id,code,name,version',
            ])
            ->whereHas('calculation', function (Builder $query) use ($filters): void {
                $query
                    ->where('is_current', true)
                    ->whereNotNull('locked_at')
                    ->when($filters['project_id'] !== '', fn (Builder $query) => $query->where('project_id', $filters['project_id']))
                    ->when($filters['incentive_profile_id'] !== '', fn (Builder $query) => $query->where('incentive_profile_id', $filters['incentive_profile_id']))
                    ->when($filters['locked_from'] !== '', fn (Builder $query) => $query->whereDate('locked_at', '>=', $filters['locked_from']))
                    ->when($filters['locked_to'] !== '', fn (Builder $query) => $query->whereDate('locked_at', '<=', $filters['locked_to']))
                    ->when($filters['customer_id'] !== '', fn (Builder $query) => $query->whereHas('project.customers', fn (Builder $query) => $query->whereKey($filters['customer_id'])));
            })
            ->when($filters['search'] !== '', function (Builder $query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function (Builder $query) use ($search): void {
                    $query
                        ->where('employee_name', 'like', "%{$search}%")
                        ->orWhere('project_role', 'like', "%{$search}%")
                        ->orWhere('pic_level', 'like', "%{$search}%")
                        ->orWhereHas('employee', fn (Builder $query) => $query
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('calculation.project', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('calculation.project.customers', fn (Builder $query) => $query
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('company_name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc(
                ProjectIncentiveItem::query()
                    ->select('locked_at')
                    ->from('project_incentive_calculations')
                    ->whereColumn('project_incentive_calculations.id', 'project_incentive_items.calculation_id')
                    ->limit(1),
            )
            ->latest('id');
    }

    /**
     * @param  Builder<ProjectIncentiveItem>  $query
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function paginate(Builder $query): LengthAwarePaginator
    {
        return $query
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ProjectIncentiveItem $item): array => $this->itemPayload($item));
    }

    /**
     * @param  Builder<ProjectIncentiveItem>  $query
     * @return array<string, mixed>
     */
    private function summary(Builder $query): array
    {
        $baseQuery = clone $query;

        return [
            'items_count' => (clone $baseQuery)->count(),
            'employees_count' => (clone $baseQuery)->distinct('employee_id')->count('employee_id'),
            'projects_count' => (clone $baseQuery)
                ->join('project_incentive_calculations', 'project_incentive_calculations.id', '=', 'project_incentive_items.calculation_id')
                ->distinct('project_incentive_calculations.project_id')
                ->count('project_incentive_calculations.project_id'),
            'total_incentive' => (string) ((clone $baseQuery)->sum('final_incentive') ?? 0),
        ];
    }

    /**
     * @return array<int, array{id: int, name: string, email: string, external_id: ?string}>
     */
    private function employeeOptions(): array
    {
        $userIds = $this->baseQuery($this->emptyFilters())
            ->select('employee_id')
            ->whereNotNull('employee_id')
            ->distinct()
            ->pluck('employee_id');

        return User::query()
            ->whereKey($userIds)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'external_id'])
            ->map(fn (User $user): array => $this->userPayload($user))
            ->all();
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function projectOptions(?User $user = null): array
    {
        return Project::query()
            ->whereHas('incentiveCalculations', function (Builder $query) use ($user): void {
                $query
                    ->where('is_current', true)
                    ->whereNotNull('locked_at')
                    ->when($user instanceof User, fn (Builder $query) => $query->whereHas('items', fn (Builder $query) => $query->where('employee_id', $user->id)));
            })
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
            ])
            ->all();
    }

    /**
     * @return array<int, array{id: int, name: string, company_name: ?string}>
     */
    private function customerOptions(?User $user = null): array
    {
        return Customer::query()
            ->whereHas('projects.incentiveCalculations', function (Builder $query) use ($user): void {
                $query
                    ->where('is_current', true)
                    ->whereNotNull('locked_at')
                    ->when($user instanceof User, fn (Builder $query) => $query->whereHas('items', fn (Builder $query) => $query->where('employee_id', $user->id)));
            })
            ->orderBy('name')
            ->get(['id', 'name', 'company_name'])
            ->map(fn (Customer $customer): array => [
                'id' => $customer->id,
                'name' => $customer->name,
                'company_name' => $customer->company_name,
            ])
            ->all();
    }

    /**
     * @return array<int, array{id: int, code: string, name: string, version: int}>
     */
    private function profileOptions(?User $user = null): array
    {
        return IncentiveProfile::query()
            ->whereHas('incentiveCalculations', function (Builder $query) use ($user): void {
                $query
                    ->where('is_current', true)
                    ->whereNotNull('locked_at')
                    ->when($user instanceof User, fn (Builder $query) => $query->whereHas('items', fn (Builder $query) => $query->where('employee_id', $user->id)));
            })
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
     * @return array<string, mixed>
     */
    private function itemPayload(ProjectIncentiveItem $item): array
    {
        $calculation = $item->calculation;
        $project = $calculation?->project;

        return [
            'id' => $item->id,
            'employee' => $item->employee ? $this->userPayload($item->employee) : [
                'id' => $item->employee_id,
                'name' => $item->employee_name,
                'email' => '',
                'external_id' => null,
            ],
            'employee_name' => $item->employee_name,
            'project_role' => $item->project_role,
            'pic_level' => $item->pic_level,
            'is_support' => $item->is_support,
            'base_incentive' => $item->base_incentive,
            'delivery_multiplier' => $item->delivery_multiplier,
            'final_incentive' => $item->final_incentive,
            'calculation' => [
                'id' => $calculation?->id,
                'calculated_at' => $this->dateTimeString($calculation?->calculated_at),
                'locked_at' => $this->dateTimeString($calculation?->locked_at),
                'delivery_status' => $this->deliveryStatusValue($calculation?->delivery_status),
                'total_incentive' => $calculation?->total_incentive,
            ],
            'project' => [
                'id' => $project?->id,
                'name' => $project?->name,
                'project_date' => $this->dateString($project?->project_date),
                'customers' => $project?->customers
                    ->map(fn (Customer $customer): array => [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'company_name' => $customer->company_name,
                    ])
                    ->values()
                    ->all() ?? [],
                'pm' => $project?->pm ? $this->userPayload($project->pm) : null,
            ],
            'incentive_profile' => $calculation?->incentiveProfile ? [
                'id' => $calculation->incentiveProfile->id,
                'code' => $calculation->incentiveProfile->code,
                'name' => $calculation->incentiveProfile->name,
                'version' => $calculation->incentiveProfile->version,
            ] : null,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function filters(Request $request, bool $withEmployee): array
    {
        return [
            'search' => $request->string('search')->trim()->toString(),
            'employee_id' => $withEmployee ? $request->string('employee_id')->trim()->toString() : '',
            'project_id' => $request->string('project_id')->trim()->toString(),
            'customer_id' => $request->string('customer_id')->trim()->toString(),
            'incentive_profile_id' => $request->string('incentive_profile_id')->trim()->toString(),
            'locked_from' => $request->string('locked_from')->trim()->toString(),
            'locked_to' => $request->string('locked_to')->trim()->toString(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function emptyFilters(): array
    {
        return [
            'search' => '',
            'employee_id' => '',
            'project_id' => '',
            'customer_id' => '',
            'incentive_profile_id' => '',
            'locked_from' => '',
            'locked_to' => '',
        ];
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
