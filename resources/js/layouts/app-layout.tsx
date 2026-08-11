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
            <div className="min-h-screen bg-slate-50/80 text-slate-900 font-sans antialiased flex flex-col">

                {/* Mobile Backdrop Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-xs lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <div className="flex flex-1 relative items-start">

                    {/* Fixed Sidebar Component */}
                    <AppSidebar
                        open={sidebarOpen}
                        onCollapse={() => setSidebarOpen(false)}
                    />

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0 flex flex-col min-h-screen">

                        {/* Top Floating Toggle Header (visible when sidebar collapsed) */}
                        {!sidebarOpen && (
                            <div className="sticky top-0 z-20 flex h-14 items-center bg-white/80 backdrop-blur-md px-4 border-b border-slate-200/80">
                                <button
                                    type="button"
                                    aria-label="Expand sidebar"
                                    onClick={() => setSidebarOpen(true)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-primary transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Page Body Viewport */}
                        <main className="flex-1 p-4 sm:p-6 lg:p-8">
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
