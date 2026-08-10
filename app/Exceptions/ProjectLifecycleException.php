<?php

namespace App\Exceptions;

use App\Enums\ProjectStatus;
use RuntimeException;

class ProjectLifecycleException extends RuntimeException
{
    /**
     * @param  array<int, ProjectStatus>  $allowedStatuses
     */
    public static function invalidTransition(ProjectStatus $currentStatus, array $allowedStatuses): self
    {
        $allowed = collect($allowedStatuses)
            ->map(fn (ProjectStatus $status): string => $status->value)
            ->implode(', ');

        return new self("Project status [{$currentStatus->value}] cannot perform this transition. Allowed status: {$allowed}.");
    }
}
