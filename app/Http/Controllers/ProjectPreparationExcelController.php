<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\ProjectPreparationWorkbookExport;
use App\Http\Controllers\Concerns\HandlesExcelTransfers;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\ProjectPreparationExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectPreparationExcelController extends Controller
{
    use HandlesExcelTransfers;

    public function export(): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel('Project preparation export failed', fn (): BinaryFileResponse => Excel::download(new ProjectPreparationWorkbookExport, 'project-preparations.xlsx'));
    }

    public function template(ProjectPreparationExcelService $service): BinaryFileResponse|RedirectResponse
    {
        [$projects, $customers, $members, $accessRules, $tasks] = $service->headings();
        [$projectRows, $customerRows, $memberRows, $accessRuleRows, $taskRows] = $service->sampleSheets();

        return $this->downloadExcel(
            'Project preparation template download failed',
            fn (): BinaryFileResponse => Excel::download(new class($projects, $customers, $members, $accessRules, $tasks, $projectRows, $customerRows, $memberRows, $accessRuleRows, $taskRows) implements WithMultipleSheets
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
            }, 'project-preparations-template.xlsx'),
        );
    }

    public function import(ImportExcelRequest $request, ProjectPreparationExcelService $service): RedirectResponse
    {
        return $this->importExcel('Project preparation import failed', fn () => $service->import($request->file('file'), $request->user()), 'Project preparations');
    }
}
