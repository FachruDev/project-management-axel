import type { Auth } from '@/types/auth';
import type { IncentiveCalculationSummary } from '@/types/incentive-profile';
import type { ProjectReminderSummary } from '@/types/project';

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
            project_reminders: ProjectReminderSummary;
            flash: {
                success: string | null;
                excel_error_title: string | null;
                excel_errors: string[] | null;
                calculation_summary: IncentiveCalculationSummary | null;
            };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
