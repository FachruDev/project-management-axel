<?php

namespace App\Services\Projects;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ProjectAuditLogger
{
    /**
     * @param  array<string, mixed>|null  $oldData
     * @param  array<string, mixed>|null  $newData
     * @param  array<string, mixed>  $extra
     */
    public function log(
        Project $project,
        ?User $actor,
        string $action,
        Model|string $entity,
        ?array $oldData = null,
        ?array $newData = null,
        ?string $reason = null,
        string $source = 'manual',
        array $extra = [],
    ): void {
        $entityType = $entity instanceof Model ? $entity->getMorphClass() : $entity;
        $entityId = $entity instanceof Model ? $entity->getKey() : null;
        $reason = $this->nullableText($reason);

        activity('project')
            ->event($action)
            ->when($actor instanceof User, fn ($logger) => $logger->causedBy($actor))
            ->performedOn($project)
            ->withProperties([
                'action' => $action,
                'entity_type' => $entityType,
                'entity_label' => class_basename($entityType),
                'entity_id' => $entityId,
                'actor_id' => $actor?->id,
                'actor_name' => $actor?->name,
                'old' => $oldData,
                'new' => $newData,
                'reason' => $reason,
                'source' => $source,
                'changed_at' => now()->toISOString(),
                ...$extra,
            ])
            ->log($this->description($action, $entityType));
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<string, mixed>
     */
    public function snapshot(Model $model, array $keys): array
    {
        return Arr::only($model->getAttributes(), $keys);
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<string, mixed>
     */
    public function original(Model $model, array $keys): array
    {
        return Arr::only($model->getOriginal(), $keys);
    }

    private function nullableText(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function description(string $action, string $entityType): string
    {
        return Str::headline($action).' '.class_basename($entityType);
    }
}
