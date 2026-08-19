<?php

namespace App\Http\Middleware;

use App\Enums\ProjectStatus;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectVisibilityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    public function __construct(
        private readonly ProjectVisibilityService $visibility,
    ) {}

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user === null ? null : [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'external_id' => $user->external_id,
                    'is_active' => $user->is_active,
                    'roles' => $user->getRoleNames()->values()->all(),
                    'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
                ],
            ],
            'embed' => [
                'prefix' => $request->headers->get('X-Portal-Embed-Prefix', ''),
            ],
            'project_reminders' => fn (): array => $this->projectReminders($request),
            'flash' => [
                'success' => fn (): mixed => $request->session()->get('success'),
                'excel_error_title' => fn (): mixed => $request->session()->get('excel_error_title'),
                'excel_errors' => fn (): mixed => $request->session()->get('excel_errors'),
                'calculation_summary' => fn (): mixed => $request->session()->get('calculation_summary'),
            ],
        ];
    }

    /**
     * @return array{awaiting_bast: int, ready_to_close: int, actionable_total: int}
     */
    private function projectReminders(Request $request): array
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return [
                'awaiting_bast' => 0,
                'ready_to_close' => 0,
                'actionable_total' => 0,
            ];
        }

        $counts = $this->visibility
            ->visibleProjects(Project::query(), $user)
            ->select('status', DB::raw('count(*) as aggregate'))
            ->whereIn('status', [
                ProjectStatus::AwaitingBast->value,
                ProjectStatus::ReadyToClose->value,
            ])
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $awaitingBast = (int) ($counts[ProjectStatus::AwaitingBast->value] ?? 0);
        $readyToClose = (int) ($counts[ProjectStatus::ReadyToClose->value] ?? 0);

        return [
            'awaiting_bast' => $awaitingBast,
            'ready_to_close' => $readyToClose,
            'actionable_total' => $awaitingBast + $readyToClose,
        ];
    }
}
