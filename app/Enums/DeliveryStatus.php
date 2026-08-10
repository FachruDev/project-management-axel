<?php

namespace App\Enums;

enum DeliveryStatus: string
{
    case Early = 'early';
    case OnTime = 'on_time';
    case Late = 'late';
}
