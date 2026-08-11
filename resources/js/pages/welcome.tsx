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
        tone: 'border-blue-200/80 bg-pastel-blue text-primary hover:border-blue-300',
        badgeBg: 'bg-blue-100/60 text-primary',
        href: projectsIndex.url(),
    },
    {
        key: 'awaiting_approval',
        label: 'Awaiting Approval',
        tone: 'border-amber-200/80 bg-pastel-amber text-amber-800 hover:border-amber-300',
        badgeBg: 'bg-amber-100/60 text-amber-900',
        href: projectApprovalsIndex.url(),
    },
    {
        key: 'overdue_tasks',
        label: 'Overdue Tasks',
        tone: 'border-red-200/80 bg-pastel-red text-red-700 hover:border-red-300',
        badgeBg: 'bg-red-100/60 text-red-800',
        href: tasksIndex.url({ query: { due: 'overdue' } }),
    },
    {
        key: 'due_this_week_tasks',
        label: 'Due This Week',
        tone: 'border-emerald-200/80 bg-pastel-green text-emerald-700 hover:border-emerald-300',
        badgeBg: 'bg-emerald-100/60 text-emerald-800',
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
            <div className="space-y-6">
                {/* Header Section */}
                <PageHeader
                    eyebrow="Operational Dashboard"
                    title="Project Management"
                    description={
                        scope === 'global'
                            ? 'Ringkasan seluruh project dan task secara menyeluruh.'
                            : 'Ringkasan project dan task yang terkait dengan akun Anda.'
                    }
                    actions={
                        <Link
                            href={projectPreparationsIndex.url()}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Project Preparation</span>
                        </Link>
                    }
                />

                {/* Key Metrics Grid */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metricCards.map((card) => (
                        <Link
                            key={card.key}
                            href={card.href}
                            className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                                        {card.label}
                                    </span>
                                    <span className={`rounded-full p-1.5 transition-transform group-hover:translate-x-0.5 ${card.badgeBg}`}>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="mt-4 text-3xl font-extrabold tracking-tight">
                                    {metrics[card.key]}
                                </div>
                            </div>
                            <div className="mt-3 text-[11px] font-medium opacity-75">
                                Klik untuk melihat detail &rarr;
                            </div>
                        </Link>
                    ))}
                </section>

                {/* Progress / Distribution Section */}
                <section className="grid gap-6 xl:grid-cols-2">
                    <Panel title="Project Status Distribution">
                        <DistributionList
                            items={project_status_distribution}
                            total={project_status_distribution.reduce(
                                (sum, item) => sum + item.count,
                                0,
                            )}
                        />
                    </Panel>
                    <Panel title="Task Status Distribution">
                        <DistributionList
                            items={task_status_distribution}
                            total={task_status_distribution.reduce(
                                (sum, item) => sum + item.count,
                                0,
                            )}
                        />
                    </Panel>
                </section>

                {/* Project Lists Grid */}
                <section className="grid gap-6 xl:grid-cols-2">
                    <ProjectList
                        title="Ready To Close"
                        empty="No project ready to close at the moment."
                        projects={ready_to_close_projects}
                    />
                    <ProjectList
                        title="Recent Rejections"
                        empty="No recently rejected projects."
                        projects={recent_rejected_projects}
                    />
                </section>
            </div>
        </AppLayout>
    );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 border-b border-slate-100 pb-3">
                {title}
            </h2>
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
    if (items.length === 0) {
        return (
            <p className="py-4 text-center text-xs text-slate-400">
                Tidak ada data distribusi status.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item) => {
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

                return (
                    <div key={item.status} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">
                                {item.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-900 font-bold">{item.count}</span>
                                <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
                            </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
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
                        className="group block rounded-xl border border-slate-200/70 bg-white p-4 transition-all duration-200 hover:border-primary/40 hover:bg-pastel-blue/40 hover:shadow-xs"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1 max-w-[70%]">
                                <div className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                                    {project.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                        {project.customer ?? 'No Customer'}
                                    </span>
                                    <span>•</span>
                                    <span>PM: <strong className="text-slate-700">{project.pm ?? '-'}</strong></span>
                                </div>
                            </div>
                            <ProjectStatusBadge status={project.status} />
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Plan End: <strong className="text-slate-600">{project.plan_end_date ?? '-'}</strong></span>
                            </div>
                            <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Detail &rarr;
                            </span>
                        </div>
                    </Link>
                ))}

                {projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl bg-pastel-slate/60 p-6 text-center border border-dashed border-slate-200">
                        <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-xs font-medium text-slate-500">
                            {empty}
                        </p>
                    </div>
                )}
            </div>
        </Panel>
    );
}
