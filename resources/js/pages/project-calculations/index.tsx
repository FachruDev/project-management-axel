import { Link, router, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    index,
    lock as lockCalculation,
    recalculate,
    show,
    unlock as unlockCalculation,
} from '@/actions/App/Http/Controllers/ProjectCalculationController';
import { IncentiveCalculationSummaryAlert } from '@/components/incentive-calculation-summary-alert';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type {
    IncentiveCalculationSummary,
    ProjectCalculationIndexProps,
    ProjectCalculationProject,
    ProjectCalculationSummary,
} from '@/types';

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function ProjectCalculationIndex({
    projects,
    filters,
    options,
    actions,
}: ProjectCalculationIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [incentiveProfileId, setIncentiveProfileId] = useState(
        filters.incentive_profile_id ?? '',
    );
    const [lockStatus, setLockStatus] = useState(filters.lock_status ?? '');
    const [recalculateProfileId, setRecalculateProfileId] = useState(
        filters.incentive_profile_id || String(options.incentive_profiles[0]?.id ?? ''),
    );
    const flash = usePage().props.flash as
        | {
              success?: string | null;
              calculation_summary?: IncentiveCalculationSummary | null;
          }
        | undefined;
    const errors = usePage().props.errors as Record<string, string> | undefined;

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    incentive_profile_id: incentiveProfileId,
                    lock_status: lockStatus,
                },
            }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function recalculateSelectedProfile() {
        if (!recalculateProfileId) {
            return;
        }

        if (!window.confirm('Recalculate unlocked projects for this incentive profile?')) {
            return;
        }

        router.post(recalculate.url(Number(recalculateProfileId)), {}, { preserveScroll: true });
    }

    function lockRow(calculation: ProjectCalculationSummary) {
        const lockNotes = window.prompt('Lock notes (optional)');

        if (lockNotes === null) {
            return;
        }

        router.patch(
            lockCalculation.url(calculation.id),
            {
                lock_notes: lockNotes,
            },
            { preserveScroll: true },
        );
    }

    function unlockRow(calculation: ProjectCalculationSummary) {
        if (!window.confirm('Unlock this project calculation?')) {
            return;
        }

        router.patch(unlockCalculation.url(calculation.id), {}, { preserveScroll: true });
    }

    return (
        <AppLayout title="Project Calculations">
            <PageHeader
                eyebrow="Incentive"
                title="Project Calculations"
                actions={
                    actions.can_recalculate && (
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={recalculateProfileId}
                                onChange={(event) =>
                                    setRecalculateProfileId(event.target.value)
                                }
                                className={inputClass}
                            >
                                {options.incentive_profiles.map((profile) => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.code} v{profile.version}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={recalculateSelectedProfile}
                                disabled={!recalculateProfileId}
                                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
                            >
                                Recalculate Profile
                            </button>
                        </div>
                    )
                }
            />

            {flash?.success && (
                <IncentiveCalculationSummaryAlert
                    message={flash.success}
                    summary={flash.calculation_summary}
                />
            )}
            {errors?.calculation && (
                <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.calculation}
                </section>
            )}

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_220px_180px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search project, customer, PM"
                    className={inputClass}
                />
                <select
                    value={incentiveProfileId}
                    onChange={(event) => setIncentiveProfileId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Profiles</option>
                    {options.incentive_profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                            {profile.code} v{profile.version}
                        </option>
                    ))}
                </select>
                <select
                    value={lockStatus}
                    onChange={(event) => setLockStatus(event.target.value)}
                    className={inputClass}
                >
                    {options.lock_statuses.map((status) => (
                        <option key={status.value || 'all'} value={status.value}>
                            {status.label}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                    Apply
                </button>
            </form>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Profile</th>
                                <th className="px-4 py-3">Calculation</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {projects.data.map((project) => (
                                <ProjectRow
                                    key={project.id}
                                    project={project}
                                    onLock={lockRow}
                                    onUnlock={unlockRow}
                                />
                            ))}
                            {projects.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No project calculations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={projects} />
            </section>
        </AppLayout>
    );
}

function ProjectRow({
    project,
    onLock,
    onUnlock,
}: {
    project: ProjectCalculationProject;
    onLock: (calculation: ProjectCalculationSummary) => void;
    onUnlock: (calculation: ProjectCalculationSummary) => void;
}) {
    const calculation = project.calculation;

    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3">
                <div className="font-medium text-slate-950">{project.name}</div>
                <div className="text-xs text-slate-500">
                    {project.customers.map((customer) => customer.name).join(', ') || '-'} /{' '}
                    {project.pm?.name ?? 'No PM'}
                </div>
            </td>
            <td className="px-4 py-3 text-slate-600">
                {project.incentive_profile
                    ? `${project.incentive_profile.code} v${project.incentive_profile.version}`
                    : '-'}
                <div className="text-xs text-slate-500">{project.mandays} mandays</div>
            </td>
            <td className="px-4 py-3 text-slate-600">
                {calculation ? (
                    <>
                        <div>{calculation.calculated_at ?? '-'}</div>
                        <div className="text-xs text-slate-500">
                            {calculation.delivery_status} / x
                            {formatNumber(calculation.delivery_multiplier)}
                        </div>
                    </>
                ) : (
                    <span className="text-slate-400">Not calculated</span>
                )}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-900">
                {calculation ? formatNumber(calculation.total_incentive) : '-'}
            </td>
            <td className="px-4 py-3">
                <CalculationStatus calculation={calculation} />
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                    {calculation && project.actions.can_view && (
                        <Link
                            href={show.url(calculation.id)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                            Detail
                        </Link>
                    )}
                    {calculation && project.actions.can_lock && (
                        <button
                            type="button"
                            onClick={() => onLock(calculation)}
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                        >
                            Lock
                        </button>
                    )}
                    {calculation && project.actions.can_unlock && (
                        <button
                            type="button"
                            onClick={() => onUnlock(calculation)}
                            className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                            Unlock
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

function CalculationStatus({
    calculation,
}: {
    calculation: ProjectCalculationSummary | null;
}) {
    if (!calculation) {
        return (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                not calculated
            </span>
        );
    }

    if (calculation.is_locked) {
        return (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                locked
            </span>
        );
    }

    return (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            open
        </span>
    );
}

function formatNumber(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value));
}
