<?php

namespace App\Enums;

enum ProjectQuotationType: string
{
    case Project = 'PRJ';
    case Maintenance = 'MNT';

    public function label(): string
    {
        return match ($this) {
            self::Project => 'Project',
            self::Maintenance => 'Maintenance',
        };
    }

    public function category(): string
    {
        return match ($this) {
            self::Project => 'project',
            self::Maintenance => 'maintenance',
        };
    }
}
