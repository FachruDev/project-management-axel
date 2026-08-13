<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportExcelRequest;
use App\Models\ImportBatch;
use App\Services\Excel\Contracts\ImportPreviewHandler;
use App\Services\Excel\ExcelImportException;
use App\Services\Excel\ImportPreviewRegistry;
use App\Services\Excel\ImportPreviewResult;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class ImportPreviewController extends Controller
{
    public function __construct(private readonly ImportPreviewRegistry $registry) {}

    public function create(Request $request, string $domain): Response
    {
        $handler = $this->handler($domain);
        $this->authorizeImport($request, $handler->permission());

        return Inertia::render('imports/create', [
            'domain' => $handler->domain(),
            'title' => $handler->title(),
            'preview_url' => route('imports.preview', $handler->domain()),
            'template_url' => route('import-templates.'.$handler->domain()),
            'guide_url' => $handler->domain() === 'project-preparations'
                ? route('import-guides.project-preparations')
                : null,
            'back_url' => route($handler->backRouteName()),
        ]);
    }

    public function preview(ImportExcelRequest $request, string $domain): RedirectResponse
    {
        $handler = $this->handler($domain);
        $this->authorizeImport($request, $handler->permission());

        $file = $request->file('file');
        $disk = 'local';
        $path = $file->storeAs(
            'import-previews/'.$handler->domain(),
            Str::uuid()->toString().'.'.$file->getClientOriginalExtension(),
            $disk,
        );

        try {
            $result = $handler->preview(Storage::disk($disk)->path($path));
        } catch (ExcelImportException $exception) {
            $result = new ImportPreviewResult([], $exception->errors(), [
                'total' => 0,
                'valid' => 0,
                'errors' => count($exception->errors()),
                'creates' => 0,
                'updates' => 0,
                'skips' => 0,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            $result = new ImportPreviewResult([], [
                'The Excel file could not be previewed. No records were saved.',
                'Technical detail: '.$exception->getMessage(),
            ], [
                'total' => 0,
                'valid' => 0,
                'errors' => 1,
                'creates' => 0,
                'updates' => 0,
                'skips' => 0,
            ]);
        }

        $batch = ImportBatch::create([
            'domain' => $handler->domain(),
            'status' => 'preview',
            'original_filename' => $file->getClientOriginalName(),
            'disk' => $disk,
            'file_path' => $path,
            'preview_payload' => $result->payload(),
            'error_payload' => $result->errors,
            'summary' => $result->summary,
            'created_by' => $request->user()->id,
            'expires_at' => now()->addDay(),
        ]);

        return redirect()->route('imports.show', [$handler->domain(), $batch]);
    }

    public function show(Request $request, string $domain, ImportBatch $importBatch): Response
    {
        $handler = $this->handler($domain);
        $this->authorizeImport($request, $handler->permission());
        $this->ensureBatch($handler->domain(), $importBatch);

        return Inertia::render('imports/show', [
            'domain' => $handler->domain(),
            'title' => $handler->title(),
            'batch' => [
                'uuid' => $importBatch->uuid,
                'status' => $importBatch->status,
                'original_filename' => $importBatch->original_filename,
                'summary' => $importBatch->summary ?? [],
                'preview_payload' => $importBatch->preview_payload ?? ['kind' => 'table', 'sheets' => []],
                'error_payload' => $importBatch->error_payload ?? [],
                'created_at' => $importBatch->created_at?->toDateTimeString(),
                'confirmed_at' => $importBatch->confirmed_at?->toDateTimeString(),
                'expires_at' => $importBatch->expires_at?->toDateTimeString(),
            ],
            'confirm_url' => route('imports.confirm', [$handler->domain(), $importBatch]),
            'upload_url' => route('imports.create', $handler->domain()),
            'back_url' => route($handler->backRouteName()),
        ]);
    }

    public function confirm(Request $request, string $domain, ImportBatch $importBatch): RedirectResponse
    {
        $handler = $this->handler($domain);
        $this->authorizeImport($request, $handler->permission());
        $this->ensureBatch($handler->domain(), $importBatch);

        if ($importBatch->status !== 'preview') {
            return back()->with('excel_error_title', 'Import cannot be confirmed')->with('excel_errors', [
                'This import batch is no longer waiting for confirmation.',
            ]);
        }

        $path = Storage::disk($importBatch->disk)->path($importBatch->file_path);

        try {
            $result = $handler->preview($path);
        } catch (ExcelImportException $exception) {
            $importBatch->update([
                'status' => 'preview',
                'error_payload' => $exception->errors(),
                'summary' => [
                    ...($importBatch->summary ?? []),
                    'errors' => count($exception->errors()),
                ],
            ]);

            return redirect()
                ->route('imports.show', [$handler->domain(), $importBatch])
                ->with('excel_error_title', 'Import confirmation blocked')
                ->with('excel_errors', $exception->errors());
        } catch (Throwable $exception) {
            report($exception);

            $importBatch->update([
                'status' => 'failed',
                'error_payload' => ['Technical detail: '.$exception->getMessage()],
            ]);

            return redirect()
                ->route('imports.show', [$handler->domain(), $importBatch])
                ->with('excel_error_title', 'Import failed')
                ->with('excel_errors', [
                    'The import could not be revalidated. No records were saved.',
                    'Technical detail: '.$exception->getMessage(),
                ]);
        }

        if ($result->hasErrors()) {
            $importBatch->update([
                'preview_payload' => $result->payload(),
                'error_payload' => $result->errors,
                'summary' => $result->summary,
            ]);

            return redirect()
                ->route('imports.show', [$handler->domain(), $importBatch])
                ->with('excel_error_title', 'Import confirmation blocked')
                ->with('excel_errors', [
                    'The file was revalidated and still has errors. No records were saved.',
                    ...$result->errors,
                ]);
        }

        try {
            $summary = $handler->commit($importBatch, $request->user());
        } catch (ExcelImportException $exception) {
            $result = new ImportPreviewResult($importBatch->preview_payload['sheets'] ?? [], $exception->errors(), [
                ...($importBatch->summary ?? []),
                'errors' => count($exception->errors()),
            ]);

            $importBatch->update([
                'status' => 'preview',
                'error_payload' => $result->errors,
                'summary' => $result->summary,
            ]);

            return redirect()
                ->route('imports.show', [$handler->domain(), $importBatch])
                ->with('excel_error_title', 'Import confirmation blocked')
                ->with('excel_errors', $exception->errors());
        } catch (Throwable $exception) {
            report($exception);

            $importBatch->update([
                'status' => 'failed',
                'error_payload' => ['Technical detail: '.$exception->getMessage()],
            ]);

            return redirect()
                ->route('imports.show', [$handler->domain(), $importBatch])
                ->with('excel_error_title', 'Import failed')
                ->with('excel_errors', [
                    'The import could not be completed. No records were saved.',
                    'Technical detail: '.$exception->getMessage(),
                ]);
        }

        $importBatch->update([
            'status' => 'imported',
            'summary' => [
                ...($importBatch->summary ?? []),
                'creates' => $summary->created,
                'updates' => $summary->updated,
            ],
            'error_payload' => [],
            'confirmed_at' => now(),
        ]);

        return redirect()
            ->route('imports.show', [$handler->domain(), $importBatch])
            ->with('success', "{$handler->title()} imported. Created: {$summary->created}, updated: {$summary->updated}.");
    }

    private function handler(string $domain): ImportPreviewHandler
    {
        try {
            return $this->registry->get($domain);
        } catch (Throwable) {
            throw new NotFoundHttpException;
        }
    }

    private function authorizeImport(Request $request, string $permission): void
    {
        abort_unless($request->user()?->can($permission), 403);
    }

    private function ensureBatch(string $domain, ImportBatch $importBatch): void
    {
        abort_unless($importBatch->domain === $domain, 404);
    }
}
