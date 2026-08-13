<?php

namespace App\Services\Excel;

use App\Services\Excel\Contracts\ImportPreviewHandler;
use App\Services\Excel\ImportHandlers\CustomerImportPreviewHandler;
use App\Services\Excel\ImportHandlers\HolidayImportPreviewHandler;
use App\Services\Excel\ImportHandlers\ProjectPreparationImportPreviewHandler;
use App\Services\Excel\ImportHandlers\UserImportPreviewHandler;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

class ImportPreviewRegistry
{
    /**
     * @var array<string, class-string<ImportPreviewHandler>>
     */
    private array $handlers = [
        'customers' => CustomerImportPreviewHandler::class,
        'users' => UserImportPreviewHandler::class,
        'holidays' => HolidayImportPreviewHandler::class,
        'project-preparations' => ProjectPreparationImportPreviewHandler::class,
    ];

    public function __construct(private readonly Container $container) {}

    public function get(string $domain): ImportPreviewHandler
    {
        $handler = $this->handlers[$domain] ?? null;

        if ($handler === null) {
            throw new InvalidArgumentException("Unsupported import domain [{$domain}].");
        }

        return $this->container->make($handler);
    }

    /**
     * @return array<int, string>
     */
    public function domains(): array
    {
        return array_keys($this->handlers);
    }
}
