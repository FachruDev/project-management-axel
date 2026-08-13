<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\CustomersExport;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\CustomerExcelService;
use App\Services\Excel\ExcelImportException;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CustomerExcelController extends Controller
{
    public function export(): BinaryFileResponse
    {
        return Excel::download(new CustomersExport, 'customers.xlsx');
    }

    public function template(CustomerExcelService $service): BinaryFileResponse
    {
        return Excel::download(new ArraySheetExport('Customers', $service->headings()), 'customers-template.xlsx');
    }

    public function import(ImportExcelRequest $request, CustomerExcelService $service): RedirectResponse
    {
        try {
            $summary = $service->import($request->file('file'));
        } catch (ExcelImportException $exception) {
            return back()->with('import_errors', $exception->errors());
        }

        return back()->with('success', "Customers imported. Created: {$summary->created}, updated: {$summary->updated}.");
    }
}
