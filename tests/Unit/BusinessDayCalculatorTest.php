<?php

namespace Tests\Unit;

use App\Models\Holiday;
use App\Models\WorkingDayRule;
use App\Services\Calendar\BusinessDayCalculator;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class BusinessDayCalculatorTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_signed_difference_uses_working_days_and_weekends(): void
    {
        $this->seedWorkingDays();

        $calculator = app(BusinessDayCalculator::class);

        $this->assertSame(0, $calculator->signedDifference('2026-01-09', '2026-01-09'));
        $this->assertSame(1, $calculator->signedDifference('2026-01-09', '2026-01-12'));
        $this->assertSame(-1, $calculator->signedDifference('2026-01-12', '2026-01-09'));
    }

    public function test_holiday_can_exclude_or_include_a_date(): void
    {
        $this->seedWorkingDays();

        Holiday::factory()->create([
            'date' => '2026-01-12',
            'name' => 'National Holiday',
            'is_working' => false,
        ]);

        $calculator = app(BusinessDayCalculator::class);

        $this->assertSame(0, $calculator->signedDifference('2026-01-09', '2026-01-12'));

        Holiday::query()->whereDate('date', '2026-01-12')->update(['is_working' => true]);

        $this->assertSame(1, $calculator->signedDifference('2026-01-09', '2026-01-12'));
    }

    private function seedWorkingDays(): void
    {
        foreach (range(1, 7) as $dayOfWeek) {
            WorkingDayRule::factory()->create([
                'day_of_week' => $dayOfWeek,
                'is_working' => $dayOfWeek <= 5,
            ]);
        }
    }
}
