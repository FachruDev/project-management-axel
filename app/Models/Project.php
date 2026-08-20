<?php

namespace App\Models;

use App\Enums\AttachmentCollection;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'name',
    'project_date',
    'status',
    'mandays',
    'incentive_profile_id',
    'pm_user_id',
    'request_user_id',
    'location',
    'urs_date',
    'urs_number',
    'plan_start_date',
    'plan_end_date',
    'actual_start_date',
    'actual_end_date',
    'uat_date',
    'bast_date',
    'approval_requested_by',
    'approval_requested_at',
    'approved_by',
    'approved_at',
    'rejected_by',
    'rejected_at',
    'rejection_notes',
    'created_by',
    'updated_by',
])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => ProjectStatus::Draft->value,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'project_date' => 'date',
            'status' => ProjectStatus::class,
            'mandays' => 'decimal:2',
            'urs_date' => 'date',
            'plan_start_date' => 'date',
            'plan_end_date' => 'date',
            'actual_start_date' => 'date',
            'actual_end_date' => 'date',
            'uat_date' => 'date',
            'bast_date' => 'date',
            'approval_requested_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function pm(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pm_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'request_user_id');
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
     * @return BelongsTo<User, $this>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * @return BelongsToMany<Customer, $this>
     */
    public function customers(): BelongsToMany
    {
        return $this->belongsToMany(Customer::class)
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * @return HasMany<ProjectMember, $this>
     */
    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    /**
     * @return HasMany<ProjectAccessRule, $this>
     */
    public function accessRules(): HasMany
    {
        return $this->hasMany(ProjectAccessRule::class);
    }

    /**
     * @return HasMany<ProjectTask, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }

    /**
     * @return HasMany<TaskType, $this>
     */
    public function taskTypes(): HasMany
    {
        return $this->hasMany(TaskType::class);
    }

    /**
     * @return HasMany<ProjectStatusHistory, $this>
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ProjectStatusHistory::class);
    }

    /**
     * @return MorphMany<Attachment, $this>
     */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * @return HasMany<ProjectIncentiveCalculation, $this>
     */
    public function incentiveCalculations(): HasMany
    {
        return $this->hasMany(ProjectIncentiveCalculation::class);
    }

    /**
     * @return HasOne<ProjectIncentiveCalculation, $this>
     */
    public function currentIncentiveCalculation(): HasOne
    {
        return $this->hasOne(ProjectIncentiveCalculation::class)
            ->where('is_current', true)
            ->latestOfMany('calculated_at');
    }

    /**
     * @return HasMany<ProjectQuotation, $this>
     */
    public function quotations(): HasMany
    {
        return $this->hasMany(ProjectQuotation::class);
    }

    public function hasAttachment(AttachmentCollection $collection): bool
    {
        return $this->attachments()
            ->where('collection', $collection->value)
            ->exists();
    }

    public function hasCustomers(): bool
    {
        return $this->customers()->exists();
    }

    public function hasMembers(): bool
    {
        return $this->members()->exists();
    }

    public function allTasksDone(): bool
    {
        return $this->tasks()->exists()
            && $this->tasks()
                ->where('status', '!=', TaskStatus::Done->value)
                ->doesntExist();
    }

    public function currentStatus(): ProjectStatus
    {
        $status = $this->getAttribute('status');

        if ($status instanceof ProjectStatus) {
            return $status;
        }

        return ProjectStatus::from($status);
    }

    /**
     * @param  Builder<Project>  $query
     * @return Builder<Project>
     */
    public function scopeWithStatus(Builder $query, ProjectStatus $status): Builder
    {
        return $query->where('status', $status->value);
    }
}
