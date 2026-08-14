<?php

namespace App\Services\Projects;

use App\Enums\TaskStatus;
use App\Models\ProjectTask;
use DateTimeInterface;

class ProjectTaskActualDateService
{
    /**
     * @param  array<string, mixed>  $overrides
     * @return array{actual_start_date: mixed, actual_end_date: mixed}
     */
    public function forStatus(?ProjectTask $task, TaskStatus $targetStatus, array $overrides = []): array
    {
        $dates = $this->systemDates($task, $targetStatus);

        foreach (['actual_start_date', 'actual_end_date'] as $field) {
            if (array_key_exists($field, $overrides)) {
                $dates[$field] = $this->normalizedDate($overrides[$field]);
            }
        }

        return $dates;
    }

    /**
     * @return array{actual_start_date: mixed, actual_end_date: mixed}
     */
    private function systemDates(?ProjectTask $task, TaskStatus $targetStatus): array
    {
        return match ($targetStatus) {
            TaskStatus::Todo,
            TaskStatus::Assigned => [
                'actual_start_date' => null,
                'actual_end_date' => null,
            ],
            TaskStatus::InProgress => [
                'actual_start_date' => $task?->actual_start_date ?? today(),
                'actual_end_date' => null,
            ],
            TaskStatus::Done => [
                'actual_start_date' => $task?->actual_start_date ?? today(),
                'actual_end_date' => $task?->actual_end_date ?? today(),
            ],
            TaskStatus::Cancelled => [
                'actual_start_date' => $task?->actual_start_date,
                'actual_end_date' => null,
            ],
        };
    }

    private function normalizedDate(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }
}
