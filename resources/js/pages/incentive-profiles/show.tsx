import { Link, router, usePage } from '@inertiajs/react';
import {
    calculateProjects as calculateProjectsAction,
    destroy,
    edit,
    index,
    storeVersion,
    updateStatus,
} from '@/actions/App/Http/Controllers/IncentiveProfileController';
import { IncentiveCalculationSummaryAlert } from '@/components/incentive-calculation-summary-alert';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type {
    IncentiveCalculationSummary,
    IncentiveProfileDetail,
    IncentiveProfileStatus,
    StatusOption,
} from '@/types';

type Props = {
    profile: IncentiveProfileDetail;
    statuses: StatusOption[];
};

const statusClasses: Record<IncentiveProfileStatus, string> = {
    draft: 'border-zinc-300 bg-zinc-50 text-zinc-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    inactive: 'border-amber-200 bg-amber-50 text-amber-700',
    archived: 'border-slate-300 bg-slate-100 text-slate-700',
};

export default function IncentiveProfileShow({ profile }: Props) {
    const flash = usePage().props.flash as
        | {
              success?: string | null;
              calculation_summary?: IncentiveCalculationSummary | null;
          }
        | undefined;

    function changeStatus(status: IncentiveProfileStatus) {
        router.patch(updateStatus.url(profile.id), {
            status,
        });
    }

    function createVersion() {
        router.post(storeVersion.url(profile.id));
    }

    function deleteProfile() {
        if (!window.confirm('Delete this incentive profile?')) {
            return;
        }

        router.delete(destroy.url(profile.id));
    }

    function calculateProjects() {
        router.post(calculateProjectsAction.url(profile.id));
    }

    return (
        <AppLayout title={profile.name}>
            <PageHeader
                eyebrow={`${profile.code} / v${profile.version}`}
                title={profile.name}
                actions={
                    <>
                            <Link
                                href={index.url()}
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                            >
                                Back
                            </Link>
                            {profile.actions.can_edit && (
                                <Link
                                    href={edit.url(profile.id)}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                                >
                                    Edit
                                </Link>
                            )}
                            {profile.actions.can_activate && (
                                <button
                                    type="button"
                                    onClick={() => changeStatus('active')}
                                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                                >
                                    Activate
                                </button>
                            )}
                            {profile.actions.can_inactivate && (
                                <button
                                    type="button"
                                    onClick={() => changeStatus('inactive')}
                                    className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                                >
                                    Inactivate
                                </button>
                            )}
                            {profile.actions.can_archive && (
                                <button
                                    type="button"
                                    onClick={() => changeStatus('archived')}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                                >
                                    Archive
                                </button>
                            )}
                            {profile.actions.can_version && (
                                <button
                                    type="button"
                                    onClick={createVersion}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                                >
                                    New Version
                                </button>
                            )}
                            {profile.actions.can_calculate && (
                                <button
                                    type="button"
                                    onClick={calculateProjects}
                                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                                >
                                    Calculate Projects
                                </button>
                            )}
                            {profile.actions.can_delete && (
                                <button
                                    type="button"
                                    onClick={deleteProfile}
                                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                >
                                    Delete
                                </button>
                            )}
                    </>
                }
            />

                    <div>
                        <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[profile.status]}`}
                        >
                            {profile.status}
                        </span>
                    </div>

                    {flash?.success && (
                        <IncentiveCalculationSummaryAlert
                            message={flash.success}
                            summary={flash.calculation_summary}
                        />
                    )}

                    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Metric
                            label="Effective From"
                            value={profile.effective_from ?? '-'}
                        />
                        <Metric
                            label="Effective To"
                            value={profile.effective_to ?? 'Open'}
                        />
                        <Metric
                            label="Support Pool"
                            value={`${(Number(profile.support_percent) * 100).toFixed(2)}%`}
                        />
                        <Metric
                            label="Usage"
                            value={`${profile.usage_counts.projects} project / ${profile.usage_counts.calculations} calc`}
                        />
                    </section>

                    {profile.description && (
                        <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                            {profile.description}
                        </section>
                    )}

                    <RuleTable
                        title="Manday Score Rules"
                        headers={['Min', 'Max', 'Base Score']}
                        rows={profile.manday_rules.map((rule) => [
                            rule.min_mandays,
                            rule.max_mandays ?? 'Open',
                            rule.base_score,
                        ])}
                    />
                    <RuleTable
                        title="PIC Level Points"
                        headers={['Code', 'Name', 'Points']}
                        rows={profile.pic_level_rules.map((rule) => [
                            rule.level_code,
                            rule.level_name,
                            rule.points,
                        ])}
                    />
                    <RuleTable
                        title="Project Role Points"
                        headers={['Code', 'Name', 'Points', 'Support']}
                        rows={profile.project_role_rules.map((rule) => [
                            rule.role_code,
                            rule.role_name,
                            rule.points,
                            rule.is_support ? 'Yes' : 'No',
                        ])}
                    />
                    <RuleTable
                        title="Delivery Multiplier Rules"
                        headers={['Name', 'Min Days', 'Max Days', 'Multiplier']}
                        rows={profile.delivery_rules.map((rule) => [
                            rule.name,
                            rule.min_difference_days ?? 'Open',
                            rule.max_difference_days ?? 'Open',
                            rule.multiplier,
                        ])}
                    />
        </AppLayout>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {label}
            </div>
            <div className="mt-2 text-lg font-semibold">{value}</div>
        </div>
    );
}

function RuleTable({
    title,
    headers,
    rows,
}: {
    title: string;
    headers: string[];
    rows: Array<Array<string | number>>;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className="px-4 py-3">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={`${rowIndex}-${cellIndex}`}
                                        className="px-4 py-3"
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
