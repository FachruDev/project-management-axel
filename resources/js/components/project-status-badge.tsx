import type { ProjectStatus } from '@/types';

const statusTone: Record<ProjectStatus, string> = {
    draft: 'border-slate-200 bg-pastel-slate text-slate-700',
    pending_approval: 'border-amber-200 bg-pastel-amber text-amber-800',
    rejected: 'border-red-200 bg-pastel-red text-red-700',
    planning: 'border-blue-200 bg-pastel-blue text-primary',
    ongoing: 'border-emerald-200 bg-pastel-green text-emerald-700',
    awaiting_bast: 'border-purple-200 bg-pastel-purple text-purple-700',
    ready_to_close: 'border-blue-200 bg-pastel-blue text-primary',
    closed: 'border-slate-300 bg-white text-slate-700',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
    return (
        <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${statusTone[status]}`}
        >
            {status.replaceAll('_', ' ')}
        </span>
    );
}
