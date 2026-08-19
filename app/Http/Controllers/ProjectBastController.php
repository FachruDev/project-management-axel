<?php

namespace App\Http\Controllers;

use App\Enums\AttachmentCollection;
use App\Events\ProjectBoardChanged;
use App\Http\Requests\UpdateProjectBastRequest;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectAttachmentService;
use App\Services\Projects\ProjectAuditLogger;
use App\Services\Projects\ProjectLifecycleService;
use App\Services\Projects\ProjectVisibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ProjectBastController extends Controller
{
    public function __construct(
        private readonly ProjectAttachmentService $attachmentService,
        private readonly ProjectAuditLogger $auditLogger,
        private readonly ProjectLifecycleService $lifecycleService,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function __invoke(UpdateProjectBastRequest $request, Project $project): RedirectResponse
    {
        $actor = $this->actor($request);
        abort_unless($this->visibility->visibleProjects(Project::query()->whereKey($project->id), $actor)->exists(), 403);

        $fromStatus = $project->currentStatus();
        $oldData = $this->projectBastSnapshot($project);
        $project = DB::transaction(function () use ($request, $project, $actor, $oldData): Project {
            $project->forceFill([
                'bast_date' => $request->validated('bast_date'),
                'updated_by' => $actor->id,
            ])->save();

            $file = $request->file('bast_file');

            if ($file !== null) {
                $this->attachmentService->storeProjectFile($project, $file, AttachmentCollection::BastFile, $actor, 'quick_bast');
            }

            $project = $this->lifecycleService->refreshAutomaticStatus($project->refresh());

            $this->auditLogger->log(
                $project,
                $actor,
                'project_bast_updated',
                $project,
                $oldData,
                $this->projectBastSnapshot($project),
                null,
                'quick_bast',
            );

            return $project;
        });

        if ($fromStatus !== $project->currentStatus()) {
            ProjectBoardChanged::dispatch([
                'project_id' => $project->id,
                'old_status' => $fromStatus->value,
                'new_status' => $project->currentStatus()->value,
                'action' => 'project_bast_updated',
                'actor_id' => $actor->id,
                'changed_at' => now()->toISOString(),
            ]);
        }

        return back()->with('success', 'BAST uploaded. Project status is now '.str($project->currentStatus()->value)->replace('_', ' ')->headline()->toString().'.');
    }

    /**
     * @return array<string, mixed>
     */
    private function projectBastSnapshot(Project $project): array
    {
        return $this->auditLogger->snapshot($project, [
            'status',
            'bast_date',
            'updated_by',
        ]);
    }

    private function actor(UpdateProjectBastRequest $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
