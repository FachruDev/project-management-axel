<?php

namespace App\Models;

use Database\Factories\IncentiveMandayRuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['incentive_profile_id', 'min_mandays', 'max_mandays', 'base_score', 'sort_order'])]
class IncentiveMandayRule extends Model
{
    /** @use HasFactory<IncentiveMandayRuleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'base_score' => 'decimal:4',
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
