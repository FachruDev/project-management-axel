<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'uuid',
        'domain',
        'status',
        'original_filename',
        'disk',
        'file_path',
        'preview_payload',
        'error_payload',
        'summary',
        'created_by',
        'confirmed_at',
        'expires_at',
    ];

    protected $attributes = [
        'status' => 'preview',
        'disk' => 'local',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return array<int, string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'preview_payload' => 'array',
            'error_payload' => 'array',
            'summary' => 'array',
            'confirmed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
