<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\HolidaysExport;
use App\Http\Controllers\Concerns\HandlesExcelTransfers;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\HolidayExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HolidayExcelController extends Controller
{
    use HandlesExcelTransfers;

    public function export(): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel('Holiday export failed', fn (): BinaryFileResponse => Excel::download(new HolidaysExport, 'holidays.xlsx'));
    }

    public function template(HolidayExcelService $service): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel(
            'Holiday template download failed',
            fn (): BinaryFileResponse => Excel::download(new ArraySheetExport('Holidays', $service->headings(), $service->sampleRows()), 'holidays-template.xlsx'),
        );
    }

    public function import(ImportExcelRequest $request, HolidayExcelService $service): RedirectResponse
    {
        return $this->importExcel('Holiday import failed', fn () => $service->import($request->file('file')), 'Holidays');
    }
}
