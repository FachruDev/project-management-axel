<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWorkingDayRuleRequest;
use App\Http\Requests\UpdateWorkingDayRuleRequest;
use App\Models\WorkingDayRule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkingDayRuleController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->trim()->toString();

        $workingDayRules = WorkingDayRule::query()
            ->when($status === 'working', fn ($query) => $query->where('is_working', true))
            ->when($status === 'non_working', fn ($query) => $query->where('is_working', false))
            ->orderBy('day_of_week')
            ->get()
            ->map(fn (WorkingDayRule $rule): array => [
                'id' => $rule->id,
                'day_of_week' => $rule->day_of_week,
                'day_name' => $this->dayName($rule->day_of_week),
                'is_working' => $rule->is_working,
                'description' => $rule->description,
            ]);

        return Inertia::render('working-day-rules/index', [
            'working_day_rules' => $workingDayRules,
            'filters' => [
                'status' => $status,
            ],
            'day_options' => $this->dayOptions(),
        ]);
    }

    public function store(StoreWorkingDayRuleRequest $request): RedirectResponse
    {
        WorkingDayRule::create($request->validated());

        return redirect()
            ->route('working-day-rules.index')
            ->with('success', 'Working day saved.');
    }

    public function update(UpdateWorkingDayRuleRequest $request, WorkingDayRule $workingDayRule): RedirectResponse
    {
        $workingDayRule->update($request->validated());

        return redirect()
            ->route('working-day-rules.index')
            ->with('success', 'Working day updated.');
    }

    public function destroy(WorkingDayRule $workingDayRule): RedirectResponse
    {
        $workingDayRule->delete();

        return redirect()
            ->route('working-day-rules.index')
            ->with('success', 'Working day deleted.');
    }

    /**
     * @return array<int, array{value: int, label: string}>
     */
    private function dayOptions(): array
    {
        return collect(range(1, 7))
            ->map(fn (int $dayOfWeek): array => [
                'value' => $dayOfWeek,
                'label' => $this->dayName($dayOfWeek),
            ])
            ->all();
    }

    private function dayName(int $dayOfWeek): string
    {
        return match ($dayOfWeek) {
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
            7 => 'Sunday',
            default => 'Unknown',
        };
    }
}
