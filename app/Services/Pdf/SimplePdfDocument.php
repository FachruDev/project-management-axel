<?php

namespace App\Services\Pdf;

use Illuminate\Support\Str;

class SimplePdfDocument
{
    private const PAGE_WIDTH = 595;

    private const PAGE_HEIGHT = 842;

    private const MARGIN = 40;

    /**
     * @var array<int, array<int, string>>
     */
    private array $pages = [[]];

    private int $currentPage = 0;

    private float $y = 802;

    public function title(string $title, ?string $subtitle = null): void
    {
        $this->text(self::MARGIN, $this->y, $title, 'F1', 18);
        $this->y -= 22;

        if ($subtitle !== null) {
            $this->paragraph($subtitle, 10);
        }

        $this->y -= 8;
    }

    public function heading(string $text): void
    {
        $this->ensureSpace(34);
        $this->y -= 6;
        $this->text(self::MARGIN, $this->y, $text, 'F1', 13);
        $this->y -= 18;
    }

    public function paragraph(string $text, int $size = 9): void
    {
        foreach ($this->wrap($text, $size) as $line) {
            $this->line($line, $size);
        }
    }

    /**
     * @param  array<int, string>  $items
     */
    public function bullets(array $items): void
    {
        foreach ($items as $item) {
            foreach ($this->wrap($item, 9, 96) as $index => $line) {
                $prefix = $index === 0 ? '- ' : '  ';
                $this->line($prefix.$line, 9);
            }
        }
    }

    /**
     * @param  array<int, string>  $headings
     * @param  array<int, array<int, mixed>>  $rows
     */
    public function table(array $headings, array $rows, int $limit = 25): void
    {
        $this->line(implode(' | ', $headings), 8, 'F2');
        $this->line(str_repeat('-', 100), 8, 'F2');

        foreach (array_slice($rows, 0, $limit) as $row) {
            $this->line(implode(' | ', array_map(fn (mixed $value): string => $this->cell($value), $row)), 8, 'F2');
        }

        if (count($rows) > $limit) {
            $this->line('... '.(count($rows) - $limit).' more rows not shown in this guide.', 8, 'F2');
        }

        $this->y -= 6;
    }

    public function line(string $text, int $size = 9, string $font = 'F1'): void
    {
        $this->ensureSpace($size + 5);
        $this->text(self::MARGIN, $this->y, $text, $font, $size);
        $this->y -= $size + 4;
    }

    public function output(): string
    {
        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
        ];

        $pageReferences = [];
        $objectId = 5;

        foreach ($this->pages as $page) {
            $pageObjectId = $objectId++;
            $contentObjectId = $objectId++;
            $content = implode("\n", $page);
            $objects[$pageObjectId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '.self::PAGE_WIDTH.' '.self::PAGE_HEIGHT.'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '.$contentObjectId.' 0 R >>';
            $objects[$contentObjectId] = '<< /Length '.strlen($content)." >>\nstream\n".$content."\nendstream";
            $pageReferences[] = $pageObjectId.' 0 R';
        }

        $objects[2] = '<< /Type /Pages /Kids ['.implode(' ', $pageReferences).'] /Count '.count($pageReferences).' >>';
        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [0 => 0];

        foreach ($objects as $id => $object) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";

        for ($id = 1; $id <= count($objects); $id++) {
            $pdf .= str_pad((string) $offsets[$id], 10, '0', STR_PAD_LEFT)." 00000 n \n";
        }

        return $pdf."trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";
    }

    private function text(float $x, float $y, string $text, string $font, int $size): void
    {
        $this->pages[$this->currentPage][] = 'BT /'.$font.' '.$size.' Tf '.number_format($x, 2, '.', '').' '.number_format($y, 2, '.', '').' Td ('.$this->escape($text).') Tj ET';
    }

    private function ensureSpace(float $height): void
    {
        if ($this->y - $height >= self::MARGIN) {
            return;
        }

        $this->pages[] = [];
        $this->currentPage++;
        $this->y = 802;
    }

    /**
     * @return array<int, string>
     */
    private function wrap(string $text, int $size, int $maxChars = 110): array
    {
        $width = max(54, (int) floor($maxChars * (9 / $size)));

        return explode("\n", wordwrap($this->ascii($text), $width, "\n", true));
    }

    private function cell(mixed $value): string
    {
        return Str::limit($this->ascii((string) $value), 28, '...');
    }

    private function escape(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\(', '\)'], $this->ascii($text));
    }

    private function ascii(string $text): string
    {
        return trim(Str::ascii($text));
    }
}
