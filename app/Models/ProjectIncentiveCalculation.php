<?php

namespace App\Models;

use App\Enums\DeliveryStatus;
use Database\Factories\ProjectIncentiveCalculationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id',
    'incentive_profile_id',
    'mandays',
    'base_score',
    'support_percent',
    'support_pool',
    'technical_pool',
    'target_end_date',
    'actual_end_date',
    'difference_days',
    'delivery_status',
    'delivery_multiplier',
    'total_incentive',
    'calculated_at',
])]
class ProjectIncentiveCalculation extends Model
{
    /** @use HasFactory<ProjectIncentiveCalculationFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mandays' => 'decimal:2',
            'base_score' => 'decimal:4',
            'support_percent' => 'decimal:4',
            'support_pool' => 'decimal:4',
            'technical_pool' => 'decimal:4',
            'target_end_date' => 'date',
            'actual_end_date' => 'date',
            'delivery_status' => DeliveryStatus::class,
            'delivery_multiplier' => 'decimal:4',
            'total_incentive' => 'decimal:4',
            'calculated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<IncentiveProfile, $this>
     */
    public function incentiveProfile(): BelongsTo
    {
        return $this->belongsTo(IncentiveProfile::class);
    }

    /**
     * @return HasMany<ProjectIncentiveItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ProjectIncentiveItem::class, 'calculation_id');
    }
}
