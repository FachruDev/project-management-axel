<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\CustomersExport;
use App\Http\Controllers\Concerns\HandlesExcelTransfers;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\CustomerExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CustomerExcelController extends Controller
{
    use HandlesExcelTransfers;

    public function export(): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel('Customer export failed', fn (): BinaryFileResponse => Excel::download(new CustomersExport, 'customers.xlsx'));
    }

    public function template(CustomerExcelService $service): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel(
            'Customer template download failed',
            fn (): BinaryFileResponse => Excel::download(new ArraySheetExport('Customers', $service->headings(), $service->sampleRows()), 'customers-template.xlsx'),
        );
    }

    public function import(ImportExcelRequest $request, CustomerExcelService $service): RedirectResponse
    {
        return $this->importExcel('Customer import failed', fn () => $service->import($request->file('file')), 'Customers');
    }
}
