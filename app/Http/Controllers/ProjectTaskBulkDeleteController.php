<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkDeleteProjectTasksRequest;
use App\Models\ProjectTask;
use Illuminate\Http\RedirectResponse;

class ProjectTaskBulkDeleteController extends Controller
{
    public function __invoke(BulkDeleteProjectTasksRequest $request): RedirectResponse
    {
        ProjectTask::query()
            ->whereIn('id', $request->validated('task_ids'))
            ->delete();

        return back()->with('success', 'Tasks deleted.');
    }
}
