<?php

namespace Tests\Feature;

use App\Enums\HolidayType;
use App\Models\Holiday;
use App\Models\User;
use App\Models\WorkingDayRule;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkingCalendarCrudTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_working_calendar_permission_is_required(): void
    {
        $this
            ->actingAs(User::factory()->create())
            ->get(route('working-day-rules.index'))
            ->assertForbidden();

        $this
            ->actingAs(User::factory()->create())
            ->get(route('holidays.index'))
            ->assertForbidden();
    }

    public function test_working_day_rules_can_be_managed(): void
    {
        $user = $this->userWithPermission();

        $this
            ->actingAs($user)
            ->post(route('working-day-rules.store'), [
                'day_of_week' => 7,
                'is_working' => false,
                'description' => 'Sunday',
            ])
            ->assertRedirect(route('working-day-rules.index'));

        $rule = WorkingDayRule::query()->where('day_of_week', 7)->firstOrFail();

        $this
            ->actingAs($user)
            ->get(route('working-day-rules.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('working-day-rules/index')
                ->has('working_day_rules', 1)
                ->where('day_options.6.label', 'Sunday'));

        $this
            ->actingAs($user)
            ->put(route('working-day-rules.update', $rule), [
                'day_of_week' => 7,
                'is_working' => true,
                'description' => 'Sunday overtime',
            ])
            ->assertRedirect(route('working-day-rules.index'));

        $this->assertTrue($rule->refresh()->is_working);
    }

    public function test_holidays_can_be_managed(): void
    {
        $user = $this->userWithPermission();

        $this
            ->actingAs($user)
            ->post(route('holidays.store'), [
                'date' => '2026-08-17',
                'name' => 'Independence Day',
                'type' => HolidayType::National->value,
                'is_working' => false,
                'description' => 'National holiday',
                'is_active' => true,
            ])
            ->assertRedirect(route('holidays.index'));

        $holiday = Holiday::query()->whereDate('date', '2026-08-17')->firstOrFail();

        $this
            ->actingAs($user)
            ->get(route('holidays.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('holidays/index')
                ->has('holidays.data', 1)
                ->where('types.0.value', HolidayType::National->value));

        $this
            ->actingAs($user)
            ->put(route('holidays.update', $holiday), [
                'date' => '2026-08-17',
                'name' => 'Independence Day Override',
                'type' => HolidayType::Company->value,
                'is_working' => true,
                'description' => null,
                'is_active' => false,
            ])
            ->assertRedirect(route('holidays.index'));

        $holiday->refresh();

        $this->assertSame('Independence Day Override', $holiday->name);
        $this->assertSame(HolidayType::Company, $holiday->type);
        $this->assertTrue($holiday->is_working);
        $this->assertFalse($holiday->is_active);
    }

    public function test_duplicate_day_and_holiday_date_are_rejected(): void
    {
        $user = $this->userWithPermission();

        WorkingDayRule::factory()->create(['day_of_week' => 1]);
        Holiday::factory()->create(['date' => '2026-01-01']);

        $this
            ->actingAs($user)
            ->post(route('working-day-rules.store'), [
                'day_of_week' => 1,
                'is_working' => true,
                'description' => null,
            ])
            ->assertSessionHasErrors('day_of_week');

        $this
            ->actingAs($user)
            ->post(route('holidays.store'), [
                'date' => '2026-01-01',
                'name' => 'Duplicate',
                'type' => HolidayType::National->value,
                'is_working' => false,
                'description' => null,
                'is_active' => true,
            ])
            ->assertSessionHasErrors('date');
    }

    private function userWithPermission(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'manage_working_calendar',
            'guard_name' => 'web',
        ]));

        return $user;
    }
}
