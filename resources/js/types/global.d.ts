import type { Auth } from '@/types/auth';
import type { IncentiveCalculationSummary } from '@/types/incentive-profile';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            embed: {
                prefix: string;
            };
            flash: {
                success: string | null;
                calculation_summary: IncentiveCalculationSummary | null;
            };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
