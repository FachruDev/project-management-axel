<?php

namespace App\Enums;

enum ProjectQuotationStatus: string
{
    case Quotation = 'quotation';
    case Invoiced = 'invoiced';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Quotation => 'Quotation',
            self::Invoiced => 'Invoiced',
            self::Paid => 'Paid',
        };
    }
}
