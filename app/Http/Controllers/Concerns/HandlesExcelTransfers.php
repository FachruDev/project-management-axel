<?php

namespace App\Http\Controllers\Concerns;

use App\Services\Excel\ExcelImportException;
use App\Services\Excel\ImportSummary;
use Closure;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

trait HandlesExcelTransfers
{
    /**
     * @param  Closure(): BinaryFileResponse  $callback
     */
    protected function downloadExcel(string $title, Closure $callback): BinaryFileResponse|RedirectResponse
    {
        try {
            return $callback();
        } catch (Throwable $exception) {
            report($exception);

            return back()
                ->with('excel_error_title', $title)
                ->with('excel_errors', [
                    'The Excel file could not be generated. Please try again after refreshing the page.',
                    'Technical detail: '.$exception->getMessage(),
                ]);
        }
    }

    /**
     * @param  Closure(): ImportSummary  $callback
     */
    protected function importExcel(string $title, Closure $callback, string $entity): RedirectResponse
    {
        try {
            $summary = $callback();
        } catch (ExcelImportException $exception) {
            return back()
                ->with('excel_error_title', $title)
                ->with('excel_errors', $exception->errors());
        } catch (Throwable $exception) {
            report($exception);

            return back()
                ->with('excel_error_title', $title)
                ->with('excel_errors', [
                    "{$entity} import could not be completed. No records were saved.",
                    'Technical detail: '.$exception->getMessage(),
                ]);
        }

        return back()->with('success', "{$entity} imported. Created: {$summary->created}, updated: {$summary->updated}.");
    }
}
