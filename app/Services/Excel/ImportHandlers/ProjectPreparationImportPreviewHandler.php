<?php

namespace App\Services\Excel\ImportHandlers;

use App\Exports\ArraySheetExport;
use App\Exports\ProjectPreparationWorkbookExport;
use App\Models\ImportBatch;
use App\Models\User;
use App\Services\Excel\Contracts\ImportPreviewHandler;
use App\Services\Excel\ImportPreviewResult;
use App\Services\Excel\ImportSummary;
use App\Services\Excel\ProjectPreparationExcelService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectPreparationImportPreviewHandler implements ImportPreviewHandler
{
    public function __construct(private readonly ProjectPreparationExcelService $service) {}

    public function domain(): string
    {
        return 'project-preparations';
    }

    public function title(): string
    {
        return 'Project Preparations';
    }

    public function permission(): string
    {
        return 'import_project_preparations';
    }

    public function backRouteName(): string
    {
        return 'project-preparations.index';
    }

    public function preview(UploadedFile|string $file): ImportPreviewResult
    {
        return $this->service->preview($file);
    }

    public function commit(ImportBatch $batch, User $actor): ImportSummary
    {
        return $this->service->import(Storage::disk($batch->disk)->path($batch->file_path), $actor);
    }

    public function template(): BinaryFileResponse
    {
        [$projects, $customers, $members, $accessRules, $tasks] = $this->service->headings();
        [$projectRows, $customerRows, $memberRows, $accessRuleRows, $taskRows] = $this->service->sampleSheets();

        return Excel::download(new class($projects, $customers, $members, $accessRules, $tasks, $projectRows, $customerRows, $memberRows, $accessRuleRows, $taskRows) implements WithMultipleSheets
        {
            /**
             * @param  array<int, string>  $projects
             * @param  array<int, string>  $customers
             * @param  array<int, string>  $members
             * @param  array<int, string>  $accessRules
             * @param  array<int, string>  $tasks
             * @param  array<int, array<int, mixed>>  $projectRows
             * @param  array<int, array<int, mixed>>  $customerRows
             * @param  array<int, array<int, mixed>>  $memberRows
             * @param  array<int, array<int, mixed>>  $accessRuleRows
             * @param  array<int, array<int, mixed>>  $taskRows
             */
            public function __construct(
                private readonly array $projects,
                private readonly array $customers,
                private readonly array $members,
                private readonly array $accessRules,
                private readonly array $tasks,
                private readonly array $projectRows,
                private readonly array $customerRows,
                private readonly array $memberRows,
                private readonly array $accessRuleRows,
                private readonly array $taskRows,
            ) {}

            public function sheets(): array
            {
                return [
                    new ArraySheetExport('Projects', $this->projects, $this->projectRows),
                    new ArraySheetExport('Project Customers', $this->customers, $this->customerRows),
                    new ArraySheetExport('Members', $this->members, $this->memberRows),
                    new ArraySheetExport('Access Rules', $this->accessRules, $this->accessRuleRows),
                    new ArraySheetExport('Tasks', $this->tasks, $this->taskRows),
                ];
            }
        }, 'project-preparations-template.xlsx');
    }

    public function export(): BinaryFileResponse
    {
        return Excel::download(new ProjectPreparationWorkbookExport, 'project-preparations.xlsx');
    }
}
