<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectAttachmentService;
use App\Services\Projects\ProjectVisibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function __construct(
        private readonly ProjectAttachmentService $attachmentService,
        private readonly ProjectVisibilityService $visibility,
    ) {}

    public function show(Request $request, Attachment $attachment): StreamedResponse
    {
        $project = $this->attachmentProject($attachment);
        abort_unless($this->visibility->visibleProjects(Project::query()->whereKey($project->id), $this->actor($request))->exists(), 403);
        abort_unless(Storage::disk($attachment->disk)->exists($attachment->path), 404);

        return Storage::disk($attachment->disk)->response(
            $attachment->path,
            $attachment->original_name,
            [],
            $this->attachmentService->isPdf($attachment) ? 'inline' : 'attachment',
        );
    }

    public function destroy(Request $request, Attachment $attachment): RedirectResponse
    {
        $project = $this->attachmentProject($attachment);
        abort_unless($request->user()?->can('manage_projects') === true, 403);
        abort_unless($this->visibility->visibleProjects(Project::query()->whereKey($project->id), $this->actor($request))->exists(), 403);

        $this->attachmentService->delete($attachment, $this->actor($request));

        return back()->with('success', 'Attachment deleted.');
    }

    private function attachmentProject(Attachment $attachment): Project
    {
        $project = $this->attachmentService->projectForAttachment($attachment);

        abort_unless($project instanceof Project, 404);

        return $project;
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
