<?php

namespace App\Services\Excel\Contracts;

use App\Models\ImportBatch;
use App\Models\User;
use App\Services\Excel\ImportPreviewResult;
use App\Services\Excel\ImportSummary;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

interface ImportPreviewHandler
{
    public function domain(): string;

    public function title(): string;

    public function permission(): string;

    public function backRouteName(): string;

    public function preview(UploadedFile|string $file): ImportPreviewResult;

    public function commit(ImportBatch $batch, User $actor): ImportSummary;

    public function template(): BinaryFileResponse;

    public function export(): BinaryFileResponse;
}
