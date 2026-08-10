<?php

namespace App\Models;

use Database\Factories\ProjectIncentiveItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'calculation_id',
    'employee_id',
    'employee_name',
    'project_role',
    'pic_level',
    'is_support',
    'pic_points',
    'role_points',
    'weight_points',
    'weight_ratio',
    'base_incentive',
    'delivery_multiplier',
    'final_incentive',
])]
class ProjectIncentiveItem extends Model
{
    /** @use HasFactory<ProjectIncentiveItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_support' => 'boolean',
            'pic_points' => 'decimal:4',
            'role_points' => 'decimal:4',
            'weight_points' => 'decimal:4',
            'weight_ratio' => 'decimal:8',
            'base_incentive' => 'decimal:4',
            'delivery_multiplier' => 'decimal:4',
            'final_incentive' => 'decimal:4',
        ];
    }

    /**
     * @return BelongsTo<ProjectIncentiveCalculation, $this>
     */
    public function calculation(): BelongsTo
    {
        return $this->belongsTo(ProjectIncentiveCalculation::class, 'calculation_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }
}
