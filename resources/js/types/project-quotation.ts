import type { Paginated } from './incentive-profile';
import type { UserOption } from './project';

export type ProjectQuotationType = 'PRJ' | 'MNT';

export type ProjectQuotationStatus = 'quotation' | 'invoiced' | 'paid';

export type ProjectQuotationOption = {
    value: string;
    label: string;
};

export type ProjectQuotationTypeOption = ProjectQuotationOption & {
    category: string;
};

export type ProjectQuotationProjectOption = {
    id: number;
    name: string;
    project_date: string | null;
    customer_name: string | null;
    customer_address: string | null;
    customer_identifier: string | null;
    customers: Array<{
        id: number;
        name: string;
        email: string | null;
        company_name: string | null;
        company_address: string | null;
        is_primary: boolean;
    }>;
};

export type ProjectQuotationItemForm = {
    unit: string;
    description: string;
    qty: string | number | null;
    unit_price: string | number | null;
    discount: string | number | null;
    amount: string | number | null;
};

export type ProjectQuotationFormPayload = {
    id: number | null;
    quotation_no: string | null;
    project_id: string | number;
    quotation_type: ProjectQuotationType;
    quotation_date: string;
    customer_name: string;
    customer_address: string;
    customer_identifier: string;
    cc: string;
    description: string;
    term_of_payment_date: string;
    valid_until_date: string;
    note: string;
    prepared_by_name: string;
    approved_by_name: string;
    ppn_pph_percent: string | number;
    qr_target_url: string;
    status: ProjectQuotationStatus;
    items: ProjectQuotationItemForm[];
};

export type ProjectQuotationSummary = {
    id: number;
    quotation_no: string;
    quotation_type: ProjectQuotationType;
    quotation_type_label: string;
    quotation_date: string | null;
    customer_name: string;
    status: ProjectQuotationStatus;
    status_label: string;
    subtotal: string | number;
    grand_total: string | number;
    updated_at: string | null;
    updated_by: UserOption | null;
    project: {
        id: number;
        name: string;
        customers: Array<{
            id: number;
            name: string;
            company_name: string | null;
        }>;
    } | null;
};

export type ProjectQuotationPrintItem = {
    id: number;
    sort_order: number;
    category: string;
    unit: string;
    description: string;
    qty: string | number | null;
    unit_price: string | number | null;
    discount_percent: string | number;
    amount: string | number;
};

export type ProjectQuotationDetail = ProjectQuotationSummary & {
    customer_address: string | null;
    customer_identifier: string | null;
    cc: string | null;
    description: string | null;
    term_of_payment_date: string | null;
    valid_until_date: string | null;
    note: string | null;
    prepared_by_name: string | null;
    approved_by_name: string | null;
    ppn_pph_percent: string | number;
    tax_amount: string | number;
    qr_target_url: string | null;
    qr_code_url: string | null;
    items: ProjectQuotationPrintItem[];
};

export type ProjectQuotationIndexProps = {
    quotations: Paginated<ProjectQuotationSummary>;
    filters: {
        search: string;
        status: string;
        type: string;
        project_id: string;
        customer: string;
    };
    options: {
        projects: ProjectQuotationProjectOption[];
        types: ProjectQuotationTypeOption[];
        statuses: ProjectQuotationOption[];
    };
};

export type ProjectQuotationFormProps = {
    mode: 'create' | 'edit';
    quotation: ProjectQuotationFormPayload;
    options: {
        projects: ProjectQuotationProjectOption[];
        types: ProjectQuotationTypeOption[];
        statuses: ProjectQuotationOption[];
        units: ProjectQuotationOption[];
    };
};

export type ProjectQuotationPrintProps = {
    quotation: ProjectQuotationDetail;
};
