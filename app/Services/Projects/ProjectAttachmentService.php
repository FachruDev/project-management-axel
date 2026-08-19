<?php

namespace App\Services\Projects;

use App\Enums\AttachmentCollection;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProjectAttachmentService
{
    public function __construct(
        private readonly ProjectAuditLogger $auditLogger,
    ) {}

    public function projectForAttachment(Attachment $attachment): ?Project
    {
        $attachable = $attachment->attachable()->first();

        if ($attachable instanceof Project) {
            return $attachable;
        }

        if ($attachable instanceof ProjectTask) {
            return $attachable->project()->first();
        }

        return null;
    }

    /**
     * @return array{id: int, collection: string, original_name: string, mime_type: string|null, url: string, download_url: string}
     */
    public function payload(Attachment $attachment): array
    {
        return [
            'id' => (int) $attachment->id,
            'collection' => $this->collectionValue($attachment),
            'original_name' => $attachment->original_name,
            'mime_type' => $attachment->mime_type,
            'url' => route('attachments.show', $attachment),
            'download_url' => route('attachments.show', $attachment),
        ];
    }

    public function storeProjectFile(Project $project, UploadedFile $file, AttachmentCollection $collection, User $actor, string $source = 'preparation'): Attachment
    {
        $path = $file->store('project-attachments', 'local');

        if ($path === false) {
            throw ValidationException::withMessages([
                $collection->value => ['Project attachment could not be stored.'],
            ]);
        }

        $attachment = Attachment::create([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'collection' => $collection,
            'disk' => 'local',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $actor->id,
        ]);

        $this->auditLogger->log(
            $project,
            $actor,
            'attachment_uploaded',
            $attachment,
            null,
            $this->attachmentSnapshot($attachment),
            null,
            $source,
        );

        return $attachment;
    }

    public function delete(Attachment $attachment, User $actor): void
    {
        $project = $this->projectForAttachment($attachment);

        if (! $project instanceof Project) {
            throw ValidationException::withMessages([
                'attachment' => ['Attachment is not linked to a project.'],
            ]);
        }

        $oldData = $this->attachmentSnapshot($attachment);
        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();

        $this->auditLogger->log(
            $project,
            $actor,
            'attachment_deleted',
            Attachment::class,
            $oldData,
            null,
            null,
            'preparation',
        );
    }

    public function isPdf(Attachment $attachment): bool
    {
        if ($attachment->mime_type === 'application/pdf') {
            return true;
        }

        return Str::lower(pathinfo($attachment->original_name, PATHINFO_EXTENSION)) === 'pdf';
    }

    public function collectionValue(Attachment $attachment): string
    {
        $collection = $attachment->getAttribute('collection');

        if ($collection instanceof AttachmentCollection) {
            return $collection->value;
        }

        return (string) $collection;
    }

    /**
     * @return array<string, mixed>
     */
    private function attachmentSnapshot(Attachment $attachment): array
    {
        return $this->auditLogger->snapshot($attachment, [
            'attachable_type',
            'attachable_id',
            'collection',
            'disk',
            'path',
            'original_name',
            'mime_type',
            'size',
            'uploaded_by',
        ]);
    }
}
