import {
    DndContext,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

type KanbanBoardProps = {
    children: ReactNode;
    onDropItem?: (itemId: string, laneId: string) => void;
};

type KanbanLaneProps = {
    id?: string;
    title: string;
    count: number;
    tone?: string;
    children: ReactNode;
};

type KanbanCardProps = {
    children: ReactNode;
};

type DraggableKanbanCardProps = KanbanCardProps & {
    id: string;
    selected?: boolean;
};

export function KanbanBoard({ children, onDropItem }: KanbanBoardProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
    );

    function handleDragEnd(event: DragEndEvent) {
        if (!event.over || !onDropItem) {
            return;
        }

        onDropItem(String(event.active.id), String(event.over.id));
    }

    const board = (
        <section className="flex gap-5 overflow-x-auto pb-4 pt-2">
            {children}
        </section>
    );

    if (!onDropItem) {
        return board;
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {board}
        </DndContext>
    );
}

export function KanbanLane({
    id,
    title,
    count,
    tone = 'border-slate-200 bg-slate-100/50 text-slate-700',
    children,
}: KanbanLaneProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: id ?? title,
    });

    return (
        <div
            ref={setNodeRef}
            // Hapus overflow-hidden agar card tidak terpotong saat didrag antar kolom
            className={`flex min-h-[560px] w-[340px] shrink-0 flex-col rounded-xl border bg-slate-50/60 transition-colors duration-200 ${
                isOver
                    ? 'border-primary/60 bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)] ring-1 ring-primary/30'
                    : 'border-slate-200/80'
            }`}
        >
            {/* Header Kolom */}
            <div className={`rounded-t-xl border-b px-4 py-3 ${tone}`}>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider">{title}</h2>
                    <span className="flex h-5 items-center justify-center rounded-full bg-white/80 px-2 text-[10px] font-bold shadow-xs">
                        {count}
                    </span>
                </div>
            </div>

            {/* Area Drop Card */}
            <div className="flex flex-1 flex-col gap-3 p-3">
                {children}
            </div>
        </div>
    );
}

export function KanbanCard({ children }: KanbanCardProps) {
    return (
        <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-md">
            {children}
        </article>
    );
}

export function DraggableKanbanCard({
    id,
    selected = false,
    children,
}: DraggableKanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
    });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: isDragging ? 9999 : 1,
              position: 'relative' as const,
          }
        : undefined;

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={`group relative rounded-xl border bg-white p-3.5 outline-none transition-all duration-200 ${
                selected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/80 hover:border-slate-300'
            } ${
                isDragging
                    ? 'scale-[1.02] opacity-90 shadow-2xl ring-2 ring-primary/40'
                    : 'hover:shadow-md'
            }`}
        >
            <button
                type="button"
                title="Drag card"
                aria-label="Drag card"
                {...attributes}
                {...listeners}
                className={`absolute left-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:bg-slate-100 focus:text-slate-700 focus:outline-none ${
                    isDragging ? 'cursor-grabbing text-slate-700' : 'cursor-grab'
                }`}
            >
                <GripVertical className="h-4 w-4" />
            </button>

            {children}
        </article>
    );
}
