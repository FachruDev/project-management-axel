<?php

namespace App\Http\Controllers;

use App\Exports\ArraySheetExport;
use App\Exports\UsersExport;
use App\Http\Controllers\Concerns\HandlesExcelTransfers;
use App\Http\Requests\ImportExcelRequest;
use App\Services\Excel\UserExcelService;
use Illuminate\Http\RedirectResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserExcelController extends Controller
{
    use HandlesExcelTransfers;

    public function export(): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel('User export failed', fn (): BinaryFileResponse => Excel::download(new UsersExport, 'users.xlsx'));
    }

    public function template(UserExcelService $service): BinaryFileResponse|RedirectResponse
    {
        return $this->downloadExcel(
            'User template download failed',
            fn (): BinaryFileResponse => Excel::download(new ArraySheetExport('Users', $service->headings(), $service->sampleRows()), 'users-template.xlsx'),
        );
    }

    public function import(ImportExcelRequest $request, UserExcelService $service): RedirectResponse
    {
        return $this->importExcel('User import failed', fn () => $service->import($request->file('file')), 'Users');
    }
}
