import type { IncentiveCalculationSummary } from '@/types';

type Props = {
    message: string;
    summary?: IncentiveCalculationSummary | null;
};

export function IncentiveCalculationSummaryAlert({ message, summary }: Props) {
    const skippedProjects = summary?.skipped_projects ?? [];
    const hasSkippedProjects = skippedProjects.length > 0;

    return (
        <section
            className={`rounded-lg border px-4 py-3 text-sm ${
                hasSkippedProjects
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
        >
            <div className="font-medium">{message}</div>
            {summary && (
                <div
                    className={
                        hasSkippedProjects
                            ? 'mt-1 text-amber-800'
                            : 'mt-1 text-emerald-700'
                    }
                >
                    Calculated {summary.calculated} project, skipped {summary.skipped}.
                </div>
            )}
            {hasSkippedProjects && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
                    {skippedProjects.map((project) => (
                        <li key={project.project_id}>
                            <span className="font-medium">
                                {project.project_name ?? `Project #${project.project_id}`}
                            </span>
                            : {project.reason}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
