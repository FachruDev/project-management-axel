<?php

namespace Tests\Unit;

use App\Enums\AttachmentCollection;
use App\Enums\DeliveryStatus;
use App\Enums\IncentiveProfileStatus;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use PHPUnit\Framework\TestCase;

class ProjectEnumTest extends TestCase
{
    public function test_project_status_values_are_available(): void
    {
        $this->assertSame([
            'draft',
            'pending_approval',
            'rejected',
            'planning',
            'ongoing',
            'awaiting_bast',
            'ready_to_close',
            'closed',
        ], array_column(ProjectStatus::cases(), 'value'));
    }

    public function test_task_status_values_are_available(): void
    {
        $this->assertSame(['todo', 'assigned', 'inprogress', 'done', 'cancelled'], array_column(TaskStatus::cases(), 'value'));
    }

    public function test_supporting_enum_values_are_available(): void
    {
        $this->assertSame(['urs_file', 'uat_file', 'bast_file', 'request_evidence', 'task_attachment'], array_column(AttachmentCollection::cases(), 'value'));
        $this->assertSame(['draft', 'active', 'inactive', 'archived'], array_column(IncentiveProfileStatus::cases(), 'value'));
        $this->assertSame(['early', 'on_time', 'late'], array_column(DeliveryStatus::cases(), 'value'));
    }
}
