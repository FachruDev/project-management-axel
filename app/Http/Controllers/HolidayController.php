<?php

namespace App\Http\Controllers;

use App\Enums\HolidayType;
use App\Http\Requests\StoreHolidayRequest;
use App\Http\Requests\UpdateHolidayRequest;
use App\Models\Holiday;
use DateTimeInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HolidayController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->trim()->toString();
        $type = $request->string('type')->trim()->toString();

        $holidays = Holiday::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->when($type !== '', fn ($query) => $query->where('type', $type))
            ->orderByDesc('date')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Holiday $holiday): array => [
                'id' => $holiday->id,
                'date' => $this->dateString($holiday->date),
                'name' => $holiday->name,
                'type' => $this->typeValue($holiday->type),
                'is_working' => $holiday->is_working,
                'description' => $holiday->description,
                'is_active' => $holiday->is_active,
            ]);

        return Inertia::render('holidays/index', [
            'holidays' => $holidays,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
            ],
            'types' => collect(HolidayType::cases())
                ->map(fn (HolidayType $type): array => [
                    'value' => $type->value,
                    'label' => str($type->value)->headline()->toString(),
                ])
                ->all(),
        ]);
    }

    public function store(StoreHolidayRequest $request): RedirectResponse
    {
        Holiday::create($request->validated());

        return redirect()
            ->route('holidays.index')
            ->with('success', 'Holiday saved.');
    }

    public function update(UpdateHolidayRequest $request, Holiday $holiday): RedirectResponse
    {
        $holiday->update($request->validated());

        return redirect()
            ->route('holidays.index')
            ->with('success', 'Holiday updated.');
    }

    public function destroy(Holiday $holiday): RedirectResponse
    {
        $holiday->delete();

        return redirect()
            ->route('holidays.index')
            ->with('success', 'Holiday deleted.');
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value === null ? null : (string) $value;
    }

    private function typeValue(HolidayType|string $type): string
    {
        if ($type instanceof HolidayType) {
            return $type->value;
        }

        return $type;
    }
}
