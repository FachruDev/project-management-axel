<?php

namespace App\Models;

use Database\Factories\IncentivePicLevelRuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['incentive_profile_id', 'level_code', 'level_name', 'points'])]
class IncentivePicLevelRule extends Model
{
    /** @use HasFactory<IncentivePicLevelRuleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points' => 'decimal:4',
        ];
    }

    /**
     * @return BelongsTo<IncentiveProfile, $this>
     */
    public function incentiveProfile(): BelongsTo
    {
        return $this->belongsTo(IncentiveProfile::class);
    }

    /**
     * @return HasMany<ProjectMember, $this>
     */
    public function projectMembers(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }
}
