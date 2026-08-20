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
            <div className="min-h-screen bg-slate-50/80 font-sans text-slate-900 antialiased flex flex-col">

                {/* Mobile Backdrop Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-xs lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <div className="flex flex-1 relative items-start">

                    {/* Fixed/Collapsible Sidebar Component */}
                    <AppSidebar
                        open={sidebarOpen}
                        onCollapse={() => setSidebarOpen(false)}
                    />

                    {/* Main Content Area: Full Height tanpa Topbar */}
                    <div className="flex-1 min-w-0 flex flex-col min-h-screen relative">

                        {/* Floating Toggle Button (Melayang hanya saat sidebar tertutup) */}
                        {!sidebarOpen && (
                            <button
                                type="button"
                                aria-label="Expand sidebar"
                                onClick={() => setSidebarOpen(true)}
                                className="fixed top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-600 shadow-md backdrop-blur-md transition-all hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}

                        {/* Page Body Viewport: Ditambahkan transisi padding kiri agar tombol tidak menabrak konten di layar desktop */}
                        <main className={`flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-200 ${!sidebarOpen ? 'lg:pl-16' : ''}`}>
                            <div className="mx-auto max-w-7xl">
                                {children}
                            </div>
                        </main>
                    </div>

                </div>
            </div>
        </>
    );
}
