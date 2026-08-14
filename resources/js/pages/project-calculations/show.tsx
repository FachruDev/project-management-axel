import { Link, router } from '@inertiajs/react';
import {
    index,
    lock as lockCalculation,
    unlock as unlockCalculation,
} from '@/actions/App/Http/Controllers/ProjectCalculationController';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/app-layout';
import type {
    ProjectCalculationDetail,
    ProjectCalculationShowProps,
    ProjectCalculationSummary,
} from '@/types';

export default function ProjectCalculationShow({
    calculation,
    actions,
}: ProjectCalculationShowProps) {
    function lockCurrent() {
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

    function unlockCurrent() {
        if (!window.confirm('Unlock this project calculation?')) {
            return;
        }

        router.patch(unlockCalculation.url(calculation.id), {}, { preserveScroll: true });
    }

    return (
        <AppLayout title={`Calculation - ${calculation.project.name}`}>
            <PageHeader
                eyebrow="Project Calculation"
                title={calculation.project.name}
                description={`${calculation.incentive_profile?.code ?? '-'} v${calculation.incentive_profile?.version ?? '-'} / ${calculation.project.customers.map((customer) => customer.name).join(', ') || 'No Customer'}`}
                actions={
                    <>
                        <Link
                            href={index.url()}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
                        >
                            Back
                        </Link>
                        {actions.can_lock && (
                            <button
                                type="button"
                                onClick={lockCurrent}
                                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                            >
                                Lock
                            </button>
                        )}
                        {actions.can_unlock && (
                            <button
                                type="button"
                                onClick={unlockCurrent}
                                className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                            >
                                Unlock
                            </button>
                        )}
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Metric label="Total Incentive" value={formatNumber(calculation.total_incentive)} />
                <Metric label="Base Score" value={formatNumber(calculation.base_score)} />
                <Metric
                    label="Delivery"
                    value={`${calculation.delivery_status} / x${formatNumber(calculation.delivery_multiplier)}`}
                />
                <Metric label="Lock Status" value={calculation.is_locked ? 'Locked' : 'Open'} />
            </section>

            <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                <Info label="Calculated At" value={calculation.calculated_at ?? '-'} />
                <Info label="Calculated By" value={calculation.calculated_by?.name ?? '-'} />
                <Info label="Locked At" value={calculation.locked_at ?? '-'} />
                <Info label="Locked By" value={calculation.locked_by?.name ?? '-'} />
                <Info label="PM" value={calculation.project.pm?.name ?? '-'} />
                <Info label="Project Date" value={calculation.project.project_date ?? '-'} />
                {calculation.lock_notes && (
                    <div className="md:col-span-2 lg:col-span-3">
                        <Info label="Lock Notes" value={calculation.lock_notes} />
                    </div>
                )}
            </section>

            <CalculationPools calculation={calculation} />

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-base font-semibold text-slate-950">
                        Employee Incentive Items
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Points</th>
                                <th className="px-4 py-3">Weight</th>
                                <th className="px-4 py-3">Base</th>
                                <th className="px-4 py-3">Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {calculation.items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-950">
                                            {item.employee_name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {item.employee?.email ?? '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div>{item.project_role}</div>
                                        <div className="text-xs text-slate-500">
                                            {item.pic_level ?? '-'} {item.is_support ? '/ Support' : ''}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {formatNumber(item.pic_points)} /{' '}
                                        {formatNumber(item.role_points)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {formatNumber(item.weight_points)}
                                        <div className="text-xs text-slate-500">
                                            {(Number(item.weight_ratio) * 100).toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {formatNumber(item.base_incentive)}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                        {formatNumber(item.final_incentive)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AppLayout>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
            <div className="mt-1 text-slate-800">{value}</div>
        </div>
    );
}

function CalculationPools({ calculation }: { calculation: ProjectCalculationSummary }) {
    return (
        <section className="grid gap-4 md:grid-cols-3">
            <Metric label="Support Pool" value={formatNumber(calculation.support_pool)} />
            <Metric label="Technical Pool" value={formatNumber(calculation.technical_pool)} />
            <Metric
                label="Difference Days"
                value={`${calculation.difference_days} day${calculation.difference_days === 1 ? '' : 's'}`}
            />
        </section>
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
