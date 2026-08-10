import { Head, Link, usePage } from '@inertiajs/react';
import { index as incentiveProfilesIndex } from '@/actions/App/Http/Controllers/IncentiveProfileController';

export default function Welcome() {
    const { auth } = usePage().props;
    const canManageIncentiveProfiles =
        auth.user?.permissions.includes('manage_incentive_profiles') ?? false;

    return (
        <>
            <Head title="Project Management" />
            <main className="min-h-screen bg-zinc-100 text-zinc-950">
                <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                    <header className="border-b border-zinc-200 pb-6">
                        <p className="text-sm font-medium text-zinc-500">
                            Gate Apps
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold">
                            Project Management
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                            Internal workspace untuk project lifecycle, SLA, dan
                            incentive.
                        </p>
                    </header>

                    <section className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 bg-white p-5">
                            <h2 className="text-lg font-semibold">
                                Incentive Master
                            </h2>
                            <p className="mt-2 text-sm text-zinc-600">
                                Kelola profile, manday score, PIC level, project
                                role, dan delivery multiplier.
                            </p>
                            {canManageIncentiveProfiles ? (
                                <Link
                                    href={incentiveProfilesIndex.url()}
                                    className="mt-4 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                                >
                                    Open Incentive Profiles
                                </Link>
                            ) : (
                                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                                    Permission manage_incentive_profiles is
                                    required.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
