<?php

namespace App\Enums;

enum TaskStatus: string
{
    case Todo = 'todo';
    case Assigned = 'assigned';
    case InProgress = 'inprogress';
    case Done = 'done';
    case Cancelled = 'cancelled';
}
