<?php

namespace App\Services\Excel\ImportHandlers;

use App\Exports\ArraySheetExport;
use App\Exports\HolidaysExport;
use App\Models\ImportBatch;
use App\Models\User;
use App\Services\Excel\Contracts\ImportPreviewHandler;
use App\Services\Excel\HolidayExcelService;
use App\Services\Excel\ImportPreviewResult;
use App\Services\Excel\ImportSummary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HolidayImportPreviewHandler implements ImportPreviewHandler
{
    public function __construct(private readonly HolidayExcelService $service) {}

    public function domain(): string
    {
        return 'holidays';
    }

    public function title(): string
    {
        return 'Holidays';
    }

    public function permission(): string
    {
        return 'import_holidays';
    }

    public function backRouteName(): string
    {
        return 'holidays.index';
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
        return Excel::download(new ArraySheetExport('Holidays', $this->service->headings(), $this->service->sampleRows()), 'holidays-template.xlsx');
    }

    public function export(): BinaryFileResponse
    {
        return Excel::download(new HolidaysExport, 'holidays.xlsx');
    }
}
