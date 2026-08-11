<?php

namespace App\Services\Calendar;

use App\Models\Holiday;
use App\Models\WorkingDayRule;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class BusinessDayCalculator
{
    public function signedDifference(CarbonInterface|string $targetDate, CarbonInterface|string $actualDate): int
    {
        $target = CarbonImmutable::parse($targetDate)->startOfDay();
        $actual = CarbonImmutable::parse($actualDate)->startOfDay();

        if ($target->equalTo($actual)) {
            return 0;
        }

        if ($actual->greaterThan($target)) {
            return $this->businessDaysBetweenExclusiveStart($target, $actual);
        }

        return -$this->businessDaysBetweenExclusiveStart($actual, $target);
    }

    private function businessDaysBetweenExclusiveStart(CarbonImmutable $startDate, CarbonImmutable $endDate): int
    {
        $workingDays = $this->workingDayMap();
        $holidayMap = $this->holidayMap($startDate, $endDate);
        $days = 0;

        for ($date = $startDate->addDay(); $date->lessThanOrEqualTo($endDate); $date = $date->addDay()) {
            $dateKey = $date->toDateString();

            if (array_key_exists($dateKey, $holidayMap)) {
                if ($holidayMap[$dateKey]) {
                    $days++;
                }

                continue;
            }

            if ($workingDays[$date->dayOfWeekIso] ?? false) {
                $days++;
            }
        }

        return $days;
    }

    /**
     * @return array<int, bool>
     */
    private function workingDayMap(): array
    {
        $rules = WorkingDayRule::query()
            ->get(['day_of_week', 'is_working'])
            ->mapWithKeys(fn (WorkingDayRule $rule): array => [
                $rule->day_of_week => (bool) $rule->is_working,
            ])
            ->all();

        if ($rules !== []) {
            return $rules;
        }

        return [
            1 => true,
            2 => true,
            3 => true,
            4 => true,
            5 => true,
            6 => false,
            7 => false,
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function holidayMap(CarbonImmutable $startDate, CarbonImmutable $endDate): array
    {
        return Holiday::query()
            ->where('is_active', true)
            ->whereDate('date', '>=', $startDate->toDateString())
            ->whereDate('date', '<=', $endDate->toDateString())
            ->get(['date', 'is_working'])
            ->mapWithKeys(fn (Holiday $holiday): array => [
                CarbonImmutable::parse($holiday->date)->toDateString() => (bool) $holiday->is_working,
            ])
            ->all();
    }
}
