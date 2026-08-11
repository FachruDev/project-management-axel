import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
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
        if (! event.over || ! onDropItem) {
            return;
        }

        onDropItem(String(event.active.id), String(event.over.id));
    }

    const board = (
        <section className="flex gap-4 overflow-x-auto pb-3">
            {children}
        </section>
    );

    if (! onDropItem) {
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
    tone = 'border-slate-200 bg-pastel-slate text-slate-700',
    children,
}: KanbanLaneProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: id ?? title,
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex min-h-[560px] w-[340px] shrink-0 flex-col overflow-hidden rounded-lg border bg-slate-50/80 transition ${
                isOver
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-slate-200'
            }`}
        >
            <div className={`border-b px-4 py-3 ${tone}`}>
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
          }
        : undefined;

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={`relative rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md ${
                selected ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200'
            } ${
                isDragging ? 'z-10 opacity-80 shadow-lg' : ''
            }`}
        >
            <button
                type="button"
                aria-label="Drag card"
                className="absolute right-2 top-2 flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-primary active:cursor-grabbing"
                {...listeners}
                {...attributes}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            {children}
        </article>
    );
}
