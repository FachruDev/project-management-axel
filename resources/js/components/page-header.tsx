import type { ReactNode } from 'react';

type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: Props) {
    return (
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
                {eyebrow && (
                    <p className="text-sm font-medium text-slate-500">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
        </header>
    );
}
