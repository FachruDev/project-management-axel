<?php

namespace App\Models;

use Database\Factories\ProjectQuotationItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'project_quotation_id',
    'sort_order',
    'category',
    'unit',
    'description',
    'qty',
    'unit_price',
    'discount_percent',
    'amount',
])]
class ProjectQuotationItem extends Model
{
    /** @use HasFactory<ProjectQuotationItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'qty' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'discount_percent' => 'decimal:4',
            'amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<ProjectQuotation, $this>
     */
    public function quotation(): BelongsTo
    {
        return $this->belongsTo(ProjectQuotation::class, 'project_quotation_id');
    }
}
