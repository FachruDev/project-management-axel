<?php

namespace App\Services\Quotations;

use App\Enums\ProjectQuotationType;
use App\Models\Project;
use App\Models\ProjectQuotation;
use App\Models\User;
use App\Services\Projects\ProjectVisibilityService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectQuotationService
{
    public function __construct(
        private readonly ProjectQuotationNumberService $numbers,
        private readonly ProjectQuotationCalculator $calculator,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): ProjectQuotation
    {
        return DB::transaction(function () use ($data, $actor): ProjectQuotation {
            $project = $this->approvedVisibleProject((int) $data['project_id'], $actor);
            $type = ProjectQuotationType::from((string) $data['quotation_type']);
            $quotationDate = CarbonImmutable::parse((string) $data['quotation_date']);
            $calculation = $this->calculator->calculate(
                $type,
                $data['items'],
                (float) ($data['ppn_pph_percent'] ?? 0),
            );

            $quotation = ProjectQuotation::query()->create([
                ...$this->headerData($data, $type, $calculation),
                'project_id' => $project->id,
                'quotation_no' => $this->numbers->generate($type, $quotationDate),
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);

            $quotation->items()->createMany($calculation['items']);

            return $quotation->load(['project.customers', 'items', 'creator', 'updater']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ProjectQuotation $quotation, array $data, User $actor): ProjectQuotation
    {
        return DB::transaction(function () use ($quotation, $data, $actor): ProjectQuotation {
            $quotation = ProjectQuotation::query()->whereKey($quotation->id)->lockForUpdate()->firstOrFail();
            $project = $this->approvedVisibleProject((int) $data['project_id'], $actor);
            $type = ProjectQuotationType::from((string) $data['quotation_type']);
            $calculation = $this->calculator->calculate(
                $type,
                $data['items'],
                (float) ($data['ppn_pph_percent'] ?? 0),
            );

            $quotation->update([
                ...$this->headerData($data, $type, $calculation),
                'project_id' => $project->id,
                'updated_by' => $actor->id,
            ]);

            $quotation->items()->delete();
            $quotation->items()->createMany($calculation['items']);

            return $quotation->load(['project.customers', 'items', 'creator', 'updater']);
        });
    }

    public function defaultDescription(ProjectQuotationType $type, CarbonImmutable $quotationDate): string
    {
        return match ($type) {
            ProjectQuotationType::Project => 'Project Development for '.$quotationDate->format('F Y'),
            ProjectQuotationType::Maintenance => 'Maintenance for '.$quotationDate->format('F Y'),
        };
    }

    private function approvedVisibleProject(int $projectId, User $actor): Project
    {
        if (! $this->visibility->visibleProjects(Project::query()->whereKey($projectId), $actor)->exists()) {
            throw ValidationException::withMessages([
                'project_id' => ['The selected project is not available.'],
            ]);
        }

        $project = Project::query()
            ->with(['customers'])
            ->whereKey($projectId)
            ->lockForUpdate()
            ->firstOrFail();

        if ($project->approved_at === null) {
            throw ValidationException::withMessages([
                'project_id' => ['Quotation can only be created for approved projects.'],
            ]);
        }

        return $project;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array{items: array<int, array<string, mixed>>, subtotal: float, tax: float, grand_total: float}  $calculation
     * @return array<string, mixed>
     */
    private function headerData(array $data, ProjectQuotationType $type, array $calculation): array
    {
        $quotationDate = CarbonImmutable::parse((string) $data['quotation_date']);
        $description = trim((string) ($data['description'] ?? ''));

        return [
            'quotation_type' => $type->value,
            'quotation_date' => $quotationDate->toDateString(),
            'customer_name' => $data['customer_name'],
            'customer_address' => $data['customer_address'] ?? null,
            'customer_identifier' => $data['customer_identifier'] ?? null,
            'cc' => $data['cc'] ?? null,
            'description' => $description !== '' ? $description : $this->defaultDescription($type, $quotationDate),
            'term_of_payment_date' => $data['term_of_payment_date'] ?? null,
            'valid_until_date' => $data['valid_until_date'] ?? null,
            'note' => $data['note'] ?? null,
            'prepared_by_name' => $data['prepared_by_name'] ?? null,
            'approved_by_name' => $data['approved_by_name'] ?? null,
            'ppn_pph_percent' => $data['ppn_pph_percent'] ?? 0,
            'subtotal' => $calculation['subtotal'],
            'grand_total' => $calculation['grand_total'],
            'qr_target_url' => $data['qr_target_url'] ?? null,
            'status' => $data['status'],
        ];
    }
}
