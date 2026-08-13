<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\HolidaysExport;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\ExcelImportException;
use App\Services\Excel\HolidayExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HolidayExcelController extends Controller
{
    public function export(): BinaryFileResponse
    {
        return Excel::download(new HolidaysExport, 'holidays.xlsx');
    }

    public function template(HolidayExcelService $service): BinaryFileResponse
    {
        return Excel::download(new ArraySheetExport('Holidays', $service->headings()), 'holidays-template.xlsx');
    }

    public function import(ImportExcelRequest $request, HolidayExcelService $service): RedirectResponse
    {
        try {
            $summary = $service->import($request->file('file'));
        } catch (ExcelImportException $exception) {
            return back()->with('import_errors', $exception->errors());
        }

        return back()->with('success', "Holidays imported. Created: {$summary->created}, updated: {$summary->updated}.");
    }
}
