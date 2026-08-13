<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\ProjectPreparationWorkbookExport;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\ExcelImportException;
use App\Services\Excel\ProjectPreparationExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectPreparationExcelController extends Controller
{
    public function export(): BinaryFileResponse
    {
        return Excel::download(new ProjectPreparationWorkbookExport, 'project-preparations.xlsx');
    }

    public function template(ProjectPreparationExcelService $service): BinaryFileResponse
    {
        [$projects, $customers, $members, $accessRules, $tasks] = $service->headings();

        return Excel::download(new class($projects, $customers, $members, $accessRules, $tasks) implements WithMultipleSheets
        {
            /**
             * @param  array<int, string>  $projects
             * @param  array<int, string>  $customers
             * @param  array<int, string>  $members
             * @param  array<int, string>  $accessRules
             * @param  array<int, string>  $tasks
             */
            public function __construct(
                private readonly array $projects,
                private readonly array $customers,
                private readonly array $members,
                private readonly array $accessRules,
                private readonly array $tasks,
            ) {}

            public function sheets(): array
            {
                return [
                    new ArraySheetExport('Projects', $this->projects),
                    new ArraySheetExport('Project Customers', $this->customers),
                    new ArraySheetExport('Members', $this->members),
                    new ArraySheetExport('Access Rules', $this->accessRules),
                    new ArraySheetExport('Tasks', $this->tasks),
                ];
            }
        }, 'project-preparations-template.xlsx');
    }

    public function import(ImportExcelRequest $request, ProjectPreparationExcelService $service): RedirectResponse
    {
        try {
            $summary = $service->import($request->file('file'), $request->user());
        } catch (ExcelImportException $exception) {
            return back()->with('import_errors', $exception->errors());
        }

        return back()->with('success', "Project preparations imported. Created: {$summary->created}, updated: {$summary->updated}.");
    }
}
