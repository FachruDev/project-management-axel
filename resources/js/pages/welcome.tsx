import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { index as projectApprovalsIndex } from '@/actions/App/Http/Controllers/ProjectApprovalController';
import { index as projectsIndex, show as projectShow } from '@/actions/App/Http/Controllers/ProjectController';
import projectPreparationsIndex from '@/actions/App/Http/Controllers/ProjectPreparationIndexController';
import tasksIndex from '@/actions/App/Http/Controllers/TaskBoardController';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { AppLayout } from '@/layouts/app-layout';
import type { DashboardProjectCard, DashboardProps } from '@/types';

const metricCards = [
    {
        key: 'active_projects',
        label: 'Active Projects',
        tone: 'border-blue-200 bg-pastel-blue text-primary',
        href: projectsIndex.url(),
    },
    {
        key: 'awaiting_approval',
        label: 'Awaiting Approval',
        tone: 'border-amber-200 bg-pastel-amber text-amber-800',
        href: projectApprovalsIndex.url(),
    },
    {
        key: 'overdue_tasks',
        label: 'Overdue Tasks',
        tone: 'border-red-200 bg-pastel-red text-red-700',
        href: tasksIndex.url({ query: { due: 'overdue' } }),
    },
    {
        key: 'due_this_week_tasks',
        label: 'Due This Week',
        tone: 'border-emerald-200 bg-pastel-green text-emerald-700',
        href: tasksIndex.url({ query: { due: 'week' } }),
    },
] as const;

export default function Welcome({
    metrics,
    project_status_distribution,
    task_status_distribution,
    recent_rejected_projects,
    ready_to_close_projects,
    scope,
}: DashboardProps) {
    return (
        <AppLayout title="Project Management">
            <PageHeader
                eyebrow="Operational Dashboard"
                title="Project Management"
                description={
                    scope === 'global'
                        ? 'Ringkasan seluruh project dan task.'
                        : 'Ringkasan project dan task yang terkait dengan user login.'
                }
                actions={
                    <Link
                        href={projectPreparationsIndex.url()}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        Project Preparation
                    </Link>
                }
            />

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((card) => (
                    <Link
                        key={card.key}
                        href={card.href}
                        className={`rounded-lg border p-4 transition hover:shadow-md ${card.tone}`}
                    >
                        <div className="text-xs font-semibold uppercase">
                            {card.label}
                        </div>
                        <div className="mt-3 text-3xl font-semibold">
                            {metrics[card.key]}
                        </div>
                    </Link>
                ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <Panel title="Project Status">
                    <DistributionList
                        items={project_status_distribution}
                        total={project_status_distribution.reduce(
                            (sum, item) => sum + item.count,
                            0,
                        )}
                    />
                </Panel>
                <Panel title="Task Status">
                    <DistributionList
                        items={task_status_distribution}
                        total={task_status_distribution.reduce(
                            (sum, item) => sum + item.count,
                            0,
                        )}
                    />
                </Panel>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <ProjectList
                    title="Ready To Close"
                    empty="No project ready to close."
                    projects={ready_to_close_projects}
                />
                <ProjectList
                    title="Recent Rejections"
                    empty="No recently rejected project."
                    projects={recent_rejected_projects}
                />
            </section>
        </AppLayout>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function DistributionList({
    items,
    total,
}: {
    items: Array<{ status: string; label: string; count: number }>;
    total: number;
}) {
    return (
        <div className="space-y-3">
            {items.map((item) => {
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

                return (
                    <div key={item.status}>
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">
                                {item.label}
                            </span>
                            <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ProjectList({
    title,
    empty,
    projects,
}: {
    title: string;
    empty: string;
    projects: DashboardProjectCard[];
}) {
    return (
        <Panel title={title}>
            <div className="space-y-3">
                {projects.map((project) => (
                    <Link
                        key={project.id}
                        href={projectShow.url(project.id)}
                        className="block rounded-lg border border-slate-200 p-4 transition hover:border-primary/30 hover:bg-pastel-blue"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="font-semibold text-slate-950">
                                    {project.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {project.customer ?? 'No customer'} / PM{' '}
                                    {project.pm ?? '-'}
                                </div>
                            </div>
                            <ProjectStatusBadge status={project.status} />
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            Plan end: {project.plan_end_date ?? '-'}
                        </div>
                    </Link>
                ))}
                {projects.length === 0 && (
                    <p className="rounded-lg bg-pastel-slate p-4 text-sm text-slate-500">
                        {empty}
                    </p>
                )}
            </div>
        </Panel>
    );
}
