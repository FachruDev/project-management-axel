<?php

namespace App\Enums;

enum ProjectStatus: string
{
    case Draft = 'draft';
    case PendingApproval = 'pending_approval';
    case Rejected = 'rejected';
    case Planning = 'planning';
    case Ongoing = 'ongoing';
    case AwaitingBast = 'awaiting_bast';
    case ReadyToClose = 'ready_to_close';
    case Closed = 'closed';
}
