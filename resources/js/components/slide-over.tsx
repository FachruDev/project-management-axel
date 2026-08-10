import type { ReactNode } from 'react';

type Props = {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
};

export function SlideOver({ open, title, children, onClose }: Props) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-40 bg-slate-950/40">
            <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-950">
                        {title}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close panel"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
            </div>
        </div>
    );
}
