<?php

namespace Database\Factories;

use App\Enums\AttachmentCollection;
use App\Models\Attachment;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'attachable_type' => Project::class,
            'attachable_id' => Project::factory(),
            'collection' => AttachmentCollection::RequestEvidence,
            'disk' => 'local',
            'path' => 'project-files/'.fake()->uuid().'.pdf',
            'original_name' => fake()->word().'.pdf',
            'mime_type' => 'application/pdf',
            'size' => fake()->numberBetween(10_000, 1_000_000),
            'uploaded_by' => null,
        ];
    }
}
