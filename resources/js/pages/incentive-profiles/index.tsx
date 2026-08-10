import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    create,
    edit,
    index,
    show,
} from '@/actions/App/Http/Controllers/IncentiveProfileController';
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
    draft: 'border-zinc-300 bg-zinc-50 text-zinc-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    inactive: 'border-amber-200 bg-amber-50 text-amber-700',
    archived: 'border-slate-300 bg-slate-100 text-slate-700',
};

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
        <>
            <Head title="Incentive Profiles" />
            <main className="min-h-screen bg-zinc-100 text-zinc-950">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-500">
                                Master Data
                            </p>
                            <h1 className="text-2xl font-semibold">
                                Incentive Profiles
                            </h1>
                        </div>
                        <Link
                            href={create.url()}
                            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                        >
                            New Profile
                        </Link>
                    </header>

                    <form
                        onSubmit={submitFilters}
                        className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]"
                    >
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search code or name"
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-700"
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-700"
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
                            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                        >
                            Apply
                        </button>
                    </form>

                    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200 text-sm">
                                <thead className="bg-zinc-50 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Profile</th>
                                        <th className="px-4 py-3">Version</th>
                                        <th className="px-4 py-3">Effective</th>
                                        <th className="px-4 py-3">Support</th>
                                        <th className="px-4 py-3">Rules</th>
                                        <th className="px-4 py-3">Usage</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {profiles.data.map((profile) => (
                                        <tr
                                            key={profile.id}
                                            className="hover:bg-zinc-50"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={show.url(profile.id)}
                                                    className="font-medium text-zinc-950 hover:underline"
                                                >
                                                    {profile.name}
                                                </Link>
                                                <div className="text-xs text-zinc-500">
                                                    {profile.code}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                v{profile.version}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600">
                                                {profile.effective_from}
                                                {profile.effective_to
                                                    ? ` - ${profile.effective_to}`
                                                    : ' - open'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {formatPercent(
                                                    profile.support_percent,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600">
                                                {profile.rule_counts.manday}/
                                                {profile.rule_counts.pic_level}/
                                                {
                                                    profile.rule_counts
                                                        .project_role
                                                }
                                                /{profile.rule_counts.delivery}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600">
                                                {profile.usage_counts.projects}{' '}
                                                project,{' '}
                                                {
                                                    profile.usage_counts
                                                        .calculations
                                                }{' '}
                                                calc
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
                                                    {profile.actions
                                                        .can_edit && (
                                                        <Link
                                                            href={edit.url(
                                                                profile.id,
                                                            )}
                                                            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
                                                        >
                                                            Edit
                                                        </Link>
                                                    )}
                                                    <Link
                                                        href={show.url(
                                                            profile.id,
                                                        )}
                                                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
                                                    >
                                                        View
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {profiles.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-12 text-center text-sm text-zinc-500"
                                            >
                                                No incentive profiles found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {profiles.links.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm">
                                <div className="text-zinc-500">
                                    {profiles.from ?? 0}-{profiles.to ?? 0} of{' '}
                                    {profiles.total ?? profiles.data.length}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profiles.links.map((link, indexKey) =>
                                        link.url ? (
                                            <Link
                                                key={`${link.label}-${indexKey}`}
                                                href={link.url}
                                                preserveScroll
                                                className={`rounded-md border px-3 py-1.5 ${
                                                    link.active
                                                        ? 'border-zinc-900 bg-zinc-900 text-white'
                                                        : 'border-zinc-300 hover:bg-zinc-50'
                                                }`}
                                            >
                                                {cleanLabel(link.label)}
                                            </Link>
                                        ) : (
                                            <span
                                                key={`${link.label}-${indexKey}`}
                                                className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-400"
                                            >
                                                {cleanLabel(link.label)}
                                            </span>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

function formatPercent(value: string) {
    return `${(Number(value) * 100).toFixed(2)}%`;
}

function cleanLabel(label: string) {
    return label
        .replace('&laquo;', '<')
        .replace('&raquo;', '>')
        .replace('&amp;', '&');
}
