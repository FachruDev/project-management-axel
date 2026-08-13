import { AlertCircle, LockKeyhole } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const inputClass =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:border-slate-300';

export const fileInputClass =
    'block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary transition-all hover:file:bg-primary/20 cursor-pointer';

export function Panel({
    title,
    action,
    icon: Icon,
    children,
}: {
    title: string;
    action?: ReactNode;
    icon?: LucideIcon;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-primary" />}
                    <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function LockedSection({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-xs">
                    <LockKeyhole className="h-4 w-4" />
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-800">{title}</div>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
        </section>
    );
}

export function Field({
    label,
    error,
    children,
    required = false,
}: {
    label: string;
    error?: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            {children}
            {error && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </span>
            )}
        </label>
    );
}

export function Alert({
    tone,
    children,
}: {
    tone: 'success' | 'danger';
    children: ReactNode;
}) {
    return (
        <div
            className={`rounded-xl border px-4 py-3 text-xs font-semibold shadow-xs ${
                tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            {children}
        </div>
    );
}
