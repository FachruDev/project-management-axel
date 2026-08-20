<?php

namespace App\Http\Controllers;

use App\Enums\ProjectQuotationStatus;
use App\Enums\ProjectQuotationType;
use App\Http\Requests\StoreProjectQuotationRequest;
use App\Http\Requests\UpdateProjectQuotationRequest;
use App\Models\Project;
use App\Models\ProjectQuotation;
use App\Models\User;
use App\Services\Projects\ProjectVisibilityService;
use App\Services\Quotations\ProjectQuotationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectQuotationController extends Controller
{
    public function __construct(
        private readonly ProjectQuotationService $quotations,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function index(Request $request): Response
    {
        $user = $this->user($request);
        $filters = [
            'search' => trim((string) $request->query('search', '')),
            'status' => (string) $request->query('status', ''),
            'type' => (string) $request->query('type', ''),
            'project_id' => (string) $request->query('project_id', ''),
            'customer' => trim((string) $request->query('customer', '')),
        ];

        $query = ProjectQuotation::query()
            ->with(['project.customers', 'updater'])
            ->whereHas('project', fn (Builder $query) => $this->visibility->visibleProjects($query, $user));

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->where('quotation_no', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('project', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
            });
        }

        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($filters['type'] !== '') {
            $query->where('quotation_type', $filters['type']);
        }

        if ($filters['project_id'] !== '') {
            $query->where('project_id', $filters['project_id']);
        }

        if ($filters['customer'] !== '') {
            $query->where('customer_name', 'like', "%{$filters['customer']}%");
        }

        return Inertia::render('project-quotations/index', [
            'quotations' => $query
                ->latest('quotation_date')
                ->latest('id')
                ->paginate(10)
                ->withQueryString()
                ->through(fn (ProjectQuotation $quotation) => $this->summary($quotation)),
            'filters' => $filters,
            'options' => [
                'projects' => $this->projectOptions($user),
                'types' => $this->typeOptions(),
                'statuses' => $this->statusOptions(),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $this->user($request);
        $today = now()->toDateString();

        return Inertia::render('project-quotations/form', [
            'mode' => 'create',
            'quotation' => [
                'id' => null,
                'quotation_no' => null,
                'project_id' => '',
                'quotation_type' => ProjectQuotationType::Project->value,
                'quotation_date' => $today,
                'customer_name' => '',
                'customer_address' => '',
                'customer_identifier' => '',
                'cc' => '',
                'description' => '',
                'term_of_payment_date' => $today,
                'valid_until_date' => now()->addMonth()->toDateString(),
                'note' => '',
                'prepared_by_name' => $user->name,
                'approved_by_name' => '',
                'ppn_pph_percent' => '0.0000',
                'qr_target_url' => 'https://www.axeltekno.com',
                'status' => ProjectQuotationStatus::Quotation->value,
                'items' => [$this->emptyItem()],
            ],
            'options' => $this->formOptions($user),
        ]);
    }

    public function store(StoreProjectQuotationRequest $request): RedirectResponse
    {
        $quotation = $this->quotations->create($request->validated(), $this->user($request));

        return redirect()
            ->route('project-quotations.edit', $quotation)
            ->with('success', 'Project quotation created.');
    }

    public function edit(Request $request, ProjectQuotation $projectQuotation): Response
    {
        $user = $this->user($request);
        $this->ensureVisibleQuotation($projectQuotation, $user);
        $projectQuotation->load(['project.customers', 'items']);

        return Inertia::render('project-quotations/form', [
            'mode' => 'edit',
            'quotation' => $this->formPayload($projectQuotation),
            'options' => $this->formOptions($user),
        ]);
    }

    public function update(UpdateProjectQuotationRequest $request, ProjectQuotation $projectQuotation): RedirectResponse
    {
        $user = $this->user($request);
        $this->ensureVisibleQuotation($projectQuotation, $user);

        $quotation = $this->quotations->update($projectQuotation, $request->validated(), $user);

        return redirect()
            ->route('project-quotations.edit', $quotation)
            ->with('success', 'Project quotation updated.');
    }

    public function print(Request $request, ProjectQuotation $projectQuotation): Response
    {
        $user = $this->user($request);
        $this->ensureVisibleQuotation($projectQuotation, $user);
        $projectQuotation->load(['project.customers', 'items', 'creator', 'updater']);

        return Inertia::render('project-quotations/print', [
            'quotation' => $this->detail($projectQuotation),
        ]);
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    private function ensureVisibleQuotation(ProjectQuotation $quotation, User $user): void
    {
        $isVisible = ProjectQuotation::query()
            ->whereKey($quotation->id)
            ->whereHas('project', fn (Builder $query) => $this->visibility->visibleProjects($query, $user))
            ->exists();

        abort_unless($isVisible, 403);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function projectOptions(User $user): array
    {
        return $this->visibility->visibleProjects(Project::query(), $user)
            ->with(['customers'])
            ->whereNotNull('approved_at')
            ->latest('approved_at')
            ->orderBy('name')
            ->get()
            ->map(function (Project $project): array {
                $primaryCustomer = $project->customers->firstWhere('pivot.is_primary', true)
                    ?? $project->customers->first();

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'project_date' => $this->date($project->project_date),
                    'customer_name' => $primaryCustomer?->name,
                    'customer_address' => $primaryCustomer?->company_address,
                    'customer_identifier' => $primaryCustomer?->company_name,
                    'customers' => $project->customers->map(fn ($customer) => [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'email' => $customer->email,
                        'company_name' => $customer->company_name,
                        'company_address' => $customer->company_address,
                        'is_primary' => (bool) $customer->pivot->is_primary,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(User $user): array
    {
        return [
            'projects' => $this->projectOptions($user),
            'types' => $this->typeOptions(),
            'statuses' => $this->statusOptions(),
            'units' => [
                ['value' => 'mandays', 'label' => 'Mandays'],
                ['value' => 'lot', 'label' => 'Lot'],
                ['value' => 'unit', 'label' => 'Unit'],
                ['value' => 'month', 'label' => 'Month'],
                ['value' => 'pcs', 'label' => 'Pcs'],
            ],
        ];
    }

    /**
     * @return array<int, array{value: string, label: string, category: string}>
     */
    private function typeOptions(): array
    {
        return collect(ProjectQuotationType::cases())
            ->map(fn (ProjectQuotationType $type): array => [
                'value' => $type->value,
                'label' => $type->label(),
                'category' => $type->category(),
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return collect(ProjectQuotationStatus::cases())
            ->map(fn (ProjectQuotationStatus $status): array => [
                'value' => $status->value,
                'label' => $status->label(),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(ProjectQuotation $quotation): array
    {
        return [
            'id' => $quotation->id,
            'quotation_no' => $quotation->quotation_no,
            'quotation_type' => $quotation->quotation_type->value,
            'quotation_type_label' => $quotation->quotation_type->label(),
            'quotation_date' => $this->date($quotation->quotation_date),
            'customer_name' => $quotation->customer_name,
            'status' => $quotation->status->value,
            'status_label' => $quotation->status->label(),
            'subtotal' => $quotation->subtotal,
            'grand_total' => $quotation->grand_total,
            'updated_at' => $this->dateTime($quotation->updated_at),
            'updated_by' => $quotation->updater ? [
                'id' => $quotation->updater->id,
                'name' => $quotation->updater->name,
                'email' => $quotation->updater->email,
                'external_id' => $quotation->updater->external_id,
            ] : null,
            'project' => $quotation->project ? [
                'id' => $quotation->project->id,
                'name' => $quotation->project->name,
                'customers' => $quotation->project->customers->map(fn ($customer) => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'company_name' => $customer->company_name,
                ])->values()->all(),
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formPayload(ProjectQuotation $quotation): array
    {
        return [
            'id' => $quotation->id,
            'quotation_no' => $quotation->quotation_no,
            'project_id' => (string) $quotation->project_id,
            'quotation_type' => $quotation->quotation_type->value,
            'quotation_date' => $this->date($quotation->quotation_date),
            'customer_name' => $quotation->customer_name,
            'customer_address' => $quotation->customer_address ?? '',
            'customer_identifier' => $quotation->customer_identifier ?? '',
            'cc' => $quotation->cc ?? '',
            'description' => $quotation->description ?? '',
            'term_of_payment_date' => $this->date($quotation->term_of_payment_date),
            'valid_until_date' => $this->date($quotation->valid_until_date),
            'note' => $quotation->note ?? '',
            'prepared_by_name' => $quotation->prepared_by_name ?? '',
            'approved_by_name' => $quotation->approved_by_name ?? '',
            'ppn_pph_percent' => $quotation->ppn_pph_percent,
            'qr_target_url' => $quotation->qr_target_url ?? '',
            'status' => $quotation->status->value,
            'items' => $quotation->items->map(fn ($item): array => [
                'unit' => $item->unit,
                'description' => $item->description,
                'qty' => $item->qty,
                'unit_price' => $item->unit_price,
                'discount' => $item->discount_percent,
                'amount' => $item->amount,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(ProjectQuotation $quotation): array
    {
        $summary = $this->summary($quotation);
        $taxAmount = (float) $quotation->grand_total - (float) $quotation->subtotal;

        return [
            ...$summary,
            'customer_address' => $quotation->customer_address,
            'customer_identifier' => $quotation->customer_identifier,
            'cc' => $quotation->cc,
            'description' => $quotation->description,
            'term_of_payment_date' => $this->date($quotation->term_of_payment_date),
            'valid_until_date' => $this->date($quotation->valid_until_date),
            'note' => $quotation->note,
            'prepared_by_name' => $quotation->prepared_by_name,
            'approved_by_name' => $quotation->approved_by_name,
            'ppn_pph_percent' => $quotation->ppn_pph_percent,
            'tax_amount' => round($taxAmount, 2),
            'qr_target_url' => $quotation->qr_target_url,
            'qr_code_url' => $quotation->qr_target_url
                ? 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data='.urlencode($quotation->qr_target_url)
                : null,
            'items' => $quotation->items->map(fn ($item): array => [
                'id' => $item->id,
                'sort_order' => $item->sort_order,
                'category' => $item->category,
                'unit' => $item->unit,
                'description' => $item->description,
                'qty' => $item->qty,
                'unit_price' => $item->unit_price,
                'discount_percent' => $item->discount_percent,
                'amount' => $item->amount,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function emptyItem(): array
    {
        return [
            'unit' => 'mandays',
            'description' => '',
            'qty' => '',
            'unit_price' => '',
            'discount' => '0',
            'amount' => '',
        ];
    }

    private function date(mixed $date): ?string
    {
        return $date ? $date->format('Y-m-d') : null;
    }

    private function dateTime(mixed $date): ?string
    {
        return $date ? $date->format('Y-m-d H:i') : null;
    }
}
