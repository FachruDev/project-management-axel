<?php

namespace App\Services\Quotations;

use App\Enums\ProjectQuotationType;
use App\Models\ProjectQuotation;
use Carbon\CarbonInterface;

class ProjectQuotationNumberService
{
    public function generate(ProjectQuotationType $type, CarbonInterface $quotationDate): string
    {
        $prefix = sprintf(
            'QUOT/AXEL-%s/%s/%s',
            $type->value,
            $quotationDate->format('Y'),
            $this->romanMonth((int) $quotationDate->format('n')),
        );
        $sequence = $this->nextSequence($type, $quotationDate);

        do {
            $quotationNo = sprintf('%s/%03d', $prefix, $sequence);
            $sequence++;
        } while (ProjectQuotation::query()->where('quotation_no', $quotationNo)->exists());

        return $quotationNo;
    }

    private function nextSequence(ProjectQuotationType $type, CarbonInterface $quotationDate): int
    {
        $latestQuotationNo = ProjectQuotation::query()
            ->where('quotation_type', $type->value)
            ->whereYear('quotation_date', $quotationDate->format('Y'))
            ->whereMonth('quotation_date', $quotationDate->format('m'))
            ->latest('id')
            ->lockForUpdate()
            ->value('quotation_no');

        if (! is_string($latestQuotationNo)) {
            return 1;
        }

        return ((int) str($latestQuotationNo)->afterLast('/')->toString()) + 1;
    }

    private function romanMonth(int $month): string
    {
        return [
            1 => 'I',
            2 => 'II',
            3 => 'III',
            4 => 'IV',
            5 => 'V',
            6 => 'VI',
            7 => 'VII',
            8 => 'VIII',
            9 => 'IX',
            10 => 'X',
            11 => 'XI',
            12 => 'XII',
        ][$month];
    }
}
