<?php

namespace App\Services\Excel\ImportHandlers;

use App\Exports\ArraySheetExport;
use App\Exports\UsersExport;
use App\Models\ImportBatch;
use App\Models\User;
use App\Services\Excel\Contracts\ImportPreviewHandler;
use App\Services\Excel\ImportPreviewResult;
use App\Services\Excel\ImportSummary;
use App\Services\Excel\UserExcelService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserImportPreviewHandler implements ImportPreviewHandler
{
    public function __construct(private readonly UserExcelService $service) {}

    public function domain(): string
    {
        return 'users';
    }

    public function title(): string
    {
        return 'Users';
    }

    public function permission(): string
    {
        return 'import_users';
    }

    public function backRouteName(): string
    {
        return 'users.index';
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
        return Excel::download(new ArraySheetExport('Users', $this->service->headings(), $this->service->sampleRows()), 'users-template.xlsx');
    }

    public function export(): BinaryFileResponse
    {
        return Excel::download(new UsersExport, 'users.xlsx');
    }
}
