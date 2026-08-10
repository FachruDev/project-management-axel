<?php

namespace App\Models;

use App\Enums\IncentiveProfileStatus;
use Database\Factories\IncentiveProfileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'description', 'version', 'status', 'effective_from', 'effective_to', 'support_percent', 'created_by', 'updated_by'])]
class IncentiveProfile extends Model
{
    /** @use HasFactory<IncentiveProfileFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => IncentiveProfileStatus::Draft->value,
        'support_percent' => 0,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => IncentiveProfileStatus::class,
            'effective_from' => 'date',
            'effective_to' => 'date',
            'support_percent' => 'decimal:4',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * @return HasMany<IncentiveMandayRule, $this>
     */
    public function mandayRules(): HasMany
    {
        return $this->hasMany(IncentiveMandayRule::class);
    }

    /**
     * @return HasMany<IncentivePicLevelRule, $this>
     */
    public function picLevelRules(): HasMany
    {
        return $this->hasMany(IncentivePicLevelRule::class);
    }

    /**
     * @return HasMany<IncentiveProjectRoleRule, $this>
     */
    public function projectRoleRules(): HasMany
    {
        return $this->hasMany(IncentiveProjectRoleRule::class);
    }

    /**
     * @return HasMany<IncentiveDeliveryRule, $this>
     */
    public function deliveryRules(): HasMany
    {
        return $this->hasMany(IncentiveDeliveryRule::class);
    }

    /**
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function currentStatus(): IncentiveProfileStatus
    {
        $status = $this->getAttribute('status');

        if ($status instanceof IncentiveProfileStatus) {
            return $status;
        }

        return IncentiveProfileStatus::from($status);
    }

    public function isEditable(): bool
    {
        return in_array($this->currentStatus(), [IncentiveProfileStatus::Draft, IncentiveProfileStatus::Inactive], true);
    }

    public function isActive(): bool
    {
        return $this->currentStatus() === IncentiveProfileStatus::Active;
    }

    public function isArchived(): bool
    {
        return $this->currentStatus() === IncentiveProfileStatus::Archived;
    }

    public function hasUsage(): bool
    {
        return $this->projects()->exists() || $this->incentiveCalculations()->exists();
    }

    /**
     * @return HasMany<ProjectIncentiveCalculation, $this>
     */
    public function incentiveCalculations(): HasMany
    {
        return $this->hasMany(ProjectIncentiveCalculation::class);
    }

    /**
     * @param  Builder<IncentiveProfile>  $query
     * @return Builder<IncentiveProfile>
     */
    public function scopeWithStatus(Builder $query, IncentiveProfileStatus $status): Builder
    {
        return $query->where('status', $status->value);
    }
}
