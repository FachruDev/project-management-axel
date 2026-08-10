import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';

type Props = {
    title: string;
    children: ReactNode;
};

export function AppLayout({ title, children }: Props) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-slate-50 text-slate-900">
                {!sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Expand sidebar"
                        onClick={() => setSidebarOpen(true)}
                        className="fixed top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <span aria-hidden="true">☰</span>
                    </button>
                )}

                <div className="flex min-h-screen">
                    <AppSidebar
                        open={sidebarOpen}
                        onCollapse={() => setSidebarOpen(false)}
                    />

                    <main className="min-w-0 flex-1">
                        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
