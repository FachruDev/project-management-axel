<?php

namespace App\Models;

use Database\Factories\IncentiveDeliveryRuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['incentive_profile_id', 'name', 'min_difference_days', 'max_difference_days', 'multiplier', 'sort_order'])]
class IncentiveDeliveryRule extends Model
{
    /** @use HasFactory<IncentiveDeliveryRuleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'multiplier' => 'decimal:4',
        ];
    }

    /**
     * @return BelongsTo<IncentiveProfile, $this>
     */
    public function incentiveProfile(): BelongsTo
    {
        return $this->belongsTo(IncentiveProfile::class);
    }
}
