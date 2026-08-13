<?php

namespace App\Services\Excel\ImportHandlers;

use App\Exports\ArraySheetExport;
use App\Exports\CustomersExport;
use App\Models\ImportBatch;
use App\Models\User;
use App\Services\Excel\Contracts\ImportPreviewHandler;
use App\Services\Excel\CustomerExcelService;
use App\Services\Excel\ImportPreviewResult;
use App\Services\Excel\ImportSummary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CustomerImportPreviewHandler implements ImportPreviewHandler
{
    public function __construct(private readonly CustomerExcelService $service) {}

    public function domain(): string
    {
        return 'customers';
    }

    public function title(): string
    {
        return 'Customers';
    }

    public function permission(): string
    {
        return 'import_customers';
    }

    public function backRouteName(): string
    {
        return 'customers.index';
    }

    public function preview(UploadedFile|string $file): ImportPreviewResult
    {
        return $this->service->preview($file);
    }

    public function commit(ImportBatch $batch, User $actor): ImportSummary
    {
        return $this->service->import(Storage::disk($batch->disk)->path($batch->file_path));
    }

    public function template(): BinaryFileResponse
    {
        return Excel::download(new ArraySheetExport('Customers', $this->service->headings(), $this->service->sampleRows()), 'customers-template.xlsx');
    }

    public function export(): BinaryFileResponse
    {
        return Excel::download(new CustomersExport, 'customers.xlsx');
    }
}
