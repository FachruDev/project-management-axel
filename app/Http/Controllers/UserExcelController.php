<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\UsersExport;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\ExcelImportException;
use App\Services\Excel\UserExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserExcelController extends Controller
{
    public function export(): BinaryFileResponse
    {
        return Excel::download(new UsersExport, 'users.xlsx');
    }

    public function template(UserExcelService $service): BinaryFileResponse
    {
        return Excel::download(new ArraySheetExport('Users', $service->headings()), 'users-template.xlsx');
    }

    public function import(ImportExcelRequest $request, UserExcelService $service): RedirectResponse
    {
        try {
            $summary = $service->import($request->file('file'));
        } catch (ExcelImportException $exception) {
            return back()->with('import_errors', $exception->errors());
        }

        return back()->with('success', "Users imported. Created: {$summary->created}, updated: {$summary->updated}.");
    }
}
