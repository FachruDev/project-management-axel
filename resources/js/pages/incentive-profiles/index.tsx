import { Link, router } from '@inertiajs/react';
import { Eye, SquarePen, CirclePlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    create,
    edit,
    index,
    show,
} from '@/actions/App/Http/Controllers/IncentiveProfileController';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { AppLayout } from '@/layouts/app-layout';
import type {
    IncentiveProfileStatus,
    IncentiveProfileSummary,
    Paginated,
    StatusOption,
} from '@/types';

type Props = {
    profiles: Paginated<IncentiveProfileSummary>;
    filters: {
        search: string;
        status: string;
    };
    statuses: StatusOption[];
};

const statusClasses: Record<IncentiveProfileStatus, string> = {
    draft: 'border-slate-300 bg-slate-50 text-slate-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    inactive: 'border-amber-200 bg-amber-50 text-amber-700',
    archived: 'border-slate-300 bg-slate-100 text-slate-700',
};

const inputClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700';

export default function IncentiveProfileIndex({
    profiles,
    filters,
    statuses,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            index.url({
                query: {
                    search,
                    status,
                },
            }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }

    return (
        <AppLayout title="Incentive Profiles">
            <PageHeader
                eyebrow="Master Data"
                title="Incentive Profiles"
                actions={
                    <Link
                        href={create.url()}
                        className="rounded-md gap-2 inline-flex bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        <CirclePlus className="size-5" /> New Profile
                    </Link>
                }
            />

            <form
                onSubmit={submitFilters}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]"
            >
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code or name"
                    className={inputClass}
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                >
                    <option value="">All Status</option>
                    {statuses.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
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
                            <tr className="text-center">
                                <th className="px-4 py-3">Profile</th>
                                <th className="px-4 py-3">Version</th>
                                <th className="px-4 py-3">Effective</th>
                                <th className="px-4 py-3">Support</th>
                                <th className="px-4 py-3">Rules</th>
                                <th className="px-4 py-3">Usage</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {profiles.data.map((profile) => (
                                <tr key={profile.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={show.url(profile.id)}
                                            className="font-medium text-slate-950 hover:underline"
                                        >
                                            {profile.name}
                                        </Link>
                                        <div className="text-xs text-slate-500">
                                            {profile.code}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">v{profile.version}</td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {profile.effective_from}
                                        {profile.effective_to
                                            ? ` - ${profile.effective_to}`
                                            : ' - open'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {formatPercent(profile.support_percent)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {profile.rule_counts.manday}/
                                        {profile.rule_counts.pic_level}/
                                        {profile.rule_counts.project_role}/
                                        {profile.rule_counts.delivery}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {profile.usage_counts.projects} project,{' '}
                                        {profile.usage_counts.calculations} calc
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[profile.status]}`}
                                        >
                                            {profile.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {profile.actions.can_edit && (
                                                <Link
                                                    href={edit.url(profile.id)}
                                                    className="rounded-md border gap-2 inline-flex border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                                >
                                                    <SquarePen className="size-4" /> Edit
                                                </Link>
                                            )}
                                            <Link
                                                href={show.url(profile.id)}
                                                className="rounded-md border gap-2 inline-flex border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                                            >
                                                <Eye className="size-4" /> View
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {profiles.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        No incentive profiles found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={profiles} />
            </section>
        </AppLayout>
    );
}

function formatPercent(value: string) {
    return `${(Number(value) * 100).toFixed(2)}%`;
}
