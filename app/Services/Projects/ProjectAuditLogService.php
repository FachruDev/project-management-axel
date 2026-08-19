<?php

namespace App\Services\Projects;

use App\Models\Project;
use App\Models\User;
use DateTimeInterface;
use Spatie\Activitylog\Models\Activity;

class ProjectAuditLogService
{
    /**
     * @return array{data: array<int, array<string, mixed>>, has_more: bool}
     */
    public function paginate(Project $project, int $limit, int $offset = 0): array
    {
        $limit = max(1, min($limit, 50));
        $offset = max(0, $offset);
        $activities = Activity::query()
            ->with('causer')
            ->forSubject($project)
            ->latest()
            ->offset($offset)
            ->limit($limit + 1)
            ->get();

        return [
            'data' => $activities
                ->take($limit)
                ->map(fn (Activity $activity): array => $this->payload($activity))
                ->values()
                ->all(),
            'has_more' => $activities->count() > $limit,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Activity $activity): array
    {
        return [
            'id' => $activity->id,
            'action' => (string) ($activity->event ?? $activity->description),
            'description' => $activity->description,
            'entity_type' => $activity->getExtraProperty('entity_label'),
            'entity_id' => $activity->getExtraProperty('entity_id'),
            'actor' => $activity->causer instanceof User ? $this->userOption($activity->causer) : null,
            'old' => $activity->getExtraProperty('old'),
            'new' => $activity->getExtraProperty('new'),
            'reason' => $activity->getExtraProperty('reason'),
            'source' => $activity->getExtraProperty('source'),
            'changed_at' => $activity->getExtraProperty('changed_at') ?? $this->dateString($activity->created_at),
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, external_id: ?string}
     */
    private function userOption(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'external_id' => $user->external_id,
        ];
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value === null ? null : (string) $value;
    }
}
