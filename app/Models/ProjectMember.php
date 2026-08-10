<?php

namespace App\Models;

use Database\Factories\ProjectMemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id',
    'user_id',
    'incentive_project_role_rule_id',
    'incentive_pic_level_rule_id',
    'project_role_code',
    'project_role_name',
    'pic_level_code',
    'pic_level_name',
    'is_support',
])]
class ProjectMember extends Model
{
    /** @use HasFactory<ProjectMemberFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_support' => 'boolean',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<IncentiveProjectRoleRule, $this>
     */
    public function roleRule(): BelongsTo
    {
        return $this->belongsTo(IncentiveProjectRoleRule::class, 'incentive_project_role_rule_id');
    }

    /**
     * @return BelongsTo<IncentivePicLevelRule, $this>
     */
    public function picLevelRule(): BelongsTo
    {
        return $this->belongsTo(IncentivePicLevelRule::class, 'incentive_pic_level_rule_id');
    }

    /**
     * @return HasMany<ProjectTask, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }
}
