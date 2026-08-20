<?php

namespace App\Models;

use App\Enums\ProjectQuotationStatus;
use App\Enums\ProjectQuotationType;
use Database\Factories\ProjectQuotationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id',
    'quotation_no',
    'quotation_type',
    'quotation_date',
    'customer_name',
    'customer_address',
    'customer_identifier',
    'cc',
    'description',
    'term_of_payment_date',
    'valid_until_date',
    'note',
    'prepared_by_name',
    'approved_by_name',
    'ppn_pph_percent',
    'subtotal',
    'grand_total',
    'qr_target_url',
    'status',
    'created_by',
    'updated_by',
])]
class ProjectQuotation extends Model
{
    /** @use HasFactory<ProjectQuotationFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => ProjectQuotationStatus::Quotation->value,
        'quotation_type' => ProjectQuotationType::Project->value,
        'ppn_pph_percent' => 0,
        'subtotal' => 0,
        'grand_total' => 0,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quotation_type' => ProjectQuotationType::class,
            'quotation_date' => 'date',
            'term_of_payment_date' => 'date',
            'valid_until_date' => 'date',
            'ppn_pph_percent' => 'decimal:4',
            'subtotal' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'status' => ProjectQuotationStatus::class,
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
     * @return HasMany<ProjectQuotationItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ProjectQuotationItem::class)->orderBy('sort_order');
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
}
