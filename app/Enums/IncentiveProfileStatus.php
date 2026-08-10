<?php

namespace App\Enums;

enum IncentiveProfileStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Inactive = 'inactive';
    case Archived = 'archived';
}
