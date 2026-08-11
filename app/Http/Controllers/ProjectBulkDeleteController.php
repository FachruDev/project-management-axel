<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkDeleteProjectsRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;

class ProjectBulkDeleteController extends Controller
{
    public function __invoke(BulkDeleteProjectsRequest $request): RedirectResponse
    {
        Project::query()
            ->whereIn('id', $request->validated('project_ids'))
            ->delete();

        return back()->with('success', 'Projects deleted.');
    }
}
