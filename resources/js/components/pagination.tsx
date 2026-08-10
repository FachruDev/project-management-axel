import { Link } from '@inertiajs/react';
import type { Paginated } from '@/types';

type Props<T> = {
    data: Paginated<T>;
};

export function Pagination<T>({ data }: Props<T>) {
    if (data.links.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">
                {data.from ?? 0}-{data.to ?? 0} of {data.total ?? data.data.length}
            </div>
            <div className="flex flex-wrap gap-2">
                {data.links.map((link, indexKey) =>
                    link.url ? (
                        <Link
                            key={`${link.label}-${indexKey}`}
                            href={link.url}
                            preserveScroll
                            className={`rounded-md border px-3 py-1.5 ${
                                link.active
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            {cleanLabel(link.label)}
                        </Link>
                    ) : (
                        <span
                            key={`${link.label}-${indexKey}`}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400"
                        >
                            {cleanLabel(link.label)}
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}

function cleanLabel(label: string) {
    return label
        .replace('&laquo;', '<')
        .replace('&raquo;', '>')
        .replace('&amp;', '&');
}
