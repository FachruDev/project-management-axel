<?php

namespace App\Services\Excel;

class ImportSummary
{
    public function __construct(
        public readonly int $created,
        public readonly int $updated,
    ) {}
}
