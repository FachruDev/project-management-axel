<?php

namespace App\Http\Controllers;

use App\Models\ProjectTask;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectTaskDeleteController extends Controller
{
    public function __invoke(Request $request, ProjectTask $task): RedirectResponse
    {
        abort_unless($request->user()?->can('manage_tasks') === true, 403);

        $task->delete();

        return back()->with('success', 'Task deleted.');
    }
}
