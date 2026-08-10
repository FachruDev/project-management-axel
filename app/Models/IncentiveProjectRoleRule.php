<?php

namespace App\Models;

use Database\Factories\IncentiveProjectRoleRuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['incentive_profile_id', 'role_code', 'role_name', 'points', 'is_support'])]
class IncentiveProjectRoleRule extends Model
{
    /** @use HasFactory<IncentiveProjectRoleRuleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points' => 'decimal:4',
            'is_support' => 'boolean',
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
