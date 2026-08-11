import type { ReactNode } from 'react';

type KanbanBoardProps = {
    children: ReactNode;
};

type KanbanLaneProps = {
    title: string;
    count: number;
    tone?: string;
    children: ReactNode;
};

type KanbanCardProps = {
    children: ReactNode;
};

export function KanbanBoard({ children }: KanbanBoardProps) {
    return (
        <section className="flex gap-4 overflow-x-auto pb-2">
            {children}
        </section>
    );
}

export function KanbanLane({
    title,
    count,
    tone = 'border-slate-200 bg-pastel-slate text-slate-700',
    children,
}: KanbanLaneProps) {
    return (
        <div className="flex min-h-[520px] w-[320px] shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50">
            <div className={`rounded-t-lg border-b px-4 py-3 ${tone}`}>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <span className="rounded-full bg-white/75 px-2 py-0.5 text-xs font-semibold">
                        {count}
                    </span>
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-3">{children}</div>
        </div>
    );
}

export function KanbanCard({ children }: KanbanCardProps) {
    return (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md">
            {children}
        </article>
    );
}
