<?php

namespace App\Enums;

enum AttachmentCollection: string
{
    case UrsFile = 'urs_file';
    case UatFile = 'uat_file';
    case BastFile = 'bast_file';
    case RequestEvidence = 'request_evidence';
    case TaskAttachment = 'task_attachment';
}
